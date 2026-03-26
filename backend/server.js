require('dotenv').config({ override: true });
const dns = require('dns');
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (e) {
  console.error('DNS Setup Warning:', e.message);
}

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morganMiddleware = require('./middlewares/morgan.middleware');
const { securityMiddleware } = require('./middlewares/security.middleware');
const { sanitizationMiddleware } = require('./middlewares/sanitization.middleware');
const logger = require('./utils/logger');
const passport = require('./config/passport');
const seedAdminUser = require('./config/seed');
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
  'http://127.0.0.1:5173',
  'https://klivra.vercel.app',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  process.env.FRONTEND_URL?.replace(/\/$/, '')
].filter(Boolean).map(origin => origin.trim()));

// Log Active Mode
logger.info(`🌐 Server starting in ${process.env.NODE_ENV || 'development'} mode`);
if (process.env.NODE_ENV !== 'production') {
  logger.info(`🔓 CORS internal allowance: ${Array.from(allowedOrigins).join(', ')}`);
}

// 4. Global Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://api.fontshare.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://cdn-icons-png.flaticon.com"],
      connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000", "https://syncforge-io.onrender.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://api.fontshare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(compression({ threshold: 1024 }));

app.use(cors({
  origin: (origin, cb) => {
    // In production, force strict matching
    if (!origin && process.env.NODE_ENV === 'production') return cb(new Error('Not allowed by CORS'));
    if (!origin || allowedOrigins.has(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// 6. DB Connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  family: 4,
  compressors: ['zlib'] // Enable network compression
}).then(async () => {
  logger.info("✅ MongoDB Connected Successfully!");
  await seedAdminUser();
  startGarbageCollection();
  startDeadlineChecker();

  // Verify Brevo email service at startup
  if (process.env.BREVO_API_KEY) {
    logger.info('✅ Brevo Email Service: API key configured (HTTP API, 300 emails/day free)');
  } else {
    logger.error('❌ BREVO_API_KEY not set! Email service disabled. Get one at https://app.brevo.com/settings/keys/api');
  }
})
  .catch(err => {
    logger.error(`❌ MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  });

// 7. Error Handling
app.use((req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
});

app.use(require('./middlewares/error.middleware'));

// 8. Server Initialization
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});
