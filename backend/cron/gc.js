const cron = require('node-cron');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const { captureProjectSnapshots } = require('../services/analytics.service');

// Run every night at 3:00 AM
const startGarbageCollection = () => {
    cron.schedule('0 3 * * *', async () => {
        logger.info('🗑️ Starting Database Garbage Collection & Forensic Snapshots...');
        try {
            // 0. CAPTURE FORENSIC SNAPSHOTS BEFORE PURGE
            // This ensures 180-day trends are maintained even if raw logs are purged.
            await captureProjectSnapshots();
            logger.info('🏛️ Forensic snapshots secured in warehouse.');

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // 1. Purge Unverified Users (24h standard)
            const userResult = await User.deleteMany({
                isEmailVerified: false,
                role: { $ne: 'Admin' },
                createdAt: { $lt: twentyFourHoursAgo }
            });

            if (userResult.deletedCount > 0) {
                logger.info(`✅ GC: Purged ${userResult.deletedCount} unverified zombie accounts.`);
            }

            // 2. Purge Stale Audit Logs (User requested 24h retention)
            const Audit = require('../models/audit.model');
            const auditResult = await Audit.deleteMany({
                createdAt: { $lt: twentyFourHoursAgo }
            });

            if (auditResult.deletedCount > 0) {
                logger.info(`✅ GC: Purged ${auditResult.deletedCount} stale audit log entries.`);
            }

            // 3. Purge Soft-Deleted/Archived Projects (> 7 days)
            const Project = require('../models/project.model');
            const Task = require('../models/task.model');
            
            // Find projects that were either soft-deleted or archived more than 7 days ago
            const staleProjects = await Project.find({
                $or: [
                    { deletedAt: { $lt: sevenDaysAgo, $ne: null } },
                    { status: 'Archived', updatedAt: { $lt: sevenDaysAgo } }
                ]
            }).select('_id');

            if (staleProjects.length > 0) {
                const projectIds = staleProjects.map(p => p._id);
                
                // Delete associated tasks
                const taskResult = await Task.deleteMany({ project: { $in: projectIds } });
                // Delete projects
                const projectResult = await Project.deleteMany({ _id: { $in: projectIds } });

                logger.info(`✅ GC: Permanently purged ${projectResult.deletedCount} stale projects and ${taskResult.deletedCount} associated tasks.`);
            }

            logger.info('✨ Garbage Collection Cycle Complete.');
        } catch (error) {
            logger.error(`❌ Garbage Collection Failed: ${error.message}`);
        }
    });

    logger.info('🕒 Garbage Collection Cron Job Initialized (Runs at 03:00 AM daily)');
};

module.exports = startGarbageCollection;
