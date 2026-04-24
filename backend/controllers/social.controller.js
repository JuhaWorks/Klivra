const Connection = require('../models/connection.model');
const Endorsement = require('../models/endorsement.model');
const User = require('../models/user.model');
const { z } = require('zod');
const { getIO } = require('../utils/service.utils');
const { getRedisClient, logger } = require('../utils/system.utils');
const { NOTIFICATION_TYPES, CONNECTION_STATUS, PROJECT_ROLES, TASK_PRIORITIES, NETWORKING_MESSAGES, SYSTEM_MESSAGES } = require('../constants');

// Local LRU/Memory cache for stats (5s TTL)
const statsCache = new Map(); // userId -> { data, expires }
const STATS_TTL = 5000;

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const sendRequestSchema = z.object({
    recipientId: z.string().min(1, 'Recipient ID is required'),
    note: z.string().max(300, 'Note cannot exceed 300 characters').optional(),
});

const respondSchema = z.object({
    connectionId: z.string().min(1, 'Connection ID is required'),
    action: z.enum(['accept', 'decline'], { message: 'Action must be accept or decline' }),
});

const updateLabelsSchema = z.object({
    connectionId: z.string().min(1, 'Connection ID is required'),
    labels: z.array(z.string().max(30)).max(5, 'Cannot have more than 5 labels'),
});

// ─── Connection Controllers ───────────────────────────────────────────────

// @desc    Send a connection request
// @route   POST /api/connections/request
// @access  Private
const sendRequest = async (req, res, next) => {
    try {
        const parsed = sendRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400);
            return next(new Error(parsed.error.errors.map(e => e.message).join(', ')));
        }

        const { recipientId, note } = parsed.data;
        const requesterId = req.user._id;

        // Prevent Admin users from networking
        if (req.user.role === PROJECT_ROLES.ADMIN) {
            res.status(403);
            return next(new Error(NETWORKING_MESSAGES.ADMIN_RESTRICTED));
        }

        // Prevent self-connection
        if (requesterId.toString() === recipientId) {
            res.status(400);
            return next(new Error(NETWORKING_MESSAGES.SELF_CONNECT_RESTRICTED));
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            res.status(404);
            return next(new Error(SYSTEM_MESSAGES.USER_NOT_FOUND));
        }

        // Prevent connecting with Admin accounts
        if (recipient.role === PROJECT_ROLES.ADMIN) {
            res.status(400);
            return next(new Error(NETWORKING_MESSAGES.ADMIN_RESTRICTED));
        }

        // Check for existing connection in either direction
        const existing = await Connection.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId },
            ],
        });

        if (existing) {
            if (existing.status === CONNECTION_STATUS.ACCEPTED) {
                res.status(400);
                return next(new Error(NETWORKING_MESSAGES.ALREADY_CONNECTED));
            }
            if (existing.status === CONNECTION_STATUS.PENDING) {
                // If the other user already sent us a request, auto-accept
                if (existing.requester.toString() === recipientId) {
                    existing.status = CONNECTION_STATUS.ACCEPTED;
                    existing.respondedAt = new Date();
                    await existing.save();
                    return res.status(200).json({
                        status: 'success',
                        message: NETWORKING_MESSAGES.AUTO_ACCEPTED,
                        data: existing,
                    });
                }
                res.status(400);
                return next(new Error(NETWORKING_MESSAGES.REQUEST_ALREADY_SENT));
            }
            if (existing.status === CONNECTION_STATUS.DECLINED) {
                // Allow re-request by updating the existing record
                existing.status = CONNECTION_STATUS.PENDING;
                existing.requester = requesterId;
                existing.recipient = recipientId;
                existing.note = note || '';
                existing.respondedAt = null;
                await existing.save();
                return res.status(201).json({
                    status: 'success',
                    message: NETWORKING_MESSAGES.REQUEST_RESENT,
                    data: existing,
                });
            }
        }

        const connection = await Connection.create({
            requester: requesterId,
            recipient: recipientId,
            note: note || '',
        });

        // Invalidate stats cache for pending count
        statsCache.delete(requesterId.toString());
        statsCache.delete(recipientId.toString());

        // Notify recipient in real-time
        try {
            const notificationService = require('../services/notification.service');
            await notificationService.notify({
                recipientId,
                senderId: requesterId,
                type: NOTIFICATION_TYPES.CONNECTION_REQUEST,
                priority: TASK_PRIORITIES[1],
                title: 'New Connection Request',
                message: `${req.user.name} wants to connect with you.`,
                link: '/networking?tab=requests',
                metadata: { connectionId: connection._id }
            });

            getIO().to(`user_${recipientId}`).emit('connection:received', {
                request: await Connection.findById(connection._id).populate('requester', 'name email avatar role status customMessage').lean(),
                message: `${req.user.name} sent you a connection request.`
            });
        } catch (err) { 
            logger.error(`Socket notification failed in sendRequest: ${err.message}`);
        }

        res.status(201).json({
            status: 'success',
            message: NETWORKING_MESSAGES.REQUEST_SENT,
            data: connection,
        });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400);
            return next(new Error('Connection request already exists'));
        }
        next(error);
    }
};

// @desc    Respond to a connection request (accept/decline)
// @route   PUT /api/connections/respond
// @access  Private
const respondToRequest = async (req, res, next) => {
    try {
        const parsed = respondSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400);
            return next(new Error(parsed.error.errors.map(e => e.message).join(', ')));
        }

        const { connectionId, action } = parsed.data;
        const userId = req.user._id.toString();

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            res.status(404);
            return next(new Error('Connection request not found'));
        }

        // Only the recipient can respond
        if (connection.recipient.toString() !== userId) {
            res.status(403);
            return next(new Error('You are not authorized to respond to this request'));
        }
 
        if (connection.status !== CONNECTION_STATUS.PENDING) {
            res.status(400);
            return next(new Error('This request has already been responded to'));
        }

        // Atomic update to ensure single execution of status change and counter increment
        const updatedConnection = await Connection.findOneAndUpdate(
            { _id: connectionId, status: CONNECTION_STATUS.PENDING },
            { 
                status: action === 'accept' ? CONNECTION_STATUS.ACCEPTED : CONNECTION_STATUS.DECLINED,
                respondedAt: new Date()
            },
            { returnDocument: 'after' }
        );

        if (!updatedConnection) {
            res.status(400);
            return next(new Error('This request has already been responded to or is no longer pending'));
        }

        // Invalidate memory cache for networking stats immediately
        statsCache.delete(updatedConnection.requester.toString());
        statsCache.delete(updatedConnection.recipient.toString());

        if (action === 'accept') {
            await User.updateMany(
                { _id: { $in: [updatedConnection.requester, updatedConnection.recipient] } },
                { $inc: { totalConnections: 1 } }
            );

            // Invalidate suggestions cache for both parties to trigger re-calc on next view
            const redisClient = getRedisClient();
            if (redisClient && redisClient.isReady) {
                await redisClient.del(`suggestions:${updatedConnection.requester}`);
                await redisClient.del(`suggestions:${updatedConnection.recipient}`);
            }
        }

        // Notify requester in real-time
        try {
            if (action === 'accept') {
                const notificationService = require('../services/notification.service');
                await notificationService.notify({
                    recipientId: updatedConnection.requester,
                    senderId: updatedConnection.recipient,
                    type: NOTIFICATION_TYPES.CONNECTION_ACCEPTED,
                    priority: TASK_PRIORITIES[1],
                    title: 'Connection Accepted',
                    message: `${req.user.name} accepted your connection request!`,
                    link: `/networking/profile/${updatedConnection.recipient}`,
                    metadata: { connectionId: updatedConnection._id }
                });
            }

            getIO().to(`user_${updatedConnection.requester.toString()}`).emit('connection:status_updated', {
                connectionId: updatedConnection._id,
                status: updatedConnection.status,
                responderName: req.user.name,
                message: action === 'accept' ? `${req.user.name} accepted your connection request!` : `${req.user.name} declined your connection request.`
            });
        } catch (err) { 
            logger.error(`Socket notification failed in respondToRequest: ${err.message}`);
        }

        res.status(200).json({
            status: 'success',
            message: action === 'accept' ? NETWORKING_MESSAGES.ACCEPTED : NETWORKING_MESSAGES.DECLINED,
            data: updatedConnection,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Withdraw a sent connection request
// @route   DELETE /api/connections/withdraw/:connectionId
// @access  Private
const withdrawRequest = async (req, res, next) => {
    try {
        const { connectionId } = req.params;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            res.status(404);
            return next(new Error('Connection request not found'));
        }

        // Only requester can withdraw
        if (connection.requester.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('You can only withdraw your own requests'));
        }

        if (connection.status !== CONNECTION_STATUS.PENDING) {
            res.status(400);
            return next(new Error('Can only withdraw pending requests'));
        }

        await Connection.findByIdAndDelete(connectionId);

        // Invalidate stats cache
        statsCache.delete(connection.requester.toString());
        statsCache.delete(connection.recipient.toString());

        // Notify recipient that request was withdrawn
        try {
            getIO().to(connection.recipient.toString()).emit('connection:withdrawn', { connectionId });
        } catch (err) { 
            logger.error(`Socket notification failed in withdrawRequest: ${err.message}`);
        }

        res.status(200).json({
            status: 'success',
            message: NETWORKING_MESSAGES.WITHDRAWN,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove an accepted connection
// @route   DELETE /api/connections/:connectionId
// @access  Private
const removeConnection = async (req, res, next) => {
    try {
        const { connectionId } = req.params;

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            res.status(404);
            return next(new Error('Connection not found'));
        }

        // Either party can remove the connection
        const userId = req.user._id.toString();
        if (connection.requester.toString() !== userId && connection.recipient.toString() !== userId) {
            res.status(403);
            return next(new Error('You are not part of this connection'));
        }

        await Connection.findByIdAndDelete(connectionId);
        
        // Only decrement counts if it was an active connection
        if (connection.status === CONNECTION_STATUS.ACCEPTED) {
            await User.updateMany(
                { _id: { $in: [connection.requester, connection.recipient] } },
                { $inc: { totalConnections: -1 } }
            );
        }

        // Invalidate stats cache
        statsCache.delete(connection.requester.toString());
        statsCache.delete(connection.recipient.toString());

        // Notify the other party that connection was removed
        try {
            const otherId = connection.requester.toString() === userId ? connection.recipient.toString() : connection.requester.toString();
            getIO().to(otherId).emit('connection:removed', { connectionId });
        } catch (err) { 
            logger.error(`Socket notification failed in removeConnection: ${err.message}`);
        }

        res.status(200).json({
            status: 'success',
            message: NETWORKING_MESSAGES.REMOVED,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update labels/tags on a connection
// @route   PUT /api/connections/labels
// @access  Private
const updateLabels = async (req, res, next) => {
    try {
        const parsed = updateLabelsSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400);
            return next(new Error(parsed.error.errors.map(e => e.message).join(', ')));
        }

        const { connectionId, labels } = parsed.data;
        const connection = await Connection.findById(connectionId);

        if (!connection || connection.status !== CONNECTION_STATUS.ACCEPTED) {
            res.status(404);
            return next(new Error('Active connection not found'));
        }

        const userId = req.user._id.toString();
        if (connection.requester.toString() !== userId && connection.recipient.toString() !== userId) {
            res.status(403);
            return next(new Error('You are not part of this connection'));
        }

        connection.labels = labels;
        await connection.save();

        res.status(200).json({
            status: 'success',
            message: 'Labels updated',
            data: connection,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get my accepted connections
// @route   GET /api/connections
// @access  Private
const getMyConnections = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor; 
        const q = req.query.q;

        let query = {
            $or: [{ requester: userId }, { recipient: userId }],
            status: CONNECTION_STATUS.ACCEPTED,
        };

        // If a search query is provided, we need to filter by the OTHER person's details.
        // Step 1: Find users matching the query
        if (q && q.trim().length >= 1) {
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { email: { $regex: q, $options: 'i' } }
                ]
            }).select('_id');
            const matchingUserIds = matchingUsers.map(u => u._id);

            // Step 2: Ensure the connection involves one of these matching users
            query = {
                $and: [
                    { status: CONNECTION_STATUS.ACCEPTED },
                    { $or: [{ requester: userId }, { recipient: userId }] },
                    { $or: [{ requester: { $in: matchingUserIds } }, { recipient: { $in: matchingUserIds } }] }
                ]
            };
        }

        if (cursor) {
            query.respondedAt = { $lt: new Date(cursor) };
        }

        const connections = await Connection.find(query)
            .populate('requester', 'name email avatar role status customMessage totalConnections')
            .populate('recipient', 'name email avatar role status customMessage totalConnections')
            .sort({ respondedAt: -1 })
            .limit(limit + 1);

        const hasNextPage = connections.length > limit;
        const results = hasNextPage ? connections.slice(0, limit) : connections;
        const nextCursor = hasNextPage ? results[results.length - 1].respondedAt : null;

        // Format: always return the "other person" as the connection
        const formatted = results.map(conn => {
            const other = conn.requester._id.toString() === userId.toString()
                ? conn.recipient
                : conn.requester;
            return {
                _id: conn._id,
                user: other,
                labels: conn.labels,
                connectedAt: conn.respondedAt || conn.createdAt,
            };
        });

        res.status(200).json({
            status: 'success',
            count: formatted.length,
            nextCursor,
            data: formatted,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get pending incoming requests
// @route   GET /api/connections/pending
// @access  Private
const getPendingRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;

        const query = {
            recipient: userId,
            status: CONNECTION_STATUS.PENDING,
        };

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        const incoming = await Connection.find(query)
            .populate('requester', 'name email avatar role status customMessage totalConnections')
            .sort({ createdAt: -1 })
            .limit(limit + 1);

        const hasNextPage = incoming.length > limit;
        const results = hasNextPage ? incoming.slice(0, limit) : incoming;
        const nextCursor = hasNextPage ? results[results.length - 1].createdAt : null;

        res.status(200).json({
            status: 'success',
            count: results.length,
            nextCursor,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get sent (outgoing) pending requests
// @route   GET /api/connections/sent
// @access  Private
const getSentRequests = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor;

        const query = {
            requester: userId,
            status: CONNECTION_STATUS.PENDING,
        };

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        const sent = await Connection.find(query)
            .populate('recipient', 'name email avatar role status customMessage totalConnections')
            .sort({ createdAt: -1 })
            .limit(limit + 1);

        const hasNextPage = sent.length > limit;
        const results = hasNextPage ? sent.slice(0, limit) : sent;
        const nextCursor = hasNextPage ? results[results.length - 1].createdAt : null;

        res.status(200).json({
            status: 'success',
            count: results.length,
            nextCursor,
            data: results,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get network stats (connection count, pending count)
// @route   GET /api/connections/stats
// @access  Private
const getStats = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const now = Date.now();

        // Layer 1: Memory Cache check
        if (statsCache.has(userId.toString())) {
            const cached = statsCache.get(userId.toString());
            if (now < cached.expires) {
                return res.status(200).json({ status: 'success', data: cached.data });
            }
        }

        // Layer 2: Real-time counts (Zero-drift strategy)
        const [acceptedCount, pendingCount, sentCount] = await Promise.all([
            Connection.countDocuments({ 
                $or: [{ requester: userId }, { recipient: userId }], 
                status: CONNECTION_STATUS.ACCEPTED 
            }),
            Connection.countDocuments({ recipient: userId, status: CONNECTION_STATUS.PENDING }),
            Connection.countDocuments({ requester: userId, status: CONNECTION_STATUS.PENDING }),
        ]);

        const stats = {
            connectionCount: acceptedCount,
            pendingCount,
            sentCount,
        };

        // Silently sync the User model's denormalized totalConnections in the background
        // to ensure other components (like profile pages) are eventually consistent.
        User.findByIdAndUpdate(userId, { totalConnections: acceptedCount })
            .catch(err => logger.error(`Background connection count sync failed: ${err.message}`));

        // Update Layer 1 (Memory Cache)
        statsCache.set(userId.toString(), { data: stats, expires: now + STATS_TTL });

        res.status(200).json({
            status: 'success',
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get mutual connections between current user and another user
// @route   GET /api/connections/mutual/:userId
// @access  Private
const getMutualConnections = async (req, res, next) => {
    try {
        const myId = req.user._id;
        const theirId = req.params.userId;

        // Get my accepted connections
        const myConns = await Connection.find({
            $or: [{ requester: myId }, { recipient: myId }],
            status: CONNECTION_STATUS.ACCEPTED,
        });

        const myConnIds = myConns.map(c =>
            c.requester.toString() === myId.toString()
                ? c.recipient.toString()
                : c.requester.toString()
        );

        // Get their accepted connections
        const theirConns = await Connection.find({
            $or: [{ requester: theirId }, { recipient: theirId }],
            status: CONNECTION_STATUS.ACCEPTED,
        });

        const theirConnIds = theirConns.map(c =>
            c.requester.toString() === theirId.toString()
                ? c.recipient.toString()
                : c.requester.toString()
        );

        // Intersection
        const mutualIds = myConnIds.filter(id => theirConnIds.includes(id));

        const mutuals = await User.find({ _id: { $in: mutualIds } })
            .select('name email avatar role status')
            .limit(10);

        res.status(200).json({
            status: 'success',
            count: mutualIds.length,
            data: mutuals,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Search users for networking (with connection status)
// @route   GET /api/connections/search?q=...&role=...
// @access  Private
const searchUsers = async (req, res, next) => {
    try {
        const { q, role, skill } = req.query;
        const userId = req.user._id;

        const filter = {
            _id: { $ne: userId },
            isActive: { $ne: false },
            isBanned: { $ne: true },
            role: { $ne: PROJECT_ROLES.ADMIN },
        };

        if (q && q.trim().length >= 2) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { skills: { $regex: q, $options: 'i' } },
            ];
        }

        if (skill) {
            filter.skills = { $regex: skill, $options: 'i' };
        }

        if (role && [PROJECT_ROLES.MANAGER, PROJECT_ROLES.EDITOR, PROJECT_ROLES.VIEWER].includes(role)) {
            filter.role = role;
        }

        const users = await User.find(filter)
            .select('name email avatar role status customMessage')
            .limit(20);

        // Get all connections involving the current user to determine statuses
        const myConnections = await Connection.find({
            $or: [{ requester: userId }, { recipient: userId }],
        });

        const enriched = users.map(user => {
            const conn = myConnections.find(
                c =>
                    (c.requester.toString() === user._id.toString() ||
                        c.recipient.toString() === user._id.toString())
            );

            let connectionStatus = 'none';
            let connectionId = null;
            let direction = null;

            if (conn) {
                connectionStatus = conn.status;
                connectionId = conn._id;
                direction = conn.requester.toString() === userId.toString() ? 'sent' : 'received';
            }

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                status: user.status,
                customMessage: user.customMessage,
                connectionStatus,
                connectionId,
                direction,
            };
        });

        res.status(200).json({
            status: 'success',
            count: enriched.length,
            data: enriched,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get suggested connections ("People you may know")
// @route   GET /api/connections/suggestions
// @access  Private
const getSuggestions = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const redisClient = getRedisClient();

        // 1. Try Cache First
        if (redisClient && redisClient.isReady) {
            const cached = await redisClient.get(`suggestions:${userId}`);
            if (cached) {
                return res.status(200).json(JSON.parse(cached));
            }
        }

        // 2. Identify Users to Exclude (self, already connected, pending)
        const existing = await Connection.find({
            $or: [{ requester: userId }, { recipient: userId }],
            status: { $in: [CONNECTION_STATUS.PENDING, CONNECTION_STATUS.ACCEPTED] },
        });

        const excludeIds = new Set([userId.toString()]);
        const myConnectionIds = [];
        existing.forEach(c => {
            const rId = c.requester.toString();
            const pId = c.recipient.toString();
            excludeIds.add(rId);
            excludeIds.add(pId);
            if (c.status === CONNECTION_STATUS.ACCEPTED) {
                myConnectionIds.push(rId === userId.toString() ? pId : rId);
            }
        });

        // 3. Find Mutual Connections (N-Degree)
        // Find connections of my connections
        const mutualConnections = await Connection.find({
            $or: [
                { requester: { $in: myConnectionIds }, recipient: { $nin: Array.from(excludeIds) }, status: CONNECTION_STATUS.ACCEPTED },
                { recipient: { $in: myConnectionIds }, requester: { $nin: Array.from(excludeIds) }, status: CONNECTION_STATUS.ACCEPTED }
            ]
        }).limit(200);

        const candidateMap = new Map(); // userId -> { count, mutualIds }
        mutualConnections.forEach(c => {
            const potentialId = myConnectionIds.includes(c.requester.toString()) ? c.recipient.toString() : c.requester.toString();
            const mutualWith = myConnectionIds.includes(c.requester.toString()) ? c.requester.toString() : c.recipient.toString();
            
            if (!candidateMap.has(potentialId)) {
                candidateMap.set(potentialId, { count: 0, mutualIds: [] });
            }
            const data = candidateMap.get(potentialId);
            data.count++;
            if (data.mutualIds.length < 3) data.mutualIds.push(mutualWith);
        });

        // Convert map to sorted array
        const sortedCandidates = Array.from(candidateMap.entries())
            .sort((a, b) => b[1].count - a[1].count) // Sort by mutual count descending
            .slice(0, 15);

        const mutualUserIds = sortedCandidates.map(c => c[0]);
        const allMutualWithIds = [...new Set(sortedCandidates.flatMap(c => c[1].mutualIds))];

        // 4. Get User Details and Mutual Names
        const [foundMutuals, mutualUserNames] = await Promise.all([
            User.find({
                _id: { $in: mutualUserIds },
                isActive: { $ne: false },
                isBanned: { $ne: true },
                role: { $ne: PROJECT_ROLES.ADMIN },
            }).select('name email avatar role status customMessage totalConnections').lean(),
            User.find({ _id: { $in: allMutualWithIds } }).select('name').lean()
        ]);

        const nameLookup = new Map(mutualUserNames.map(u => [u._id.toString(), u.name]));

        // Map back to maintain sorting and add mutual count + names
        const mutualSuggestions = foundMutuals.map(u => {
            const stats = candidateMap.get(u._id.toString());
            const names = stats.mutualIds.map(id => nameLookup.get(id)).filter(Boolean);
            let reason = `${stats.count} mutual connections`;
            if (names.length > 0) {
                reason = `Mutual friends: ${names.join(', ')}${stats.count > names.length ? ` + ${stats.count - names.length} others` : ''}`;
            }

            return {
                ...u,
                mutualCount: stats.count,
                reason
            };
        }).sort((a, b) => b.mutualCount - a.mutualCount);

        // 5. Fill remaining with Co-workers or Role-based Discoveries
        const remaining = 15 - mutualSuggestions.length;
        let coworkers = [];

        if (remaining > 0) {
            const Project = require('../models/project.model');
            const myProjects = await Project.find({
                'members.userId': userId,
                deletedAt: null,
            }).select('members');

            const coworkerIds = new Set();
            myProjects.forEach(p => {
                p.members.forEach(m => {
                    const mid = m.userId.toString();
                    if (!excludeIds.has(mid) && !mutualUserIds.includes(mid)) coworkerIds.add(mid);
                });
            });

            if (coworkerIds.size > 0) {
                coworkers = await User.find({
                    _id: { $in: [...coworkerIds] },
                    isActive: { $ne: false },
                    isBanned: { $ne: true },
                    role: { $ne: 'Admin' },
                }).select('name email avatar role status customMessage').limit(remaining).lean();
            }
        }

        // 6. Last Resort: Complementary or Same-role members
        const finalRemaining = remaining - coworkers.length;
        let roleMatches = [];
        if (finalRemaining > 0) {
            // Determine complementary role
            const currentRole = req.user.role;
            const targetRole = currentRole === 'Manager' ? 'Developer' : 'Manager';

            // Try complementary first
            roleMatches = await User.find({
                _id: { $nin: [...Array.from(excludeIds), ...mutualUserIds, ...coworkers.map(u => u._id.toString())] },
                role: targetRole,
                isActive: { $ne: false },
                isBanned: { $ne: true },
            }).select('name email avatar role status customMessage totalConnections').limit(finalRemaining).lean();

            // If still space, fill with same role
            if (roleMatches.length < finalRemaining) {
                const sameRoleMatches = await User.find({
                    _id: { $nin: [...Array.from(excludeIds), ...mutualUserIds, ...coworkers.map(u => u._id.toString()), ...roleMatches.map(u => u._id.toString())] },
                    role: currentRole,
                    isActive: { $ne: false },
                    isBanned: { $ne: true },
                }).select('name email avatar role status customMessage totalConnections').limit(finalRemaining - roleMatches.length).lean();
                roleMatches = [...roleMatches, ...sameRoleMatches];
            }
        }

        const suggestions = [
            ...mutualSuggestions,
            ...coworkers.map(u => ({ ...u, reason: 'Works on a shared project' })),
            ...roleMatches.map(u => ({ ...u, reason: `Also a ${u.role}` }))
        ];

        const response = {
            status: 'success',
            count: suggestions.length,
            data: suggestions,
        };

        // Cache for 15 minutes
        if (redisClient && redisClient.isReady) {
            await redisClient.setEx(`suggestions:${userId}`, 900, JSON.stringify(response));
        }

        res.status(200).json(response);
    } catch (error) {
        next(error);
    }
};

// ─── Endorsement Controllers ───────────────────────────────────────────────

// @desc    Toggle endorsement for a skill
// @route   POST /api/endorsements/toggle
// @access  Private
const toggleEndorsement = async (req, res, next) => {
    try {
        const { toUserId, skillName } = req.body;
        const fromUserId = req.user._id;

        if (toUserId === fromUserId.toString()) {
            res.status(400);
            return next(new Error('You cannot endorse your own skills'));
        }

        const existing = await Endorsement.findOne({ fromUser: fromUserId, toUser: toUserId, skillName });

        if (existing) {
            await Endorsement.findByIdAndDelete(existing._id);
            res.status(200).json({ status: 'success', action: 'removed' });
        } else {
            await Endorsement.create({ fromUser: fromUserId, toUser: toUserId, skillName });
            
            // Notify recipient
            try {
                const notificationService = require('../services/notification.service');
                await notificationService.notify({
                    recipientId: toUserId,
                    senderId: fromUserId,
                    type: 'Endorsement',
                    priority: 'Low',
                    title: 'Skill Endorsed',
                    message: `${req.user.name} endorsed you for ${skillName}.`,
                    link: `/profile/${toUserId}`,
                    metadata: { skillName }
                });
            } catch (err) {
                logger.error(`Notification failed in toggleEndorsement: ${err.message}`);
            }

            res.status(201).json({ status: 'success', action: 'added' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Get endorsement counts for a profile
// @route   GET /api/endorsements/user/:id
// @access  Private
const getUserEndorsements = async (req, res, next) => {
    try {
        const endorsements = await Endorsement.find({ toUser: req.params.id });
        
        // Group by skillName
        const counts = endorsements.reduce((acc, curr) => {
            acc[curr.skillName] = (acc[curr.skillName] || 0) + 1;
            return acc;
        }, {});

        // Flag which ones the current user has endorsed
        const myEndorsements = endorsements
            .filter(e => e.fromUser.toString() === req.user._id.toString())
            .map(e => e.skillName);

        res.status(200).json({
            status: 'success',
            data: {
                counts,
                myEndorsements
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    // Connections
    sendRequest,
    respondToRequest,
    withdrawRequest,
    removeConnection,
    updateLabels,
    getMyConnections,
    getPendingRequests,
    getSentRequests,
    getStats,
    getMutualConnections,
    searchUsers,
    getSuggestions,
    // Endorsements
    toggleEndorsement,
    getUserEndorsements
};
