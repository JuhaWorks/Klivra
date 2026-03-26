const Audit = require('../models/audit.model');
const logger = require('./logger');

/**
 * Global Activity Logger Helper
 * Logs to general Audit collection
 */
const logActivity = async (projectId, actorId, action, metadata = {}, entityType = 'Project', entityId = null) => {
    try {
        // 1. Log to Global Audit Trail (Unified)

        // 2. Log to Global Audit Trail
        const finalEntityType = entityType !== 'Project' ? entityType : (projectId ? 'Project' : 'User');

        const auditEntry = await Audit.create({
            user: actorId,
            action,
            entityType: finalEntityType,
            entityId: projectId || entityId || actorId,
            details: metadata || {},
            ipAddress: metadata.ipAddress || 'System'
        });

        logger.info(`Activity Logged: ${action} by ${actorId}`);

        // 3. If this is a Security event, broadcast to all admins in real-time
        if (finalEntityType === 'Security') {
            try {
                const { getIO } = require('./socket');
                const io = getIO();
                // Populate the user field so the feed can render actor name
                const populated = await auditEntry.populate('user', 'name avatar');
                io.to('admin_security').emit('securityEvent', populated);
            } catch (socketErr) {
                // Socket may not be ready during tests / startup — non-fatal
                logger.warn(`Could not emit securityEvent via socket: ${socketErr.message}`);
            }
        }
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
