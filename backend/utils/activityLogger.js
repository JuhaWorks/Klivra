const ProjectActivity = require('../models/projectActivity.model');
const Audit = require('../models/audit.model');
const logger = require('./logger');

/**
 * Global Activity Logger Helper
 * Logs to general Audit collection, and optionally to ProjectActivity if projectId is provided
 */
const logActivity = async (projectId, actorId, action, metadata = {}, entityType = 'Project', entityId = null) => {
    try {
        // 1. Log to Project-Specific Activity (only if projectId exists)
        if (projectId) {
            await ProjectActivity.create({
                projectId,
                actorId,
                action,
                metadata
            });
        }

        // 2. Log to Global Audit Trail
        // Priority for entityType: 
        // 1. Explicitly provided entityType (unless it's 'Project' and projectId is missing)
        // 2. 'Project' if projectId is present
        // 3. 'User' as generic fallback
        const finalEntityType = entityType !== 'Project' ? entityType : (projectId ? 'Project' : 'User');

        await Audit.create({
            user: actorId,
            action,
            entityType: finalEntityType,
            entityId: projectId || entityId || actorId, // Fallback to actor if no target
            details: metadata || {},
            ipAddress: metadata.ipAddress || 'System'
        });

        logger.info(`Activity Logged: ${action} by ${actorId}`);
    } catch (error) {
        logger.error(`Failed to log activity: ${error.message}`);
    }
};

/**
 * Specialized helper for security/system events
 */
const logSecurityEvent = (actorId, action, metadata) => {
    return logActivity(null, actorId, action, metadata, 'Security');
};

module.exports = { logActivity, logSecurityEvent };
