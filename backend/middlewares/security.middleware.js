const SystemConfig = require('../models/systemConfig.model');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../utils/logger');

const securityMiddleware = async (req, res, next) => {
    try {
        // 0. Bypass for specific health/auth routes if necessary
        // Allow all auth routes so admins can authenticate and users can register/verify
        const bypassRoutes = ['/api/auth', '/api/admin/system/status'];
        if (bypassRoutes.some(route => req.originalUrl.startsWith(route))) {
            return next();
        }

        // 1. IP Blacklist Check
        const blockedIpsConfig = await SystemConfig.findOne({ key: 'blocked_ips' }).lean();
        const blockedIps = blockedIpsConfig ? blockedIpsConfig.value : [];

        if (blockedIps.includes(req.ip)) {
            return res.status(403).json({
                status: 'fail',
                message: 'Your IP address has been blacklisted for security reasons.'
            });
        }

        // 2. Maintenance Mode Check
        const maintenanceConfig = await SystemConfig.findOne({ key: 'maintenance_mode' }).lean();
        const maintenanceDetails = maintenanceConfig ? maintenanceConfig.value : { enabled: false, endTime: null };
        const isMaintenance = maintenanceDetails.enabled && (!maintenanceDetails.endTime || new Date() < new Date(maintenanceDetails.endTime));

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
                endTime: maintenanceDetails.endTime
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { securityMiddleware };
