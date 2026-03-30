const Connection = require('../models/connection.model');
const User = require('../models/user.model');
const { z } = require('zod');

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

// ─── Controllers ─────────────────────────────────────────────────────────────

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
        if (req.user.role === 'Admin') {
            res.status(403);
            return next(new Error('Admin accounts cannot use the networking feature'));
        }

        // Prevent self-connection
        if (requesterId.toString() === recipientId) {
            res.status(400);
            return next(new Error('You cannot send a connection request to yourself'));
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            res.status(404);
            return next(new Error('User not found'));
        }

        // Prevent connecting with Admin accounts
        if (recipient.role === 'Admin') {
            res.status(400);
            return next(new Error('Cannot connect with system administrator accounts'));
        }

        // Check for existing connection in either direction
        const existing = await Connection.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId },
            ],
        });

        if (existing) {
            if (existing.status === 'accepted') {
                res.status(400);
                return next(new Error('You are already connected with this user'));
            }
            if (existing.status === 'pending') {
                // If the other user already sent us a request, auto-accept
                if (existing.requester.toString() === recipientId) {
                    existing.status = 'accepted';
                    existing.respondedAt = new Date();
                    await existing.save();
                    return res.status(200).json({
                        status: 'success',
                        message: 'Connection accepted! They had already sent you a request.',
                        data: existing,
                    });
                }
                res.status(400);
                return next(new Error('You have already sent a request to this user'));
            }
            if (existing.status === 'declined') {
                // Allow re-request by updating the existing record
                existing.status = 'pending';
                existing.requester = requesterId;
                existing.recipient = recipientId;
                existing.note = note || '';
                existing.respondedAt = null;
                await existing.save();
                return res.status(201).json({
                    status: 'success',
                    message: 'Connection request re-sent',
                    data: existing,
                });
            }
        }

        const connection = await Connection.create({
            requester: requesterId,
            recipient: recipientId,
            note: note || '',
        });

        res.status(201).json({
            status: 'success',
            message: 'Connection request sent',
            data: connection,
        });
    } catch (error) {
        require('fs').writeFileSync('c:/tmp/backend_err.txt', error.stack || error.toString());
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

        const connection = await Connection.findById(connectionId);
        if (!connection) {
            res.status(404);
            return next(new Error('Connection request not found'));
        }

        // Only the recipient can respond
        if (connection.recipient.toString() !== req.user._id.toString()) {
            res.status(403);
            return next(new Error('You are not authorized to respond to this request'));
        }

        if (connection.status !== 'pending') {
            res.status(400);
            return next(new Error('This request has already been responded to'));
        }

        connection.status = action === 'accept' ? 'accepted' : 'declined';
        connection.respondedAt = new Date();
        await connection.save();

        res.status(200).json({
            status: 'success',
            message: action === 'accept' ? 'Connection accepted' : 'Connection declined',
            data: connection,
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

        if (connection.status !== 'pending') {
            res.status(400);
            return next(new Error('Can only withdraw pending requests'));
        }

        await Connection.findByIdAndDelete(connectionId);

        res.status(200).json({
            status: 'success',
            message: 'Connection request withdrawn',
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

        res.status(200).json({
            status: 'success',
            message: 'Connection removed',
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

        if (!connection || connection.status !== 'accepted') {
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

        const connections = await Connection.find({
            $or: [{ requester: userId }, { recipient: userId }],
            status: 'accepted',
        })
            .populate('requester', 'name email avatar role status customMessage')
            .populate('recipient', 'name email avatar role status customMessage')
            .sort({ respondedAt: -1 });

        // Format: always return the "other person" as the connection
        const formatted = connections.map(conn => {
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

        const incoming = await Connection.find({
            recipient: userId,
            status: 'pending',
        })
            .populate('requester', 'name email avatar role status customMessage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            count: incoming.length,
            data: incoming,
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

        const sent = await Connection.find({
            requester: userId,
            status: 'pending',
        })
            .populate('recipient', 'name email avatar role status customMessage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            count: sent.length,
            data: sent,
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

        const [connectionCount, pendingCount, sentCount] = await Promise.all([
            Connection.countDocuments({
                $or: [{ requester: userId }, { recipient: userId }],
                status: 'accepted',
            }),
            Connection.countDocuments({ recipient: userId, status: 'pending' }),
            Connection.countDocuments({ requester: userId, status: 'pending' }),
        ]);

        res.status(200).json({
            status: 'success',
            data: { connectionCount, pendingCount, sentCount },
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
            status: 'accepted',
        });

        const myConnIds = myConns.map(c =>
            c.requester.toString() === myId.toString()
                ? c.recipient.toString()
                : c.requester.toString()
        );

        // Get their accepted connections
        const theirConns = await Connection.find({
            $or: [{ requester: theirId }, { recipient: theirId }],
            status: 'accepted',
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
        const { q, role } = req.query;
        const userId = req.user._id;

        if (!q || q.trim().length < 2) {
            return res.status(200).json({ status: 'success', data: [] });
        }

        const filter = {
            _id: { $ne: userId },
            isActive: { $ne: false },
            isBanned: { $ne: true },
            role: { $ne: 'Admin' },
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
            ],
        };

        if (role && ['Manager', 'Developer'].includes(role)) {
            filter.role = role; // This is safe because both Manager and Developer are non-Admin
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

        // Get IDs of all users I'm already connected to or have pending with
        const existing = await Connection.find({
            $or: [{ requester: userId }, { recipient: userId }],
            status: { $in: ['pending', 'accepted'] },
        });

        const excludeIds = new Set([userId.toString()]);
        existing.forEach(c => {
            excludeIds.add(c.requester.toString());
            excludeIds.add(c.recipient.toString());
        });

        // Find users I share projects with (co-workers get prioritized)
        const Project = require('../models/project.model');
        const myProjects = await Project.find({
            'members.userId': userId,
            deletedAt: null,
        }).select('members');

        const coworkerIds = new Set();
        myProjects.forEach(p => {
            p.members.forEach(m => {
                const mid = m.userId.toString();
                if (!excludeIds.has(mid)) coworkerIds.add(mid);
            });
        });

        // Get coworker users first (priority suggestions)
        const coworkers = coworkerIds.size > 0
            ? await User.find({
                _id: { $in: [...coworkerIds] },
                isActive: { $ne: false },
                isBanned: { $ne: true },
                role: { $ne: 'Admin' },
            }).select('name email avatar role status customMessage').limit(10)
            : [];

        // Fill remaining slots with other active users
        const remaining = 15 - coworkers.length;
        const otherUsers = remaining > 0
            ? await User.find({
                _id: { $nin: [...excludeIds, ...coworkerIds] },
                isActive: { $ne: false },
                isBanned: { $ne: true },
                role: { $ne: 'Admin' },
            }).select('name email avatar role status customMessage').limit(remaining)
            : [];

        const suggestions = [
            ...coworkers.map(u => ({ ...u.toObject(), reason: 'Works on a shared project' })),
            ...otherUsers.map(u => ({ ...u.toObject(), reason: 'People on the platform' })),
        ];

        res.status(200).json({
            status: 'success',
            count: suggestions.length,
            data: suggestions,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
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
};
