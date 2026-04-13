const mongoose = require('mongoose');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const ProjectSnapshot = require('../models/projectSnapshot.model');
const logger = require('../utils/logger');

/**
 * 📅 Intelligence Snapshotter
 * Captures daily project metrics for historical analysis (Burn-down, Velocity, etc.)
 */
const captureGlobalSnapshots = async () => {
    logger.info('🚀 Starting Daily Intelligence Snapshot process...');
    
    try {
        const activeProjects = await Project.find({ deletedAt: null }).select('_id name');
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Normalize to start of day

        for (const project of activeProjects) {
            try {
                // 1. Fetch Task Context
                const tasks = await Task.find({ project: project._id, isArchived: false }).select('status updatedAt createdAt actualTime').lean();
                
                const completedToday = tasks.filter(t => 
                    t.status === 'Completed' && 
                    t.updatedAt >= now
                ).length;

                const totalTasks = tasks.length;
                const activeTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled').length;

                // 2. Member Workload (Tasks per member)
                const memberActivity = {};
                // (Optional: can be expanded if needed)

                // 3. Create or Update Snapshot
                await ProjectSnapshot.findOneAndUpdate(
                    { project: project._id, date: now },
                    {
                        project: project._id,
                        date: now,
                        phi: 100, // Legacy compatible
                        chaosIndex: 0, // Legacy compatible
                        velocity: completedToday,
                        pointsCompleted: totalTasks - activeTasks, // Used as 'Total Progress'
                        // Store the state for burn-down
                        mttrData: [{
                            label: 'Tasks Remaining',
                            value: activeTasks
                        }, {
                            label: 'Total Tasks',
                            value: totalTasks
                        }]
                    },
                    { upsert: true, returnDocument: 'after' }
                );

                logger.debug(`✅ Snapshot recorded for project: ${project.name}`);
            } catch (err) {
                logger.error(`❌ Failed snapshot for project ${project._id}: ${err.message}`);
            }
        }

        logger.info('🏁 Daily Intelligence Snapshot process completed.');
    } catch (error) {
        logger.error(`💥 Critical failure in Snapshotter: ${error.message}`);
    }
};

const startSnapshotCron = () => {
    // In production, this would be a real cron job (e.g., node-cron)
    // For now, we'll keep it as an exported function that can be called by server.js
    logger.info('📅 Intelligence Snapshotter initialized.');
    
    // We can also trigger an initial run if the DB is empty (optional)
};

module.exports = {
    captureGlobalSnapshots,
    startSnapshotCron
};
