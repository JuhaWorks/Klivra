const socketio = require('socket.io');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('./system.utils').logger; // Cross-hub dependency

// ─── 1. Socket.io (Real-time Communication) ──────────────────────────────
let io;
const socketService = {
    init: (httpServer) => {
        io = socketio(httpServer, {
            cors: {
                origin: (origin, callback) => {
                    const allowedOrigins = [
                        'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000',
                        'https://klivra.vercel.app', process.env.FRONTEND_URL
                    ];
                    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
                    else callback(new Error('Not allowed by CORS'));
                },
                credentials: true
            }
        });

        // JWT Authentication Middleware for Sockets
        io.use((socket, next) => {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) return next(new Error('Authentication error: No token provided'));
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) return next(new Error('Authentication error: Invalid token'));
                socket.user = decoded;
                next();
            });
        });

        io.on('connection', (socket) => {
            logger.info(`🔌 Socket Connected: ${socket.user.id} (${socket.id})`);
            socket.join(`user_${socket.user.id}`);
            
            socket.on('join_project', (projectId) => {
                socket.join(`project_${projectId}`);
                logger.info(`📂 User ${socket.user.id} joined project room: ${projectId}`);
            });

            socket.on('joinProject', (projectId) => {
                socket.join(`project_${projectId}`);
                logger.info(`📂 User ${socket.user.id} joined project room (compat): ${projectId}`);
            });

            socket.on('leaveProject', (projectId) => {
                socket.leave(`project_${projectId}`);
                logger.info(`📂 User ${socket.user.id} left project room: ${projectId}`);
            });
            
            // --- WHITEBOARD SYNC ---
            socket.on('whiteboard:noteMoved', ({ projectId, noteId, x, y }) => {
                // Broadcast dragging position to everyone else in the project room
                socket.to(`project_${projectId}`).emit('whiteboard:noteMoved', { noteId, projectId, x, y });
            });

            socket.on('whiteboard:noteUpdated', ({ projectId, noteId, data }) => {
                // Broadcast granular updates (content, color) to everyone else in the project room
                socket.to(`project_${projectId}`).emit('whiteboard:noteUpdated', { _id: noteId, projectId, ...data });
            });
            
            // --- ADVANCED CHAT SYNC (Room-based) ---
            socket.on('join_chat', (chatId) => {
                socket.join(`chat_${chatId}`);
                logger.debug(`💬 User ${socket.user.id} joined chat room: ${chatId}`);
            });

            socket.on('leave_chat', (chatId) => {
                socket.leave(`chat_${chatId}`);
                logger.debug(`💬 User ${socket.user.id} left chat room: ${chatId}`);
            });

            socket.on('typing', ({ chatId, isTyping }) => {
                // Secure broadcasting: only send to users joined to THIS specific chat room
                socket.to(`chat_${chatId}`).emit('typing', { chat: chatId, userId: socket.user.id, isTyping });
            });

            socket.on('disconnect', () => {
                logger.info(`🔌 Socket Disconnected: ${socket.id}`);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) throw new Error('Socket.io not initialized!');
        return io;
    }
};

// ─── 2. Email Service (Brevo HTTP API - Zero Dependency) ────────────────
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends an email using Brevo's SMTP HTTP API (Port 443 compatible with Render)
 */
const sendEmail = async ({ to, subject, html, attachments }) => {
    if (!process.env.BREVO_API_KEY) {
        logger.warn('📧 Email suppressed: BREVO_API_KEY missing.');
        return;
    }
    const senderEmail = process.env.EMAIL_USER || 'klivramailer@gmail.com';
    
    const payload = {
        sender: { name: 'Klivra', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
    };

    if (attachments && attachments.length > 0) {
        payload.attachment = attachments;
    }

    try {
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || response.statusText);
        
        logger.info(`📧 Email sent to ${to}: ${data.messageId}`);
        return data;
    } catch (error) {
        logger.error(`📧 Email Error: ${error.message}`);
        throw error;
    }
};

/**
 * Standardized HTML Email Template
 */
const sendStandardEmail = async ({ to, subject, title, body, ctaText, ctaUrl, footer, customHtml }) => {
    const isProd = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || (isProd ? 'https://klivra.vercel.app' : 'http://localhost:5173');
    const accentColor = '#008c64';
    
    let ctaHtml = '';
    if (ctaText && ctaUrl) {
        ctaHtml = `<div style="margin-top: 30px;"><a href="${ctaUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px;">${ctaText}</a></div>`;
    }

    const html = `<!DOCTYPE html><html><body style="font-family: sans-serif; background-color: #f9fafb; padding: 40px;"><div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px;"><h2>${title}</h2><p>${body}</p>${customHtml || ''}${ctaHtml}<p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">&copy; ${new Date().getFullYear()} Klivra.</p></div></body></html>`;
    return sendEmail({ to, subject, html });
};

// ─── 3. Multer (File Upload / Storage) ────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = 'uploads/';
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|zip|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Invalid file type'));
    }
});

module.exports = {
    initSocket: socketService.init,
    getIO: socketService.getIO,
    sendEmail,
    sendStandardEmail,
    upload
};
