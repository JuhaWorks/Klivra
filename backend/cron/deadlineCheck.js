const cron = require('node-cron');
const Project = require('../models/project.model');
const User = require('../models/user.model');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');

// ── Shared core logic ────────────────────────────────────────────────────────
// Evaluates a single project and sends emails if deadlines are triggered.
// Used by both the daily cron AND the instant trigger on project update.
const checkProjectDeadline = async (project) => {
    if (!project.endDate) return 0;
    if (!['Active', 'Paused'].includes(project.status)) return 0;
    if (project.deletedAt) return 0;

    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const timeDiff = project.endDate.getTime() - now.getTime();
    let emailsSent = 0;

    const managerRefs = project.members
        .filter(m => m.role === 'Manager')
        .map(m => m.userId);

    if (managerRefs.length === 0) return 0;

    // Auto-resolve if not already populated with email/name
    const needsPopulate = managerRefs.some(m => typeof m === 'string' || !m.email);
    const managers = needsPopulate
        ? await User.find({ _id: { $in: managerRefs } }).select('email name')
        : managerRefs;

    // 1. Exceeded Deadline
    if (timeDiff < 0 && !project.deadlineNotified?.exceeded) {
        for (const manager of managers) {
            await sendEmail({
                to: manager.email,
                subject: `🚨 Deadline Exceeded: Project "${project.name}"`,
                html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">Project Deadline Exceeded</h2>
                    <p>Hi ${manager.name},</p>
                    <p>This is a critical alert to inform you that the deadline for <strong>${project.name}</strong> has officially been exceeded.</p>
                    <p>Please log in to your dashboard immediately to either <strong>Extend the Deadline</strong> or <strong>Archive the Project</strong>.</p>
                    <br/>
                    <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
                </div>
                `
            });
            emailsSent++;
        }
        project.deadlineNotified = { ...project.deadlineNotified, exceeded: true };
        await project.save();
        return emailsSent;
    }

    // 2. Approaching Deadline (<= 3 days)
    if (timeDiff > 0 && timeDiff <= threeDaysMs && !project.deadlineNotified?.approaching) {
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        for (const manager of managers) {
            await sendEmail({
                to: manager.email,
                subject: `⏳ Deadline Approaching: Project "${project.name}"`,
                html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f59e0b;">Project Deadline Approaching</h2>
                    <p>Hi ${manager.name},</p>
                    <p>This is a friendly reminder that the deadline for <strong>${project.name}</strong> is in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
                    <p>Log in to your dashboard to review its status.</p>
                    <br/>
                    <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
                </div>
                `
            });
            emailsSent++;
        }
        project.deadlineNotified = { ...project.deadlineNotified, approaching: true };
        await project.save();
    }

    return emailsSent;
};

// ── Instant single-project check ─────────────────────────────────────────────
// Called immediately after a project is updated (endDate or status change).
// Does NOT scan the whole database — only checks the affected project.
const checkSingleProject = async (projectId) => {
    try {
        const project = await Project.findById(projectId)
            .populate('members.userId', 'email name');
        if (!project) return;
        const sent = await checkProjectDeadline(project);
        if (sent > 0) {
            logger.info(`⏰ Instant deadline check for "${project.name}": sent ${sent} email(s).`);
        }
    } catch (err) {
        logger.error(`❌ Instant deadline check failed for ${projectId}: ${err.message}`);
    }
};

// ── Full scan (used by cron) ──────────────────────────────────────────────────
const checkDeadlines = async () => {
    try {
        const projects = await Project.find({
            status: { $in: ['Active', 'Paused'] },
            deletedAt: null
        }).populate('members.userId', 'email name');

        let emailsSent = 0;
        let successCount = 0;
        let failCount = 0;

        for (const project of projects) {
            try {
                const count = await checkProjectDeadline(project);
                emailsSent += count;
                successCount++;
            } catch (err) {
                failCount++;
                logger.error(`❌ Error checking deadline for project ${project._id}: ${err.message}`);
            }
        }

        if (emailsSent > 0 || failCount > 0) {
            logger.info(`⏰ Deadline Checker: Processed ${successCount} projects, ${failCount} failed. Total emails: ${emailsSent}.`);
        }
    } catch (error) {
        logger.error(`❌ Global Deadline Checker Error: ${error.message}`);
    }
};

// ── Cron scheduler ────────────────────────────────────────────────────────────
const startDeadlineChecker = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', () => {
        logger.info('⏰ Running daily project deadline checks...');
        checkDeadlines();
    });

    // In development: run every minute + immediately on boot for easy testing
    if (process.env.NODE_ENV !== 'production') {
        logger.info('⏰ Deadline Checker Service active (Dev Mode) - Running every minute for testing');
        cron.schedule('* * * * *', checkDeadlines);
        setTimeout(checkDeadlines, 2000);
    }
};

module.exports = startDeadlineChecker;
module.exports.checkSingleProject = checkSingleProject;
