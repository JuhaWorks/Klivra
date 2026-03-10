const cron = require('node-cron');
const User = require('../models/user.model');
const logger = require('../utils/logger');

// Run every night at 3:00 AM
const startGarbageCollection = () => {
    cron.schedule('0 3 * * *', async () => {
        logger.info('🗑️ Starting Database Garbage Collection for Unverified Users...');
        try {
            // Find users who have not verified their email AND whose account is older than 24 hours
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const result = await User.deleteMany({
                isEmailVerified: false,
                role: { $ne: 'Admin' },
                createdAt: { $lt: twentyFourHoursAgo }
            });

            if (result.deletedCount > 0) {
                logger.info(`✅ Garbage Collection Complete: Purged ${result.deletedCount} unverified zombie accounts.`);
            } else {
                logger.info('✅ Garbage Collection Complete: No stale accounts found.');
            }
        } catch (error) {
            logger.error(`❌ Garbage Collection Failed: ${error.message}`);
        }
    });

    logger.info('🕒 Garbage Collection Cron Job Initialized (Runs at 03:00 AM daily)');
};

module.exports = startGarbageCollection;
