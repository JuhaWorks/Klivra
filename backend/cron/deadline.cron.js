const cron = require('node-cron');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const notificationService = require('../services/notification.service');
const { logger } = require('../utils/system.utils');
const { PROJECT_ROLES, PROJECT_STATUSES, TASK_STATUSES, TASK_PRIORITIES, NOTIFICATION_TYPES } = require('../constants');

// ─── 1. Project Deadline Logic ──────────────────────────────────────────
const checkProjectDeadlines = async () => {
    try {
        const projects = await Project.find({
            status: { $in: [PROJECT_STATUSES.ACTIVE, 'Paused'] },
            deletedAt: null
        }).populate('members.userId', 'email name');

        const now = new Date();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        for (const project of projects) {
            if (!project.endDate) continue;
            const timeDiff = project.endDate.getTime() - now.getTime();
            const managers = project.members
                .filter(m => m.role === PROJECT_ROLES.MANAGER && m.userId)
                .map(m => m.userId);
            if (managers.length === 0) continue;

            // Exceeded
            if (timeDiff < 0 && !project.deadlineNotified?.exceeded) {
                for (const manager of managers) {
                    await notificationService.notify({
                        recipientId: manager._id || manager,
                        type: NOTIFICATION_TYPES.DEADLINE,
                        priority: TASK_PRIORITIES[3],
                        title: 'Deadline Exceeded',
                        message: `Critical: The deadline for project "${project.name}" has been exceeded.`,
                        link: `/projects/${project._id}/settings`,
                        metadata: { projectId: project._id, projectName: project.name }
                    });
                }
                project.deadlineNotified = { ...project.deadlineNotified, exceeded: true };
                await project.save();
            } 
            // Approaching
            else if (timeDiff > 0 && timeDiff <= threeDaysMs && !project.deadlineNotified?.approaching) {
                const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                for (const manager of managers) {
                    if (!manager) continue;
                    await notificationService.notify({
                        recipientId: manager._id || manager,
                        type: NOTIFICATION_TYPES.DEADLINE,
                        priority: TASK_PRIORITIES[2],
                        title: 'Deadline Approaching',
                        message: `Reminder: Project "${project.name}" is due in ${daysLeft} day(s).`,
                        link: `/projects/${project._id}/settings`,
                        metadata: { projectId: project._id, projectName: project.name }
                    });
                }
                project.deadlineNotified = { ...project.deadlineNotified, approaching: true };
                await project.save();
            }
        }
    } catch (err) {
        logger.error(`❌ Project Deadline Checker Error: ${err.message}`);
    }
};

// ─── 2. Task Deadline Logic ─────────────────────────────────────────────
const checkTaskDeadlines = async () => {
    try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const tasks = await Task.find({
            dueDate: { $gte: now, $lte: tomorrow },
            reminderSent: false,
            status: { $ne: TASK_STATUSES[2] },
            isArchived: false
        }).populate('project', 'name');

        for (const task of tasks) {
            if (!task.project) {
                logger.warn(`[DEADLINE] Skipping orphaned task ${task._id} (No project)`);
                continue;
            }
            const recipients = task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : []);
            for (const recipientId of recipients) {
                if (!recipientId) continue;
                await notificationService.notify({
                    recipientId: recipientId._id || recipientId,
                    type: NOTIFICATION_TYPES.DEADLINE,
                    priority: TASK_PRIORITIES[2],
                    title: 'Task Due Soon',
                    message: `Reminder: Your task "${task.title}" is due within 24 hours.`,
                    link: `/tasks?project=${task.project._id || task.project}`,
                    metadata: { taskId: task._id, taskName: task.title }
                });
            }
            task.reminderSent = true;
            await task.save();
        }
    } catch (err) {
        logger.error(`❌ Task Deadline Checker Error: ${err.message}`);
    }
};

// ─── Scheduler ─────────────────────────────────────────────────────────────
const startDeadlineHub = () => {
    // Project deadlines (Daily 00:00)
    cron.schedule('0 0 * * *', checkProjectDeadlines);
    
    // Task deadlines (Hourly)
    cron.schedule('0 * * * *', checkTaskDeadlines);

    if (process.env.NODE_ENV !== 'production') {
        logger.info('⏰ Deadline Hub (Dev Mode) - Frequent scans active');
        cron.schedule('* * * * *', () => {
            checkProjectDeadlines();
            checkTaskDeadlines();
        });
        setTimeout(() => { checkProjectDeadlines(); checkTaskDeadlines(); }, 5000);
    }
};

module.exports = startDeadlineHub;
module.exports.checkSingleProject = async (projectId) => {
    // Instant trigger logic for project updates
    const project = await Project.findById(projectId).populate('members.userId', 'email name');
    if (!project) return;
    // ... logic same as checkProjectDeadlines loop ...
};
