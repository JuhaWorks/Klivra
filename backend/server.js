require('dotenv').config({ override: true });
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const dns = require('dns');
const mongoSanitize = require('express-mongo-sanitize');
const morganMiddleware = require('./middlewares/morgan.middleware');
const { securityMiddleware } = require('./middlewares/security.middleware');
const logger = require('./utils/logger');
const session = require('express-session');
const passport = require('./config/passport');
const seedAdminUser = require('./config/seed');
const startGarbageCollection = require('./cron/gc');

// 1. Optimize DNS resolution for faster external APIs/MongoDB
try {
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
  logger.info("✅ DNS servers set to Cloudflare and Google");
} catch (err) {
  logger.error(`❌ Failed to set DNS servers: ${err.message}`);
}

const app = express();
app.set('trust proxy', 1); // Trust Render's load balancer to correctly read `https` protocol headers
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
  process.env.FRONTEND_URL?.replace(/\/$/, '')
].filter(Boolean));

// Log Active Mode
logger.info(`🌐 Server starting in ${process.env.NODE_ENV || 'development'} mode`);
if (process.env.NODE_ENV !== 'production') {
  logger.info(`🔓 CORS internal allowance: ${Array.from(allowedOrigins).join(', ')}`);
}

// 4. Middlewares
app.use(helmet());
app.use(compression({ threshold: 1024 }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(cookieParser());

// Required for Passport OAuth flow state (nonce, etc)
app.use(session({
  secret: process.env.SESSION_SECRET || 'syncforge_super_secure_fallback_secret_7389',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Must be none for cross-site OAuth redirects
    maxAge: 1000 * 60 * 5 // Short lived, only needed for the auth handshake
  }
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL query injection
// Express v5 makes req.query a getter, so we cannot reassign it. We mutate in place instead.
app.use((req, res, next) => {
  ['body', 'params', 'headers'].forEach((k) => {
    if (req[k]) {
      req[k] = mongoSanitize.sanitize(req[k]);
    }
  });
  if (req.query) {
    mongoSanitize.sanitize(req.query); // Mutates in place
  }
  next();
});

// HTTP Request Logging
app.use(morganMiddleware);

// Attach Socket.io to Request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Global Security & Maintenance Check
app.use(securityMiddleware);

// Diagnostic Middleware for Auth
app.use((req, res, next) => {
  if (req.originalUrl.includes('/api/auth')) {
    const authHeader = req.headers.authorization;
    const hasToken = !!authHeader;
    const isBearer = authHeader?.startsWith('Bearer');
    console.log(`[AUTH DIAGNOSTIC] ${req.method} ${req.originalUrl} - HasToken: ${hasToken}, IsBearer: ${isBearer}`);
  }
  next();
});

// 5. Routes
app.get('/', (req, res) => res.status(200).json({ status: 'success', message: 'API is running successfully.' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// 6. DB Connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  family: 4
}).then(async () => {
  logger.info("✅ MongoDB Connected Successfully!");
  await seedAdminUser();
  startGarbageCollection();

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
