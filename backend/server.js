require('dotenv').config();
const express = require('express');
const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io'); // Import Socket.io
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dns = require('dns');

try {
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
  console.log("✅ DNS servers set to Cloudflare and Google");
} catch (err) {
  console.error("❌ Failed to set DNS servers:", err.message);
}

const app = express();
const server = http.createServer(app); // Wrap Express with HTTP server
const allowedOrigins = [
  'http://localhost:5173',
  'https://cse-471-project-gamma.vercel.app', // production frontend URL
  process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null, // dynamically passed in production, immune to trailing slashes
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Allow our Vite React frontend and deployed frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Crucial for receiving cookies
  },
});

// Pass `io` instance to the request object so controllers can access it if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`User connected via socket: ${socket.id}`);

  // Listen for frontend drag-and-drop task movements
  socket.on('task:move', (data) => {
    // data should contain { taskId, newStatus, projectId, etc. }
    console.log('Task moved event received:', data);

    // Broadcast the updated task to all OTHER connected clients
    socket.broadcast.emit('task:moved', data);
  });

  // Handle collaborative whiteboard joining a room
  socket.on('join-whiteboard', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined whiteboard room ${roomId}`);
  });

  // Handle incoming drawing data and broadcasting to the specific room
  socket.on('draw-line', ({ roomId, lineData }) => {
    socket.to(roomId).emit('draw-line', lineData);
  });

  // Handle clearing the board
  socket.on('clear-board', (roomId) => {
    socket.to(roomId).emit('clear-board');
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use(helmet());
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests with no origin
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Crucial: Allows the browser to attach the cookie to the request
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'API is running successfully.' });
});

// Import and mount route files
const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// MongoDB Connection with better options
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 // Still keep IPv4 force as backup
    });
    console.log("✅ MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

connectDB();

app.use(/.*/, (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    status: 'error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
});
const PORT = process.env.PORT || 5000;
// We now listen on the combined HTTP + WebSockets server instead of just the Express app
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
