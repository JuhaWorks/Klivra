const cron = require('node-cron');
const User = require('../models/user.model');
const logger = require('../utils/logger');

// Run every night at 3:00 AM
const startGarbageCollection = () => {
    cron.schedule('0 3 * * *', async () => {
        logger.info('🗑️ Starting Database Garbage Collection...');
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // 1. Purge Unverified Users
            const userResult = await User.deleteMany({
                isEmailVerified: false,
                role: { $ne: 'Admin' },
                createdAt: { $lt: twentyFourHoursAgo }
            });

            if (userResult.deletedCount > 0) {
                logger.info(`✅ GC: Purged ${userResult.deletedCount} unverified zombie accounts.`);
            }

            // 2. Purge Stale Audit Logs (Security Hardening: Clear logs older than 24 hours as requested)
            const Audit = require('../models/audit.model');
            const auditResult = await Audit.deleteMany({
                createdAt: { $lt: twentyFourHoursAgo }
            });

            if (auditResult.deletedCount > 0) {
                logger.info(`✅ GC: Purged ${auditResult.deletedCount} stale audit log entries.`);
            }

            logger.info('✨ Garbage Collection Cycle Complete.');
        } catch (error) {
            logger.error(`❌ Garbage Collection Failed: ${error.message}`);
        }
    });

    logger.info('🕒 Garbage Collection Cron Job Initialized (Runs at 03:00 AM daily)');
};

module.exports = startGarbageCollection;
