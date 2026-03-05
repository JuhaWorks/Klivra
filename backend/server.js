require('dotenv').config();
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

// 1. Optimize DNS resolution for faster external APIs/MongoDB
try {
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
  logger.info("✅ DNS servers set to Cloudflare and Google");
} catch (err) {
  logger.error(`❌ Failed to set DNS servers: ${err.message}`);
}

const app = express();
const server = http.createServer(app);
const io = require('./utils/socket').init(server);

// 2. Fast allowed origins lookup O(1)
const allowedOrigins = new Set([
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000',
  'https://klivra.vercel.app', 'https://cse-471-project-gamma.vercel.app',
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
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/audit', require('./routes/audit.routes'));

// 6. DB Connection
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  family: 4
}).then(() => logger.info("✅ MongoDB Connected Successfully!"))
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
