const SystemConfig = require('../models/SystemConfig.model');

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
            // Check for admin role in either token or session if already authenticated
            // Note: Since protect might not have run yet, we check if req.user exists
            if (req.user && req.user.role === 'Admin') {
                return next();
            }

            // Special check: If it's an admin accessing the admin API, allow it
            if (req.originalUrl.startsWith('/api/admin')) {
                // We rely on verifyAdmin within the routes to protect these
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
