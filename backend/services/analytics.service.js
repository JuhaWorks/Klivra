const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Audit = require('../models/audit.model');
const ProjectSnapshot = require('../models/projectSnapshot.model');
const mongoose = require('mongoose');
const { TASK_STATUSES } = require('../constants');

/**
 * 🛰️ Analytics Service
 * Handles high-fidelity data aggregation and forensic persistence.
 */

const captureProjectSnapshots = async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    yesterday.setHours(0, 0, 0, 0);

    const projects = await Project.find({ status: { $ne: 'Archived' } });

    for (const project of projects) {
        try {
            const projectId = project._id;
            
            // 1. Fetch day's logs
            const dayLogs = await Audit.find({
                entityId: projectId,
                createdAt: { 
                    $gte: yesterday,
                    $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
                }
            }).lean();

            // 2. Fetch Tasks for PHI & MTTR context
            const tasks = await Task.find({ project: projectId, isArchived: false }).lean();
            if (tasks.length === 0) continue;

            // 3. Calculate Performance Metrics
            const activeTasks = tasks.filter(t => t.status !== TASK_STATUSES[2] && t.status !== TASK_STATUSES[3]);
            const completedTasks = tasks.filter(t => t.status === TASK_STATUSES[2]);
            
            // Progress (40%)
            const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 1), 0);
            const completedPoints = completedTasks.reduce((sum, t) => sum + (t.points || 1), 0);
            const progressScore = (completedPoints / (totalPoints || 1)) * 40;

            // Timeline (30%)
            const overdueCount = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < yesterday).length;
            const timelineScore = Math.max(0, (1 - (overdueCount / (activeTasks.length || 1))) * 30);

            // Chaos Index
            const dailyCompletions = dayLogs.filter(l => l.action === 'StatusChange' && l.details?.newStatus === TASK_STATUSES[2]).length;
            const chaosIndex = Math.min(100, Math.round((overdueCount * 3) + (dailyCompletions === 0 ? 10 : 0)));

            // Member Activity
            const memberActivity = {};
            dayLogs.filter(l => l.action === 'StatusChange' && l.details?.newStatus === TASK_STATUSES[2]).forEach(l => {
                const uid = l.user?.toString() || 'System';
                memberActivity[uid] = (memberActivity[uid] || 0) + 1;
            });

            // 4. Persistence Sweep
            await ProjectSnapshot.findOneAndUpdate(
                { project: projectId, date: yesterday },
                {
                    phi: Math.round(progressScore + timelineScore + 15 + 15), // Basic floor for stability
                    chaosIndex,
                    velocity: dailyCompletions,
                    pointsCompleted: 0, // Simplified for now
                    memberActivity
                },
                { upsert: true, new: true }
            );

        } catch (err) {
            console.error(`❌ Forensic Snapshot failed for project ${project._id}:`, err.message);
        }
    }
};

module.exports = {
    captureProjectSnapshots
};
