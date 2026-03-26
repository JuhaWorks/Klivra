const SystemConfig = require('../models/systemConfig.model');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const { checkMaintenanceStatus } = require('../utils/helpers');

const { getRedisClient } = require('../utils/redis');

const securityMiddleware = async (req, res, next) => {
    try {
        // 0. Bypass for specific health/auth routes
        const bypassRoutes = ['/api/auth', '/api/admin/system/status'];
        if (bypassRoutes.some(route => req.originalUrl.startsWith(route))) {
            return next();
        }

        const redis = getRedisClient();
        let blockedIps, maintenanceConfig;

        // Try Cache-First approach for better performance
        if (redis && redis.isReady) {
            const [cachedIps, cachedMaintenance] = await Promise.all([
                redis.get('config:blocked_ips'),
                redis.get('config:maintenance_mode')
            ]);
            blockedIps = cachedIps ? JSON.parse(cachedIps) : null;
            maintenanceConfig = cachedMaintenance ? JSON.parse(cachedMaintenance) : null;
        }

        // 1. IP Blacklist Check
        if (!blockedIps) {
            const config = await SystemConfig.findOne({ key: 'blocked_ips' }).lean();
            blockedIps = config ? config.value : [];
            if (redis && redis.isReady) redis.setEx('config:blocked_ips', 300, JSON.stringify(blockedIps));
        }

        if (blockedIps.includes(req.ip)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Your IP address has been blacklisted for security reasons.'
            });
        }

        // 2. Maintenance Mode Check
        if (!maintenanceConfig) {
            const config = await SystemConfig.findOne({ key: 'maintenance_mode' }).lean();
            maintenanceConfig = config ? config.value : null;
            if (redis && redis.isReady) redis.setEx('config:maintenance_mode', 60, JSON.stringify(maintenanceConfig));
        }

        const { isMaintenance, endTime, autoRepairNeeded } = checkMaintenanceStatus(maintenanceConfig);
        
        // Auto-Repair in the background if system thinks it's in maintenance but time is up
        if (autoRepairNeeded) {
            SystemConfig.findOneAndUpdate(
                { key: 'maintenance_mode' },
                { $set: { "value.enabled": false } }
            ).exec().catch(err => logger.error(`[MAINTENANCE REPAIR FAIL] ${err.message}`));
        }

        if (isMaintenance) {
            // Check for admin role
            let isAdmin = req.user && req.user.role === 'Admin';

            // If req.user isn't set yet (early global middleware), try to peek at the JWT
            if (!isAdmin) {
                const authHeader = req.headers.authorization;
                const cookieToken = req.cookies ? req.cookies.token : null;
                const token = (authHeader && authHeader.startsWith('Bearer')) ? authHeader.split(' ')[1] : cookieToken;

                if (token) {
                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        
                        const user = await User.findById(decoded.id).select('role').lean();
                        if (user && user.role === 'Admin') {
                            isAdmin = true;
                            // console.log(`[MAINTENANCE BYPASS] Admin identified via token: ${user._id}`);
                        } else {
                           // console.log(`[MAINTENANCE BLOCK] User identified but is not Admin. Role: ${user?.role}`);
                        }
                    } catch (err) {
                        if (err.name === 'TokenExpiredError') {
                            // High Priority: If token is expired during maintenance, return 401
                            // so the frontend can trigger a refresh and get back in.
                            return res.status(401).json({
                                status: 'fail',
                                message: 'Session expired. Please refresh to continue admin access.',
                                isMaintenance: true
                            });
                        }
                        console.log(`[MAINTENANCE BYPASS FAIL] Token verification error: ${err.message}`);
                    }
                } else {
                    // console.log(`[MAINTENANCE BLOCK] No token found in header or cookie: ${req.originalUrl}`);
                }
            }

            if (isAdmin) {
                return next();
            }

            // Special check: If it's an admin accessing the admin API, allow it
            if (req.originalUrl.startsWith('/api/admin')) {
                return next();
            }

            return res.status(503).json({
                status: 'fail',
                message: 'System is currently under maintenance. Please try again later.',
                endTime: endTime
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { securityMiddleware };
