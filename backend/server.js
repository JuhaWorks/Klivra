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
const io = require('./utils/socket').init(server);

// 2. Fast allowed origins lookup O(1)
const allowedOrigins = new Set([
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000',
  'https://klivra.vercel.app',
  process.env.FRONTEND_URL?.replace(/\/$/, '')
].filter(Boolean));

// 3. Middlewares
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

app.use((req, res, next) => { req.io = io; next(); });

// 4. Compact Socket.io Setup
io.on('connection', (socket) => {
  socket.on('joinProject', (id) => socket.join(id));
  socket.on('join-whiteboard', (id) => socket.join(id));
  socket.on('task:move', (data) => socket.to(data.projectId).emit('task:moved', data));
  socket.on('draw-line', ({ roomId, lineData }) => socket.to(roomId).emit('draw-line', lineData));
  socket.on('clear-board', (roomId) => socket.to(roomId).emit('clear-board'));
});

// 5. Routes
app.get('/', (req, res) => res.status(200).json({ status: 'success', message: 'API is running successfully.' }));

// 🔧 TEMPORARY: SMTP diagnostic endpoint — hit /api/test-smtp?email=you@gmail.com to test email delivery
//    Remove this after confirming emails work on Render.
app.get('/api/test-smtp', async (req, res) => {
  const testTo = req.query.email || 'thefakegamer29@gmail.com';
  const nodemailer = require('nodemailer');
  const results = { env: {}, smtp: {}, send: {} };

  // 1. Check env vars
  results.env = {
    EMAIL_USER: process.env.EMAIL_USER || 'NOT SET',
    EMAIL_PASS: process.env.EMAIL_PASS ? `SET (${process.env.EMAIL_PASS.length} chars)` : 'NOT SET',
    EMAIL_HOST: process.env.EMAIL_HOST || 'NOT SET (defaulting to smtp.gmail.com)',
    EMAIL_PORT: process.env.EMAIL_PORT || 'NOT SET (defaulting to 587)',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  };

  // 2. Test SMTP connection
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transporter.verify();
    results.smtp = { status: 'CONNECTED', message: 'SMTP server accepted credentials' };

    // 3. Send test email
    const info = await transporter.sendMail({
      from: `"Klivra Diagnostics" <${process.env.EMAIL_USER}>`,
      to: testTo,
      subject: '[RENDER TEST] Email delivery works!',
      html: '<h2>✅ Success!</h2><p>This email was sent from your Render deployment. Email delivery is working correctly.</p>',
    });
    results.send = { status: 'SENT', messageId: info.messageId, to: testTo };
  } catch (err) {
    results.smtp.error = { message: err.message, code: err.code, command: err.command, responseCode: err.responseCode };
  }

  res.json(results);
});
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

  // Verify SMTP connectivity at startup (non-blocking — just logs the result)
  const nodemailer = require('nodemailer');
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const testTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    testTransporter.verify()
      .then(() => logger.info('✅ SMTP Email Service: Connected and ready'))
      .catch(err => logger.error(`❌ SMTP Email Service FAILED: ${err.message}. Emails will not be sent!`));
  } else {
    logger.error('❌ EMAIL_USER or EMAIL_PASS not set! Email service is disabled.');
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

app.use((err, req, res, next) => {
  if (err.status !== 404) {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  res.status(res.statusCode === 200 ? 500 : res.statusCode).json({
    status: 'error',
    message: err.message,
    requiresReactivation: err.requiresReactivation || false,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});

// 8. Server Initialization
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});
