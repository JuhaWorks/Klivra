const User = require('../models/user.model');
const Audit = require('../models/audit.model');
const { sendEmail, getIO } = require('../utils/service.utils');
const { logger } = require('../utils/system.utils');
const { DOMAIN_MAPPING, TASK_PRIORITIES, TASK_TYPES } = require('../constants');

const LEVEL_THRESHOLDS = {
    1: 0,
    2: 100,      // +100
    3: 300,      // +200
    4: 600,      // +300
    5: 1000,     // +400
    6: 1500,     // +500
    7: 2100,     // +600
    8: 2800,     // +700
    9: 3600,     // +800
    10: 4500     // +900
};

// Domains are defined in task.model.js and automated via pre-save hooks
// Now unified via utils/constants.js

/**
 * "Hard Mode" Exponential Scaling formula.
 * XP Required = Math.floor(100 * Math.pow(Level, 2.2))
 */
const getRequiredXP = (level) => {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(level, 2.2));
};

const calculateTaskXP = (task, context = {}) => {
    let baseXP = 60; // Standard Base XP
    let qualityXP = 0;
    let velocityXP = 0;
    let collabXP = 0;

    // 1. Quality Calculation (Priority & Complexity)
    let priorityBonus = 0;
    switch (task.priority) {
        case TASK_PRIORITIES[1]: priorityBonus = 15; break;
        case TASK_PRIORITIES[2]: priorityBonus = 40; break;
        case TASK_PRIORITIES[3]: priorityBonus = 85; break;
    }
    
    // Professional Multipliers: Higher stakes for Strategic and Architecture
    const typeMultipliers = { 
        [TASK_TYPES.EPIC]: 1.8, [TASK_TYPES.FEATURE]: 1.5, [TASK_TYPES.DISCOVERY]: 1.4, [TASK_TYPES.RESEARCH]: 1.35, [TASK_TYPES.STORY]: 1.2,
        [TASK_TYPES.REFACTOR]: 1.6, [TASK_TYPES.DEVOPS]: 1.5, [TASK_TYPES.QA]: 1.2, [TASK_TYPES.PERFORMANCE]: 1.4, [TASK_TYPES.TECHNICAL_DEBT]: 1.1,
        [TASK_TYPES.SECURITY]: 1.7, [TASK_TYPES.COMPLIANCE]: 1.4, [TASK_TYPES.BUG]: 1.3, [TASK_TYPES.MAINTENANCE]: 1.1, [TASK_TYPES.HYGIENE]: 1.0,
        [TASK_TYPES.REVIEW]: 1.3, [TASK_TYPES.MEETING]: 1.0, [TASK_TYPES.SUPPORT]: 1.1, [TASK_TYPES.ADMIN]: 0.8, [TASK_TYPES.TASK]: 1.0
    };

    qualityXP = Math.round((baseXP + priorityBonus) * (typeMultipliers[task.type] || 1.0));

    // 2. Velocity Calculation (Efficiency & Professionalism)
    if (task.estimatedTime > 0 && task.actualTime > 0) {
        const ratio = task.estimatedTime / task.actualTime;
        if (ratio > 1) {
            velocityXP += Math.round(baseXP * (Math.min(1.5, ratio) - 1)); // Capped for professional feel
        }
    }

    if (task.dueDate && new Date() < new Date(task.dueDate)) {
        const timeDiff = new Date(task.dueDate) - new Date();
        const daysEarly = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        if (daysEarly > 0) {
            velocityXP += (Math.min(daysEarly, 5) * 20); // Professional punctuality bonus
        }
    }

    // 3. Collaboration Calculation (Balanced "Synergy")
    const teamSize = task.assignees?.length || (task.assignee ? 1 : 0);
    if (teamSize > 1) {
        // Logarithmic scale: more members = diminishing returns to prevent inflation
        collabXP = Math.round(baseXP * Math.log2(teamSize) * 0.35);
    }

    const totalXP = qualityXP + velocityXP + collabXP;

    return { 
        totalXP, 
        breakdown: { qualityXP, velocityXP, collabXP, type: task.type || 'Task' }
    };
};

/**
 * Awards XP, handles Level Ups, and assigns Badges
 */
const awardXP = async (userId, xpData, sourceTask = null, context = {}) => {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        // Ensure matured gamification structure
        if (!user.gamification) user.gamification = {};
        if (typeof user.gamification.xp !== 'number') user.gamification.xp = 0;
        if (typeof user.gamification.level !== 'number') user.gamification.level = 1;
        
        // Ensure specialties Map exists
        if (!user.gamification.specialties || !(user.gamification.specialties instanceof Map)) {
            user.gamification.specialties = new Map([
                ['Strategic', 0], ['Engineering', 0], ['Sustainability', 0], ['Operations', 0]
            ]);
        }

        const stats = typeof xpData === 'number' ? { totalXP: xpData, breakdown: { qualityXP: xpData, velocityXP: 0, collabXP: 0, type: 'Manual' } } : xpData;

        // --- 1. Streak Logic ---
        if (!user.gamification.streaks) user.gamification.streaks = { current: 0, longest: 0, lastActivity: null };
        const now = new Date();
        const last = user.gamification.streaks.lastActivity;
        let milestoneBurst = 0;

        if (last) {
            const lastDate = new Date(last);
            const isToday = lastDate.toDateString() === now.toDateString();
            const isYesterday = new Date(now - 86400000).toDateString() === lastDate.toDateString();

            if (isYesterday) {
                user.gamification.streaks.current += 1;
                if (user.gamification.streaks.current > user.gamification.streaks.longest) {
                    user.gamification.streaks.longest = user.gamification.streaks.current;
                }
            } else if (!isToday) {
                user.gamification.streaks.current = 1;
            }
        } else {
            user.gamification.streaks.current = 1;
        }
        user.gamification.streaks.lastActivity = now;

        // --- 2. Multipliers ---
        let multiplier = 1;
        let rollResult = 'standard';
        if (sourceTask) {
            const roll = Math.random() * 100;
            if (roll > 99) { multiplier = 2.2; rollResult = 'legendary'; }
            else if (roll > 95) { multiplier = 1.5; rollResult = 'critical'; }
        }

        const finalXp = Math.round(stats.totalXP * multiplier) + milestoneBurst;
        const oldLevel = user.gamification.level;

        // Update Totals
        user.gamification.xp += finalXp;

        // Update Matured Specialty Axes
        if (sourceTask) {
            const q = Math.round(stats.breakdown.qualityXP * multiplier);
            const v = Math.round(stats.breakdown.velocityXP * multiplier);
            const s = Math.round(stats.breakdown.collabXP * multiplier);

            // Distribute Quality points to the task's automated domain
            let axis = sourceTask.domain;
            
            // --- Self-Healing Failover: If domain is missing, calculate on-the-fly ---
            if (!axis && sourceTask.type) {
                for (const [d, types] of Object.entries(DOMAIN_MAPPING)) {
                    if (types.includes(sourceTask.type)) {
                        axis = d;
                        break;
                    }
                }
            }

            if (axis) {
                const current = user.gamification.specialties.get(axis) || 0;
                user.gamification.specialties.set(axis, current + q);
            }

            // Reward Output Velocity and Synergy into the Operations Domain
            const currentOps = user.gamification.specialties.get('Operations') || 0;
            user.gamification.specialties.set('Operations', currentOps + v + s);
        }

        // --- 3. Level Check ---
        let newLevel = oldLevel;
        let nextThreshold = getRequiredXP(newLevel + 1);
        while (user.gamification.xp >= nextThreshold) {
            newLevel++;
            nextThreshold = getRequiredXP(newLevel + 1);
        }

        const leveledUp = newLevel > oldLevel;
        if (leveledUp) {
            user.gamification.level = newLevel;
            if (!user.gamification.frames) user.gamification.frames = ['standard'];
            if (newLevel >= 5 && !user.gamification.frames.includes('bronze')) user.gamification.frames.push('bronze');
            if (newLevel >= 10 && !user.gamification.frames.includes('silver')) user.gamification.frames.push('silver');
            if (newLevel >= 25 && !user.gamification.frames.includes('gold')) user.gamification.frames.push('gold');
        }

        user.markModified('gamification');
        // Explicit Save for Map Persistence
        await user.save();

        // Socket Announcements (Silent check for Background Scripts)
        try {
            const io = getIO();
            io.to(`user_${userId}`).emit('gamification_update', {
                type: leveledUp ? 'level_up' : 'xp_gained',
                xpGained: finalXp,
                rollResult,
                multiplier,
                newLevel: user.gamification.level,
                totalXP: user.gamification.xp
            });
        } catch (socketErr) {
            // Non-fatal — socket may not be initialized during startup snapshots
        }

        return { xpGained: finalXp, rollResult, leveledUp, newLevel };
    } catch (error) {
        logger.error(`Gamification Engine Error (awardXP): ${error.message}`);
        return null;
    }
};

/**
 * Revokes XP and Specialty Points (Reciprocal Balancing)
 */
const revokeXP = async (userId, task) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.gamification) return null;

        const stats = calculateTaskXP(task);
        const xpToRevoke = stats.totalXP;

        // Revoke Total XP
        user.gamification.xp = Math.max(0, user.gamification.xp - xpToRevoke);

        // Revoke Specialty Points
        if (!user.gamification.specialties || !(user.gamification.specialties instanceof Map)) {
            // Force initialization if missing or POJO (Plain Old JavaScript Object) from legacy data
            const specialtiesObj = user.gamification.specialties || {};
            user.gamification.specialties = new Map([
                ['Strategic', specialtiesObj.Strategic || 0],
                ['Engineering', specialtiesObj.Engineering || 0],
                ['Sustainability', specialtiesObj.Sustainability || 0],
                ['Operations', specialtiesObj.Operations || 0]
            ]);
        }

        const q = stats.breakdown.qualityXP;
        const v = stats.breakdown.velocityXP;
        const s = stats.breakdown.collabXP;

        // Distribute revocation based on domain
        let axis = task.domain;
        if (!axis && task.type) {
            for (const [d, types] of Object.entries(DOMAIN_MAPPING)) {
                if (types.includes(task.type)) {
                    axis = d;
                    break;
                }
            }
        }

        if (axis) {
            const current = user.gamification.specialties.get(axis) || 0;
            user.gamification.specialties.set(axis, Math.max(0, current - q));
        }

        // Revoke Velocity/Synergy from Operations
        const opsCurrent = user.gamification.specialties.get('Operations') || 0;
        user.gamification.specialties.set('Operations', Math.max(0, opsCurrent - v - s));

        // Re-calculate Level (Professional Reciprocal De-escalation)
        let newLevel = user.gamification.level || 1;
        while (newLevel > 1 && user.gamification.xp < getRequiredXP(newLevel)) {
            newLevel--;
        }
        user.gamification.level = newLevel;

        user.markModified('gamification');
        await user.save();
        
        // Socket Announcements for Loss (Transparency in Regression)
        try {
            const io = getIO();
            io.to(`user_${userId}`).emit('gamification_update', {
                type: 'xp_lost',
                xpLost: xpToRevoke,
                newLevel: user.gamification.level,
                totalXP: user.gamification.xp
            });
        } catch (socketErr) {
            // Non-fatal — socket may not be initialized
        }
        
        return { xpLost: xpToRevoke, totalXP: user.gamification.xp, newLevel };
    } catch (error) {
        logger.error(`Gamification Engine Error (revokeXP): ${error.message}`);
        return null;
    }
};

module.exports = {
    calculateTaskXP,
    awardXP,
    revokeXP,
    getRequiredXP,
    DOMAIN_MAPPING
};
