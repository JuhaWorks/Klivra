require('dotenv').config({ override: true });
const dns = require('dns');
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  console.error('DNS Setup Warning:', e.message);
}

const express = require('express');
const http = require('http');
const logger = require('./utils/logger');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { morganMiddleware, globalErrorHandler } = require('./middlewares/common.middleware');
const { securityMiddleware, sanitizationMiddleware, apiLimiter } = require('./middlewares/security.middleware');

const passport = require('./config/passport');
const startGarbageCollection = require('./cron/gc');
const startDeadlineChecker = require('./cron/deadlineCheck');

// 1. Redis Initialization (Optional performance enhancement)
const { initRedis } = require('./utils/redis');
const app = express();

// Initialize Redis if configured, but don't let it block startup
if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
  initRedis().catch(err => logger.warn(`⚠️ Redis not available: ${err.message}`));
} else {
  logger.info('ℹ️ Redis URL not found, skipping cache initialization (Optional for Dev)');
}

app.set('trust proxy', 1);
const server = http.createServer(app);

// 2. Initialize Socket.io with JWT Security
const io = require('./utils/socket').init(server);

// 3. Fast allowed origins lookup O(1)
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://localhost:5500', // VS Code Live Server
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5500', // VS Code Live Server (IP)
  'https://klivra.vercel.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  process.env.FRONTEND_URL?.replace(/\/$/, '')
].filter(Boolean).map(origin => origin.trim()));

// Log Active Mode
logger.info(`🌐 Server starting in ${process.env.NODE_ENV || 'development'} mode`);
if (process.env.NODE_ENV !== 'production') {
  logger.info(`🔓 CORS internal allowance: ${Array.from(allowedOrigins).join(', ')}`);
}

// Apply global rate limit to API routes
app.use('/api', apiLimiter);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://api.fontshare.com", "https://cdn.fontshare.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://cdn-icons-png.flaticon.com", "https://ui-avatars.com", "https://lh3.googleusercontent.com", "https://images.unsplash.com"],
      connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000", "http://127.0.0.1:*", "http://localhost:*", "ws://localhost:*", "wss://localhost:*", "wss://syncforge-io.onrender.com", "https://syncforge-io.onrender.com", "*.vercel.app", "https://*.sentry.io", "https://sentry.io", "https://api.nasa.gov"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://api.fontshare.com", "https://cdn.fontshare.com", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression({ threshold: 1024 }));

app.use(cors({
  origin: (origin, cb) => {
    // 1. Allow requests with no origin (like mobile apps, curl, or direct browser hits)
    if (!origin) return cb(null, true);

    // 2. Check if origin is in the allowed list
    if (allowedOrigins.has(origin)) return cb(null, true);

    // 3. Allow Vercel preview deployments (regex match)
    if (origin.endsWith('.vercel.app')) return cb(null, true);

    // 4. Otherwise, block
    logger.warn(`🚫 CORS blocked origin: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['set-cookie']
}));

app.use(cookieParser());
app.use(sanitizationMiddleware);

// Initialize Passport (Passport session not needed for JWT/Stateless OAuth)
app.use(passport.initialize());

// Strict Payload Limit to prevent Buffer Exhaustion DoS
app.use(express.json({ limit: 32768 }));
app.use(express.urlencoded({ extended: true, limit: 32768 }));


app.use(express.static('public'));

// HTTP Request Logging
app.use(morganMiddleware);

// Attach Socket.io to Request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Global Security & Maintenance Check
app.use(securityMiddleware);

// 5. Routes
app.get('/', (req, res) => res.status(200).json({ status: 'success', message: 'API is running successfully.' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/connections', require('./routes/connection.routes'));

const cluster = require('cluster');
const os = require('os');
const enableCluster = process.env.NODE_ENV === 'production' || process.env.ENABLE_CLUSTER === 'true';

if (enableCluster && (cluster.isPrimary || cluster.isMaster)) {
  const numCPUs = os.cpus().length;
  logger.info(`🔥 Global Cluster Manager (PID ${process.pid}) initializing...`);
  logger.info(`Spawning ${numCPUs} background workers to handle traffic load.`);
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died. Automatically respawning to maintain capacity.`);
    cluster.fork();
  });
} else {
  // 6. DB Connection (Workers only)
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 100, // Increased for clustered environment
    family: 4,
    compressors: ['zlib'] // Enable network compression
  }).then(async () => {
    logger.info(`✅ MongoDB Connected in Worker ${process.pid}!`);
    
    // Only run Cron Jobs on the first worker to avoid duplication
    if (!enableCluster || cluster.worker.id === 1) {
      startGarbageCollection();
      startDeadlineChecker();
    }

    // Verify Brevo email service at startup
    if (process.env.BREVO_API_KEY) {
      logger.info(`✅ Brevo Email Service: Configured in Worker ${process.pid}`);
    } else {
      logger.error('❌ BREVO_API_KEY not set! Email service disabled.');
    }
  })
    .catch(err => {
      logger.error(`❌ MongoDB Connection Error properties in worker ${process.pid}: ${err.message}`);
      process.exit(1);
    });

  // 7. Error Handling
  app.use((req, res, next) => {
    res.status(404);
    next(new Error(`Not Found - ${req.originalUrl}`));
  });

  app.use(globalErrorHandler);

  // 8. Server Initialization
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => logger.info(`🚀 Worker ${process.pid} listening to HTTP & WebSockets on port ${PORT}`));

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection Error in Worker ${process.pid}: ${err.message}`);
    server.close(() => process.exit(1));
  });
}
