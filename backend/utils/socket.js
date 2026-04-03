const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('./logger');
const { getRedisClient } = require('./redis');

let io;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: (origin, cb) => {
                    const allowedOrigins = new Set([
                        'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
                        'http://localhost:3000', 'http://127.0.0.1:5173', 'https://klivra.vercel.app',
                        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
                        process.env.FRONTEND_URL?.replace(/\/$/, '')
                    ].filter(Boolean).map(o => o.trim()));
                    if (!origin || allowedOrigins.has(origin)) cb(null, true);
                    else cb(new Error('Not allowed by CORS'));
                },
                credentials: true
            }
        });

        const REDIS_URL = process.env.REDIS_URL || (process.env.NODE_ENV === 'production' ? null : 'redis://localhost:6379');
        if (REDIS_URL) {
            const { createClient } = require('redis');
            const pubClient = createClient({ url: REDIS_URL });
            const subClient = pubClient.duplicate();
            pubClient.on('error', () => { }); subClient.on('error', () => { });
            Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
                io.adapter(createAdapter(pubClient, subClient));
                logger.info('🔗 Socket.IO configured with Redis Adapter.');
            }).catch(err => logger.warn(`⚠️ Redis Adapter failed: ${err.message}`));
        }

        io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
                if (!token) return next(new Error('Auth error'));
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('-password');
                if (!user || user.isBanned) return next(new Error('Invalid user'));
                socket.user = user;
                next();
            } catch (err) { next(new Error('Auth error')); }
        });

        // ── ULTRA-ADVANCED REDIS STATE (0-RAM FOOTPRINT) ─────────────────────
        const localUserSockets = new Map();
        const rc = () => { const cl = getRedisClient(); return (cl && cl.isReady) ? cl : null; };

        let globalUpdateTimeout;
        const broadcastGlobalPresence = async () => {
            if (globalUpdateTimeout) return;
            globalUpdateTimeout = setTimeout(async () => {
                const redis = rc();
                if (!redis) return;
                const hashData = await redis.hGetAll('presence:global').catch(() => ({}));
                io.emit('globalPresenceUpdate', Object.values(hashData).map(v => JSON.parse(v)));
                globalUpdateTimeout = null;
            }, 500); // 500ms debounce
        };

        const broadcastPresence = async (projectId) => {
            const redis = rc();
            if (!redis) return;
            const hashData = await redis.hGetAll(`presence:project:${projectId}`).catch(() => ({}));
            io.to(`project_${projectId}`).emit('presenceUpdate', Object.values(hashData).map(v => JSON.parse(v)));
        };

        const broadcastLocks = async (projectId) => {
            const redis = rc();
            if (!redis) return;
            const locks = await redis.hGetAll(`presence:locks:${projectId}`).catch(() => ({}));
            const parsed = {}; Object.entries(locks).forEach(([k, v]) => parsed[k] = JSON.parse(v));
            io.to(`project_${projectId}`).emit('locksUpdated', parsed);
        };

        io.on('connection', async (socket) => {
            const userId = socket.user._id.toString();
            const redis = rc();
            logger.info(`🔌 Socket Connected: ${socket.user.name}`);
            socket.join(userId);

            if (!localUserSockets.has(userId)) localUserSockets.set(userId, new Set());
            localUserSockets.get(userId).add(socket.id);

            if (redis) {
                const state = JSON.stringify({ userId, name: socket.user.name, avatar: socket.user.avatar, status: 'Online' });
                await redis.hSet('presence:global', userId, state);
                await redis.expire('presence:global', 86400);
            }
            broadcastGlobalPresence();

            socket.on('joinProject', async (projectId) => {
                socket.join(`project_${projectId}`);
                if (redis) {
                    const state = JSON.stringify({ userId, name: socket.user.name, avatar: socket.user.avatar, status: 'Online' });
                    await redis.hSet(`presence:project:${projectId}`, userId, state);
                    // Ultra-Advanced: track memberships in Redis SET instead of local RAM
                    await redis.sAdd(`user:projects:${userId}`, projectId);
                    await redis.expire(`user:projects:${userId}`, 86400);
                }
                broadcastPresence(projectId);
                broadcastLocks(projectId);
            });

            socket.on('setStatus', async ({ projectId, status }) => {
                if (redis) {
                    const state = JSON.stringify({ userId, name: socket.user.name, avatar: socket.user.avatar, status });
                    await redis.hSet('presence:global', userId, state);
                    if (projectId) {
                        await redis.hSet(`presence:project:${projectId}`, userId, state);
                        broadcastPresence(projectId);
                    } else {
                        const projects = await redis.sMembers(`user:projects:${userId}`);
                        for (const pId of projects) {
                            await redis.hSet(`presence:project:${pId}`, userId, state);
                            broadcastPresence(pId);
                        }
                    }
                    broadcastGlobalPresence();
                    io.to(userId).emit('statusUpdated', status);
                    await User.findByIdAndUpdate(userId, { status }).catch(() => {});
                }
            });

            socket.on('acquireFieldLock', async ({ projectId, fieldId }) => {
                if (redis) {
                    const existing = await redis.hGet(`presence:locks:${projectId}`, fieldId);
                    if (!existing || JSON.parse(existing).userId === userId) {
                        await redis.hSet(`presence:locks:${projectId}`, fieldId, JSON.stringify({ userId, userName: socket.user.name }));
                        broadcastLocks(projectId);
                    }
                }
            });

            socket.on('releaseFieldLock', async ({ projectId, fieldId }) => {
                const existing = redis && await redis.hGet(`presence:locks:${projectId}`, fieldId);
                if (existing && JSON.parse(existing).userId === userId) {
                    await redis.hDel(`presence:locks:${projectId}`, fieldId);
                    broadcastLocks(projectId);
                }
            });

            socket.on('disconnect', async () => {
                const sockets = localUserSockets.get(userId);
                if (sockets) sockets.delete(socket.id);
                if (!sockets || sockets.size === 0) {
                    localUserSockets.delete(userId);
                    setTimeout(async () => {
                        const active = await io.in(userId).fetchSockets();
                        if (active.length === 0 && redis) {
                            await redis.hDel('presence:global', userId);
                            const projects = await redis.sMembers(`user:projects:${userId}`);
                            for (const pId of projects) {
                                await redis.hDel(`presence:project:${pId}`, userId);
                                broadcastPresence(pId);
                                const locks = await redis.hGetAll(`presence:locks:${pId}`);
                                for (const [fid, data] of Object.entries(locks)) {
                                    if (JSON.parse(data).userId === userId) await redis.hDel(`presence:locks:${pId}`, fid);
                                }
                                broadcastLocks(pId);
                            }
                            await redis.del(`user:projects:${userId}`);
                            broadcastGlobalPresence();
                            await User.findByIdAndUpdate(userId, { status: 'Offline' }).catch(() => {});
                        }
                    }, 5000);
                }
            });

            // Ultra-Advanced: Volatile Drawing (Zero buffer growth)
            socket.on('join-whiteboard', (roomId) => socket.join(`whiteboard_${roomId}`));
            socket.on('draw-line', ({ roomId, lineData }) => {
                // 'volatile' tells socket.io it can drop these packets if network is slow,
                // preventing memory buffer buildup on the server.
                socket.volatile.to(`whiteboard_${roomId}`).emit('draw-line', lineData);
            });
            socket.on('clear-board', (roomId) => socket.to(`whiteboard_${roomId}`).emit('clear-board'));
        });

        return io;
    },
    getIO: () => { if (!io) throw new Error('Socket.io not initialized!'); return io; }
};
