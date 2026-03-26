const User = require('../models/user.model');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const { logSecurityEvent, logActivity } = require('../utils/activityLogger');
const SystemConfig = require('../models/systemConfig.model');
const { checkMaintenanceStatus } = require('../utils/helpers');

// @desc    Get all users with pagination and search
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        // Build search query matching Name or Email
        const query = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Exclude passwords
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(query);

        res.status(200).json({
            status: 'success',
            data: users,
            meta: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a user's role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const validRoles = ['Admin', 'Manager', 'Developer'];
        if (!validRoles.includes(role)) {
            res.status(400);
            return next(new Error('Invalid role specified.'));
        }

        const user = await User.findById(id).select('-password');

        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        // Prevent admin from stripping their own role
        if (user._id.toString() === req.user._id.toString() && role !== 'Admin') {
            res.status(400);
            return next(new Error('You cannot remove your own Admin privileges.'));
        }

        user.role = role;
        await user.save({ validateBeforeSave: false }); // Bypass password hook

        await logSecurityEvent(req.user._id, 'ROLE_UPDATED', {
            targetUserId: user._id,
            targetUserName: user.name,
            targetUserEmail: user.email,
            newRole: role,
            ipAddress: req.ip
        });

        res.status(200).json({
            status: 'success',
            message: `User role updated to ${role}`,
            data: user
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Toggle Ban status (Ban/Unban)
// @route   PUT /api/admin/users/:id/ban
// @access  Private/Admin
const toggleBanUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select('-password');

        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        // Prevent admin from banning themselves
        if (user._id.toString() === req.user._id.toString()) {
            res.status(400);
            return next(new Error('You cannot ban yourself.'));
        }

        user.isBanned = !user.isBanned;

        // Optionally, if unbanning, you might want to ensure isActive is true 
        // if it was deactivated, but we'll stick strictly to isBanned flag here.
        await user.save({ validateBeforeSave: false });

        await logSecurityEvent(req.user._id, user.isBanned ? 'USER_BANNED' : 'USER_UNBANNED', {
            targetUserId: user._id,
            targetUserName: user.name,
            targetUserEmail: user.email,
            ipAddress: req.ip
        });

        res.status(200).json({
            status: 'success',
            message: user.isBanned ? 'User has been banned successfully' : 'User ban has been lifted',
            data: {
                _id: user._id,
                isBanned: user.isBanned
            }
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get global platform stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getPlatformStats = async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const bannedUsers = await User.countDocuments({ isBanned: true });
        const activeUsers = await User.countDocuments({ isBanned: false, isActive: true });
        const deactivatedUsers = await User.countDocuments({ isBanned: false, isActive: false });

        const totalProjects = await Project.countDocuments();
        const totalTasks = await Task.countDocuments();
        const completedTasks = await Task.countDocuments({ status: 'Completed' });
        const pendingTasks = await Task.countDocuments({ status: { $ne: 'Completed' } });

        const maintenanceConfig = await SystemConfig.findOne({ key: 'maintenance_mode' }).lean();
        const { isMaintenance, endTime, autoRepairNeeded } = checkMaintenanceStatus(maintenanceConfig?.value);

        // Auto-Repair if system thinks it's in maintenance but time is up
        if (autoRepairNeeded) {
            SystemConfig.findOneAndUpdate(
                { key: 'maintenance_mode' },
                { $set: { "value.enabled": false } }
            ).exec();
        }

        // Optional: Could add storage stats or latest activity counts here

        res.status(200).json({
            status: 'success',
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    banned: bannedUsers,
                    deactivated: deactivatedUsers
                },
                projects: {
                    total: totalProjects
                },
                tasks: {
                    total: totalTasks,
                    completed: completedTasks,
                    pending: pendingTasks,
                    completionPct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                },
                system: {
                    status: isMaintenance ? 'Maintenance' : 'Operational',
                    endTime: endTime,
                    lastBackup: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle maintenance mode
// @route   PUT /api/admin/system/maintenance
// @access  Private/Admin
const toggleMaintenance = async (req, res, next) => {
    try {
        const { enabled, endTime } = req.body;

        const config = await SystemConfig.findOneAndUpdate(
            { key: 'maintenance_mode' },
            {
                value: {
                    enabled: !!enabled,
                    endTime: enabled ? endTime : null
                },
                updatedBy: req.user._id
            },
            { upsert: true, new: true }
        );

        await logActivity(null, req.user._id, !!enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED', {
            endTime: enabled ? endTime : null,
            ipAddress: req.ip
        }, 'System');

        // Broadcast to every connected client so browsers can react instantly
        try {
            const { getIO } = require('../utils/socket');
            getIO().emit('maintenanceChanged', {
                enabled: !!enabled,
                endTime: enabled ? endTime : null
            });
        } catch (socketErr) {
            // Non-fatal — socket may not be initialized during tests
        }

        res.status(200).json({
            status: 'success',
            data: config
        });
    } catch (error) {
        next(error);
    }
};


// @desc    Update blocked IPs
// @route   PUT /api/admin/system/blocked-ips
// @access  Private/Admin
const updateBlockedIps = async (req, res, next) => {
    try {
        const { ips } = req.body;

        if (!Array.isArray(ips)) {
            res.status(400);
            return next(new Error('IPs must be an array.'));
        }

        const config = await SystemConfig.findOneAndUpdate(
            { key: 'blocked_ips' },
            { value: ips, updatedBy: req.user._id },
            { upsert: true, new: true }
        );

        await logActivity(null, req.user._id, 'IP_BLOCKED', {
            count: ips.length,
            ipAddress: req.ip
        }, 'System');

        res.status(200).json({
            status: 'success',
            data: config
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get currently blocked IPs
// @route   GET /api/admin/system/blocked-ips
// @access  Private/Admin
const getBlockedIps = async (req, res, next) => {
    try {
        const config = await SystemConfig.findOne({ key: 'blocked_ips' }).lean();
        const ips = config ? config.value : [];
        
        res.status(200).json({
            status: 'success',
            data: ips
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get system status (public)
// @route   GET /api/admin/system/status
// @access  Public
const getSystemStatus = async (req, res, next) => {
    try {
        const maintenanceConfig = await SystemConfig.findOne({ key: 'maintenance_mode' }).lean();
        const { isMaintenance, endTime, autoRepairNeeded } = checkMaintenanceStatus(maintenanceConfig?.value);

        // Auto-disable if end time has passed
        if (autoRepairNeeded) {
            SystemConfig.findOneAndUpdate(
                { key: 'maintenance_mode' },
                { $set: { "value.enabled": false } }
            ).exec();
        }

        res.status(200).json({
            status: 'success',
            data: {
                isMaintenance: isMaintenance,
                endTime: endTime
            }
        });
    } catch (error) {
        next(error);
    }
};

const Audit = require('../models/audit.model');

// ... (existing admin functions)

// @desc    Get paginated audit/activity logs
// @route   GET /api/audit
// @access  Private (Admin/Manager)
const getLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const skip = (page - 1) * limit;
        const entityId = req.query.entityId;

        let logs, total;

        if (entityId) {
            // Unified query to Audit (Project logs)
            total = await Audit.countDocuments({ entityId: entityId, entityType: 'Project' });
            logs = await Audit.find({ entityId: entityId, entityType: 'Project' })
                .populate('user', 'name email avatar')
                .sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        } else {
            // General system audit logs
            const query = req.query.type ? { entityType: req.query.type } : {};
            total = await Audit.countDocuments(query);
            logs = await Audit.find(query)
                .populate('user', 'name email avatar')
                .sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        }

        res.status(200).json({
            status: 'success',
            count: logs.length,
            pagination: { total, page, pages: Math.ceil(total / limit) },
            data: logs,
        });
    } catch (error) { next(error); }
};

module.exports = {
    getUsers,
    updateUserRole,
    toggleBanUser,
    getPlatformStats,
    toggleMaintenance,
    updateBlockedIps,
    getBlockedIps,
    getSystemStatus,
    getLogs
};
