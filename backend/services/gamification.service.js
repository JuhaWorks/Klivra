const User = require('../models/user.model');
const Audit = require('../models/audit.model');
const socketUtil = require('../utils/socket');
const logger = require('../utils/logger');

const LEVEL_THRESHOLDS = {
    1: 0,
    2: 50,
    3: 150,
    4: 300,
    5: 600,
    6: 1000,
    7: 1500,
    8: 2200,
    9: 3200,
    10: 4500
};
const getRequiredXP = (level) => LEVEL_THRESHOLDS[level] || (LEVEL_THRESHOLDS[10] + (level - 10) * 5000);
const calculateTaskXP = (task) => {
    let xp = 50; // Base XP for completing any task

    // Priority Bonus
    switch (task.priority) {
        case 'Medium': xp += 10; break;
        case 'High': xp += 25; break;
        case 'Urgent': xp += 50; break;
    }

    // Complexity Bonus
    if (task.points) {
        xp += (task.points * 5); // 1 pt = +5, 13 pts = +65
    }

    // Early Bird Bonus
    if (task.dueDate && new Date() < new Date(task.dueDate)) {
        const timeDiff = new Date(task.dueDate) - new Date();
        const daysEarly = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        if (daysEarly > 0) {
            xp += (Math.min(daysEarly, 5) * 10); // Max +50 for early completion
        }
    }

    return xp;
};

/**
 * Awards XP, handles Level Ups, and assigns Badges
 */
const awardXP = async (userId, xpEarned, sourceTask = null) => {
    try {
        console.log(`[GAMIFICATION] awardXP called for User ${userId} with XP ${xpEarned}`);
        const user = await User.findById(userId);
        if (!user) {
            console.warn(`[GAMIFICATION] User ${userId} NOT FOUND in awardXP`);
            return null;
        }

        // Initialize gamification nested properties safely
        if (!user.gamification) user.gamification = {};
        if (typeof user.gamification.xp !== 'number') user.gamification.xp = 0;
        if (typeof user.gamification.level !== 'number') user.gamification.level = 1;
        if (!Array.isArray(user.gamification.badges)) user.gamification.badges = [];
        if (!user.gamification.specialties) user.gamification.specialties = {};
        if (!user.gamification.streaks) user.gamification.streaks = { current: 0, longest: 0, lastActivity: null };
        if (!user.gamification.streaks.lastActivity) user.gamification.streaks.lastActivity = null;

        // --- 1. Streak Logic ---
        const now = new Date();
        const last = user.gamification.streaks.lastActivity;
        let streakMultiplier = 1;

        if (last) {
            const diffDays = Math.floor((now - new Date(last)) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                // Continued streak
                user.gamification.streaks.current += 1;
                if (user.gamification.streaks.current > user.gamification.streaks.longest) {
                    user.gamification.streaks.longest = user.gamification.streaks.current;
                }
            } else if (diffDays > 1) {
                // Streak broken
                user.gamification.streaks.current = 0;
            }
            // else diffDays === 0 (already active today), do nothing to streak count
        } else {
            user.gamification.streaks.current = 1;
            user.gamification.streaks.longest = 1;
        }

        user.gamification.streaks.lastActivity = now;

        // Apply multiplier (5% per streak day, max 50% bonus)
        streakMultiplier = Math.min(1.5, 1 + (user.gamification.streaks.current * 0.05));
        const finalXp = Math.round(xpEarned * streakMultiplier);

        const oldLevel = user.gamification.level;
        user.gamification.xp += finalXp;

        // --- 2. Specialty Logic ---
        if (sourceTask && sourceTask.type) {
            if (!user.gamification.specialties) user.gamification.specialties = {};
            const type = sourceTask.type;
            user.gamification.specialties[type] = (user.gamification.specialties[type] || 0) + finalXp;
        }

        // Check for Level Up
        let newLevel = oldLevel;
        let nextThreshold = getRequiredXP(newLevel + 1);

        while (user.gamification.xp >= nextThreshold) {
            newLevel++;
            nextThreshold = getRequiredXP(newLevel + 1);
        }

        const leveledUp = newLevel > oldLevel;
        if (leveledUp) {
            user.gamification.level = newLevel;
            logger.info(`User ${user.email} leveled up to ${newLevel}!`);

            // Auto-unlock frames at milestones
            if (!user.gamification.frames) user.gamification.frames = ['standard'];
            if (newLevel >= 5 && !user.gamification.frames.includes('bronze')) user.gamification.frames.push('bronze');
            if (newLevel >= 10 && !user.gamification.frames.includes('silver')) user.gamification.frames.push('silver');
            if (newLevel >= 25 && !user.gamification.frames.includes('gold')) user.gamification.frames.push('gold');
        }

        // Check for Badges conditionally
        let newBadge = null;
        if (sourceTask) {
            newBadge = await checkBadges(user, sourceTask);
            if (newBadge) {
                user.gamification.badges.push(newBadge);
            }
        }

        user.markModified('gamification');
        user.markModified('gamification.specialties');
        user.markModified('gamification.streaks');

        // Use UpdateOne to bypass expensive and brittle full-document validation on legacy accounts
        console.log(`[GAMIFICATION] Saving gamification state for ${user.email}. Level: ${user.gamification.level}, XP: ${user.gamification.xp}`);
        const saveRes = await User.updateOne(
            { _id: user._id },
            { $set: { gamification: user.gamification } }
        );
        console.log(`[GAMIFICATION] Save result: ${JSON.stringify(saveRes)}`);

        // Emit Socket Events for real-time frontend feedback
        const io = socketUtil.getIO();
        if (io) {
            // General XP Event
            io.to(userId.toString()).emit('gamification_update', {
                type: 'xp_gained',
                xpGained: finalXp,
                totalXP: user.gamification.xp,
                streak: user.gamification.streaks.current,
                taskId: sourceTask?._id
            });

            if (leveledUp) {
                // Global announcement or targeted
                io.emit('gamification_update', {
                    type: 'level_up',
                    userId: user._id,
                    name: user.name,
                    newLevel: newLevel
                });
            }

            if (newBadge) {
                io.to(userId.toString()).emit('gamification_update', {
                    type: 'badge_earned',
                    badge: newBadge
                });
            }
        }

        return {
            xpGained: xpEarned,
            totalXP: user.gamification.xp,
            leveledUp,
            newLevel,
            newBadge
        };

    } catch (error) {
        logger.error(`Gamification Engine Error (awardXP): ${error.message}`);
        return null;
    }
};

/**
 * Heuristic scan for milestone achievements.
 */
const checkBadges = async (user, task) => {
    const badges = user.gamification?.badges || [];
    const existingBadges = badges.map(b => b.name);

    if (task.type === 'Bug' && !existingBadges.includes('Bug Squasher')) {
        // Count total bugs squash by this user via Audit logs
        const bugCount = await Audit.countDocuments({
            user: user._id,
            action: 'StatusChange',
            'details.oldStatus': { $ne: 'Completed' },
            'details.newStatus': 'Completed',
            // Ideally we'd store type in audit, but as a heuristic, assume 10 completions are good enough 
            // Or query Task model for completed bugs assigned to user
        });

        // Accurate count via Task model
        const actualBugsFixed = await require('../models/task.model').countDocuments({
            assignee: user._id,
            type: 'Bug',
            status: 'Completed'
        });

        if (actualBugsFixed >= 10) { // Since this task is completing now, +1 is implied or already saved
            return {
                name: 'Bug Squasher',
                icon: 'bug-off',
                description: 'Resolved 10 Bug tasks.'
            };
        }
    }

    if (task.dueDate && new Date() < new Date(task.dueDate)) {
        const timeDiff = new Date(task.dueDate) - new Date();
        const daysEarly = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        if (daysEarly >= 3 && !existingBadges.includes('Early Bird')) {
            return {
                name: 'Early Bird',
                icon: 'bird', // Lucide equivalent maybe "sun" or "clock" if bird doesn't exist, we use feather
                description: 'Completed a task 3+ days before the deadline.'
            }
        }
    }
    return null;
};

/**
 * Revokes XP (and handles leveling down if necessary) when a task is moved FROM Complete to another status
 */
const revokeXP = async (userId, task) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.gamification || typeof user.gamification.xp !== 'number') return null;

        const xpToRevoke = calculateTaskXP(task);
        user.gamification.xp = Math.max(0, user.gamification.xp - xpToRevoke);

        if (task.type && user.gamification.specialties && user.gamification.specialties[task.type]) {
            user.gamification.specialties[task.type] = Math.max(0, user.gamification.specialties[task.type] - xpToRevoke);
        }

        // Check for Level Down
        let newLevel = user.gamification.level || 1;
        while (newLevel > 1 && user.gamification.xp < getRequiredXP(newLevel)) {
            newLevel--;
        }

        const leveledDown = newLevel < (user.gamification.level || 1);
        if (leveledDown) {
            user.gamification.level = newLevel;
            logger.info(`User ${user.email} leveled DOWN to ${newLevel}`);
        }

        await User.updateOne(
            { _id: user._id },
            { $set: { gamification: user.gamification } }
        );

        const io = socketUtil.getIO();
        if (io) {
            io.to(userId.toString()).emit('gamification_update', {
                type: 'xp_lost',
                xpLost: xpToRevoke,
                totalXP: user.gamification.xp,
                leveledDown,
                newLevel,
                taskId: task._id
            });
        }

        return { xpLost: xpToRevoke, totalXP: user.gamification.xp, leveledDown, newLevel };
    } catch (error) {
        logger.error(`Gamification Engine Error (revokeXP): ${error.message}`);
        return null;
    }
};

module.exports = {
    calculateTaskXP,
    awardXP,
    revokeXP
};
