require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  console.error('DNS Setup Warning:', e.message);
}

const express = require('express');
const http = require('http');
const { logger, initRedis } = require('./utils/system.utils');
const { initSocket } = require('./utils/service.utils');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { morganMiddleware, globalErrorHandler } = require('./middlewares/common.middleware');
const { securityMiddleware, sanitizationMiddleware, apiLimiter } = require('./middlewares/security.middleware');

const passport = require('./config/passport');
const startMaintenanceHub = require('./cron/maintenance.cron');
const startDeadlineHub = require('./cron/deadline.cron');
const { startReportingHub, captureGlobalSnapshots } = require('./cron/reporting.cron');

// 1. Redis Initialization (Optional performance enhancement)
const app = express();

// Initialize Redis if configured, but don't let it block startup
if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
  initRedis().catch(err => logger.warn(`⚠️ Redis not available: ${err.message}`));
} else {
  logger.info('ℹ️ Redis URL not found, skipping cache initialization (Optional for Dev)');
}

// Start Background Integrity Jobs moved to worker for clustering safety

app.set('trust proxy', 1);
const server = http.createServer(app);

// 2. Initialize Socket.io with JWT Security
const io = initSocket(server);

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
app.use(cors({
  origin: (origin, cb) => {
    // 1. Allow requests with no origin (like mobile apps, curl, or direct browser hits)
    if (!origin) return cb(null, true);

    // 2. Check if origin is in the allowed list
    if (allowedOrigins.has(origin)) return cb(null, true);

    // 3. Allow Vercel preview deployments for this specific project
    if (origin.endsWith('.vercel.app') && origin.includes('klivra')) return cb(null, true);

    // 4. Otherwise, block
    logger.warn(`🚫 CORS blocked origin: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Authorization'] // Removing set-cookie as it's handled by credentials: true
}));

// Apply global rate limit to API routes
app.use('/api', apiLimiter);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "data:", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "blob:", "https://fonts.googleapis.com", "https://api.fontshare.com", "https://cdn.fontshare.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "http://localhost:*", "https://localhost:*", "ws://localhost:*", "wss://localhost:*", "http://127.0.0.1:*", "https://127.0.0.1:*", "wss://syncforge-io.onrender.com", "https://syncforge-io.onrender.com", "*.vercel.app", "https://*.sentry.io", "https://sentry.io", "https://api.nasa.gov", "https://favqs.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://api.fontshare.com", "https://cdn.fontshare.com", "https://cdnjs.cloudflare.com"],
      workerSrc: ["'self'", "blob:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["'self'", "*"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression({ threshold: 1024 }));


app.use(cookieParser());
app.use(sanitizationMiddleware);

// Initialize Passport (Passport session not needed for JWT/Stateless OAuth)
app.use(passport.initialize());

// Strict Payload Limit to prevent Buffer Exhaustion DoS
// Increased Payload Limits for file metadata and large messages
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


app.use(express.static('public', {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  etag: true
}));
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static('uploads'));


// HTTP Request Logging
app.use(morganMiddleware);

// Attach Socket.io to Request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Global Security & Maintenance Check
app.use(securityMiddleware);

// 5. Consolidated Routes
app.get('/', (req, res) => res.status(200).json({ status: 'success', message: 'API is running successfully.' }));

const { authRouter, userRouter, settingsRouter } = require('./routes/identity.routes');
const { projectRouter, taskRouter, whiteboardRouter } = require('./routes/work.routes');
const { connectionRouter, endorsementRouter, notificationRouter, chatRouter } = require('./routes/social.routes');
const { adminRouter, analyticsRouter, searchRouter, toolRouter } = require('./routes/system.routes');

app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/users', userRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);
app.use('/api/connections', connectionRouter);
app.use('/api/endorsements', endorsementRouter);
app.use('/api/tools', toolRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/chats', chatRouter);

// Audit and other system-level routes mounted within hubs
// Note: Whiteboard is mounted as a sub-route in project.routes.js but also accessible here if needed
app.use('/api/whiteboard', whiteboardRouter);

if (process.env.NODE_ENV !== 'production') {
  try {
    app.use('/api/dev', require('./routes/dev.routes'));
  } catch (e) {
    logger.warn('⚠️ Dev routes not found, skipping...');
  }
}

const cluster = require('cluster');
const os = require('os');
const enableCluster = process.env.NODE_ENV === 'production' || process.env.ENABLE_CLUSTER === 'true';

if (enableCluster && (cluster.isPrimary || cluster.isMaster)) {
  // Advanced Memory-Aware Supervisor:
  // Render Free Tier has 512MB RAM. Each Node process takes ~150-250MB.
  // Spawning workers equal to CPU count (often 4-8 on shared infra) crashes the container.
  const numCPUs = os.cpus().length;
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  const workerLimit = isRender ? 1 : Math.min(numCPUs, 1);

  logger.info(`🔥 Global Cluster Manager (PID ${process.pid}) initializing...`);
  logger.info(`Detected ${numCPUs} CPUs. Spawning ${workerLimit} worker(s) to maintain <512MB memory footprint.`);

  for (let i = 0; i < workerLimit; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    logger.error(`Worker ${worker.process.pid} died. Automatically respawning to maintain capacity.`);
    cluster.fork();
  });
} else {
  const isRender = process.env.RENDER || process.env.NODE_ENV === 'production';
  // 6. DB Connection (Workers only)
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10, // Reduced from 100 to save RAM on low-tier cloud hosting
    family: 4,
    // Removed zlib compressor to save CPU/RAM overhead at this scale
  }).then(async () => {
    logger.info(`✅ MongoDB Connected in Worker ${process.pid}!`);

    if (!enableCluster || cluster.worker.id === 1) {
      // Initialize Consolidated Cron Hubs (Consolidating GC, Deadlines, Social, FS, Snapshots, and Digests)
      // These 3 Hubs replace the 7 legacy cron files for better maintainability and observability.
      startMaintenanceHub();
      startDeadlineHub();
      startReportingHub();
      
      // Trigger an immediate capture for real-time analytics parity
      captureGlobalSnapshots().catch(err => logger.error(`Initial Snapshot Error: ${err.message}`));
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
  server.listen(PORT, '0.0.0.0', () => logger.info(`🚀 Worker ${process.pid} listening to HTTP & WebSockets on port ${PORT}`));

  // Advanced Memory Guardian (Watchdog)
  // Ensures the worker stays under Render's 512MB limit by triggering a graceful
  // restart before the container is forcibly killed.
  if (isRender) {
    setInterval(() => {
      const rss = process.memoryUsage().rss / 1024 / 1024;
      if (rss > 420) { // Limit to 420MB to allow 92MB "breathing room" for the Master process
        logger.warn(`💾 MEMORY GUARDIAN: RSS (${Math.round(rss)}MB) near limit. Triggering graceful respawn...`);
        server.close(() => process.exit(0));
      }
    }, 15000); // Check every 15s
  }

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection Error in Worker ${process.pid}: ${err.message}`);
    server.close(() => process.exit(1));
  });
}
