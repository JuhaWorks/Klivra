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

        // ── HYBRID PRESENCE STATE ─────────────────────
        const localUserSockets = new Map();
        
        // RAM Fallbacks for Dev Setup
        const memGlobal = new Map(); 
        const memProject = new Map(); // Map<projectId, Map<userId, stringifiedState>>
        const memLocks = new Map(); // Map<projectId, Map<fieldId, stringifiedState>>
        const memUserProjects = new Map(); // Map<userId, Set<String>>

        const rc = () => { const cl = getRedisClient(); return (cl && cl.isReady) ? cl : null; };

        let globalUpdateTimeout;
        const broadcastGlobalPresence = async () => {
            if (globalUpdateTimeout) return;
            globalUpdateTimeout = setTimeout(async () => {
                const redis = rc();
                const values = redis 
                    ? Object.values(await redis.hGetAll('presence:global').catch(() => ({})))
                    : Array.from(memGlobal.values());
                io.emit('globalPresenceUpdate', values.map(v => JSON.parse(v)));
                globalUpdateTimeout = null;
            }, 500); 
        };

        const broadcastPresence = async (projectId) => {
            const redis = rc();
            const values = redis
                ? Object.values(await redis.hGetAll(`presence:project:${projectId}`).catch(() => ({})))
                : Array.from(memProject.get(projectId)?.values() || []);
            io.to(`project_${projectId}`).emit('presenceUpdate', values.map(v => JSON.parse(v)));
        };

        const broadcastLocks = async (projectId) => {
            const redis = rc();
            const locks = redis
                ? await redis.hGetAll(`presence:locks:${projectId}`).catch(() => ({}))
                : Object.fromEntries(memLocks.get(projectId)?.entries() || []);
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

            const state = JSON.stringify({ userId, name: socket.user.name, avatar: socket.user.avatar, status: 'Online' });
            if (redis) {
                await redis.hSet('presence:global', userId, state);
                await redis.expire('presence:global', 86400);
            } else {
                memGlobal.set(userId, state);
            }
            broadcastGlobalPresence();

            socket.on('requestPresenceSync', () => {
                 broadcastGlobalPresence();
            });

            socket.on('joinProject', async (projectId) => {
                socket.join(`project_${projectId}`);
                const state = JSON.stringify({ userId, name: socket.user.name, avatar: socket.user.avatar, status: 'Online' });
                if (redis) {
                    await redis.hSet(`presence:project:${projectId}`, userId, state);
                    await redis.sAdd(`user:projects:${userId}`, projectId);
                    await redis.expire(`user:projects:${userId}`, 86400);
                } else {
                    if (!memProject.has(projectId)) memProject.set(projectId, new Map());
                    memProject.get(projectId).set(userId, state);
                    if (!memUserProjects.has(userId)) memUserProjects.set(userId, new Set());
                    memUserProjects.get(userId).add(projectId);
                }
                broadcastPresence(projectId);
                broadcastLocks(projectId);
            });

            socket.on('setStatus', async ({ projectId, status }) => {
                const state = JSON.stringify({ userId, name: socket.user.name, avatar: socket.user.avatar, status });
                if (redis) {
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
                } else {
                    memGlobal.set(userId, state);
                    if (projectId) {
                        if (!memProject.has(projectId)) memProject.set(projectId, new Map());
                        memProject.get(projectId).set(userId, state);
                        broadcastPresence(projectId);
                    } else {
                        const projects = memUserProjects.get(userId) || [];
                        for (const pId of projects) {
                            if (memProject.has(pId)) memProject.get(pId).set(userId, state);
                            broadcastPresence(pId);
                        }
                    }
                }
                broadcastGlobalPresence();
                io.to(userId).emit('statusUpdated', status);
                await User.findByIdAndUpdate(userId, { status }).catch(err => logger.error(`Socket state update error: ${err.message}`));
            });

            socket.on('acquireFieldLock', async ({ projectId, fieldId }) => {
                if (redis) {
                    const existing = await redis.hGet(`presence:locks:${projectId}`, fieldId);
                    if (!existing || JSON.parse(existing).userId === userId) {
                        await redis.hSet(`presence:locks:${projectId}`, fieldId, JSON.stringify({ userId, userName: socket.user.name }));
                        broadcastLocks(projectId);
                    }
                } else {
                    if (!memLocks.has(projectId)) memLocks.set(projectId, new Map());
                    const existing = memLocks.get(projectId).get(fieldId);
                    if (!existing || JSON.parse(existing).userId === userId) {
                         memLocks.get(projectId).set(fieldId, JSON.stringify({ userId, userName: socket.user.name }));
                         broadcastLocks(projectId);
                    }
                }
            });

            socket.on('releaseFieldLock', async ({ projectId, fieldId }) => {
                if (redis) {
                    const existing = await redis.hGet(`presence:locks:${projectId}`, fieldId);
                    if (existing && JSON.parse(existing).userId === userId) {
                        await redis.hDel(`presence:locks:${projectId}`, fieldId);
                        broadcastLocks(projectId);
                    }
                } else {
                    if (memLocks.has(projectId)) {
                        const existing = memLocks.get(projectId).get(fieldId);
                        if (existing && JSON.parse(existing).userId === userId) {
                             memLocks.get(projectId).delete(fieldId);
                             broadcastLocks(projectId);
                        }
                    }
                }
            });

            socket.on('disconnect', async () => {
                const sockets = localUserSockets.get(userId);
                if (sockets) sockets.delete(socket.id);
                if (!sockets || sockets.size === 0) {
                    localUserSockets.delete(userId);
                    setTimeout(async () => {
                        const active = await io.in(userId).fetchSockets();
                        if (active.length === 0) {
                            if (redis) {
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
                            } else {
                                memGlobal.delete(userId);
                                const projects = memUserProjects.get(userId) || [];
                                for (const pId of projects) {
                                     memProject.get(pId)?.delete(userId);
                                     broadcastPresence(pId);
                                     
                                     const locks = memLocks.get(pId);
                                     if (locks) {
                                         for (const [fid, data] of locks.entries()) {
                                             if (JSON.parse(data).userId === userId) locks.delete(fid);
                                         }
                                     }
                                     broadcastLocks(pId);
                                }
                                memUserProjects.delete(userId);
                            }
                            broadcastGlobalPresence();
                            await User.findByIdAndUpdate(userId, { status: 'Offline' }).catch(err => logger.error(`Socket disconnect error: ${err.message}`));
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

            // ── CURSOR SHARING (throttled, volatile) ──────────────────────
            const cursorThrottle = new Map();
            socket.on('cursorMove', ({ projectId, x, y }) => {
                const now = Date.now();
                const last = cursorThrottle.get(userId) || 0;
                if (now - last < 50) return; // 20fps max
                cursorThrottle.set(userId, now);

                // volatile: auto-dropped if subscriber's buffer is full — prevents backpressure
                socket.volatile.to(`project_${projectId}`).emit('cursorMove', {
                    userId,
                    name: socket.user.name,
                    avatar: socket.user.avatar,
                    x,
                    y,
                });
            });

            // ── MENTION NOTIFICATION ─────────────────────────────────────
            socket.on('mentionUsers', ({ mentionedUserIds, taskId, taskTitle }) => {
                        });
                    }
                });
            });

            // ── CHAT TYPING INDICATORS ───────────────────────────────────
            socket.on('typing', ({ chatId, isTyping, participantIds }) => {
                if (!chatId || !Array.isArray(participantIds)) return;
                participantIds.forEach(pId => {
                    if (pId !== userId) {
                        io.to(pId).emit('typing', {
                            chat: chatId,
                            userId,
                            isTyping
                        });
                    }
                });
            });
        });

        return io;
    },
    getIO: () => { if (!io) throw new Error('Socket.io not initialized!'); return io; },
    isInitialized: () => !!io
};
