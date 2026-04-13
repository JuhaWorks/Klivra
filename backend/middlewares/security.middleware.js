const SystemConfig = require('../models/systemConfig.model');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const { checkMaintenanceStatus } = require('../utils/helpers');
const { getRedisClient } = require('../utils/redis');
const rateLimit = require('express-rate-limit');

/**
 * 1. Global Security Middleware
 * Handles IP Blacklisting and Maintenance Mode gating.
 */
const securityMiddleware = async (req, res, next) => {
    try {
        const bypassRoutes = ['/api/auth', '/api/admin/system/status'];
        if (bypassRoutes.some(route => req.originalUrl.startsWith(route))) {
            return next();
        }

        const redis = getRedisClient();
        let blockedIps, maintenanceConfig;

        if (redis && redis.isReady) {
            const [cachedIps, cachedMaintenance] = await Promise.all([
                redis.get('config:blocked_ips'),
                redis.get('config:maintenance_mode')
            ]);
            blockedIps = cachedIps ? JSON.parse(cachedIps) : null;
            maintenanceConfig = cachedMaintenance ? JSON.parse(cachedMaintenance) : null;
        }

        if (!blockedIps) {
            const config = await SystemConfig.findOne({ key: 'blocked_ips' }).lean();
            blockedIps = config ? config.value : [];
            if (redis && redis.isReady) redis.setEx('config:blocked_ips', 300, JSON.stringify(blockedIps));
        }

        if (blockedIps.includes(req.ip)) {
            return res.status(403).json({ status: 'fail', message: 'Your IP address has been blacklisted for security reasons.' });
        }

        if (!maintenanceConfig) {
            const config = await SystemConfig.findOne({ key: 'maintenance_mode' }).lean();
            maintenanceConfig = config ? config.value : null;
            if (redis && redis.isReady) redis.setEx('config:maintenance_mode', 60, JSON.stringify(maintenanceConfig));
        }

        const { isMaintenance, endTime, autoRepairNeeded } = checkMaintenanceStatus(maintenanceConfig);
        if (autoRepairNeeded) {
            SystemConfig.findOneAndUpdate({ key: 'maintenance_mode' }, { $set: { "value.enabled": false } }).exec().catch(() => {});
        }

        if (isMaintenance) {
            let isAdmin = req.user && req.user.role === 'Admin';
            if (!isAdmin) {
                const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
                if (token) {
                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        const user = await User.findById(decoded.id).select('role').lean();
                        if (user?.role === 'Admin') isAdmin = true;
                    } catch (err) {
                        if (err.name === 'TokenExpiredError') {
                            return res.status(401).json({ status: 'fail', message: 'Session expired. Please refresh to continue admin access.', isMaintenance: true });
                        }
                    }
                }
            }
            if (isAdmin || req.originalUrl.startsWith('/api/admin')) return next();
            return res.status(503).json({ status: 'fail', message: 'System is currently under maintenance. Please try again later.', endTime });
        }

        next();
    } catch (error) { next(error); }
};

/**
 * 2. NoSQL Injection Protection
 */
const sanitize = (obj) => {
    if (obj instanceof Object) {
        for (const key in obj) {
            if (key.startsWith('$') || key.includes('.')) delete obj[key];
            else if (obj[key] instanceof Object) sanitize(obj[key]);
        }
    }
    return obj;
};

const sanitizationMiddleware = (req, res, next) => {
    if (req.body) sanitize(req.body);
    if (req.params) sanitize(req.params);
    if (req.query) {
        try {
            req.query = sanitize({ ...req.query });
        } catch (e) {
            for (const key in req.query) {
                if (key.startsWith('$') || key.includes('.')) delete req.query[key];
                else if (req.query[key] instanceof Object) sanitize(req.query[key]);
            }
        }
    }
    next();
};

/**
 * 3. Rate Limiters
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // Scaled for high-interactivity SPA with polling
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests from this IP, please try again after 15 minutes' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

module.exports = {
    securityMiddleware,
    sanitizationMiddleware,
    apiLimiter,
    authLimiter
};
