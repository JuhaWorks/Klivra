const cron = require('node-cron');
const fs = require('fs').promises;
const { existsSync } = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Generic System Scavenger:
// Removes redundant files from public/temp, uploads, or logs that aren't used for 7 days.
const startRedundancyCleanup = () => {
    // Run every Sunday at 04:00 AM
    cron.schedule('0 4 * * 0', async () => {
        logger.info('🧹 Starting Weekly Redundancy Cleanup (Filesystem)...');
        
        // Target directories for temporary/redundant data
        const cleanupTargets = [
            path.join(__dirname, '../public/temp'),
            path.join(__dirname, '../uploads'),
            path.join(__dirname, '../tmp')
        ];

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        for (const targetDir of cleanupTargets) {
            if (existsSync(targetDir)) {
                try {
                    const files = await fs.readdir(targetDir);
                    let deletedCount = 0;

                    for (const file of files) {
                        const filePath = path.join(targetDir, file);
                        const stats = await fs.stat(filePath);

                        // If file/folder hasn't been modified in 7 days, it's redundant
                        if (stats.mtimeMs < sevenDaysAgo) {
                            if (stats.isDirectory()) {
                                await fs.rm(filePath, { recursive: true, force: true });
                            } else {
                                await fs.unlink(filePath);
                            }
                            deletedCount++;
                        }
                    }

                    if (deletedCount > 0) {
                        logger.info(`✅ Cleaned up ${deletedCount} redundant files from ${path.basename(targetDir)}`);
                    }
                } catch (err) {
                    logger.error(`❌ Cleanup failed for ${targetDir}: ${err.message}`);
                }
            }
        }
        
        logger.info('✨ Weekly Redundancy Cleanup Complete.');
    });

    logger.info('🕒 Redundancy Cleanup Job Initialized (Weekly @ Sunday 04:00 AM)');
};

module.exports = startRedundancyCleanup;
