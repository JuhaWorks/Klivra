const Audit = require('../models/audit.model');
const logger = require('./logger');

/**
 * Global Activity Logger Helper
 * Logs to general Audit collection and broadcasts via Socket.io
 */
const logActivity = async (projectId, actorId, action, metadata = {}, entityType = 'Project', entityId = null) => {
    try {
        const finalEntityType = entityType !== 'Project' ? entityType : (projectId ? 'Project' : 'User');
        // Prioritize specific entityId over project context for accurate indexing
        let rawEntityId = entityId || projectId || actorId;
        const finalEntityId = (rawEntityId && typeof rawEntityId === 'object' && rawEntityId._id) ? rawEntityId._id : rawEntityId;

        const auditEntry = await Audit.create({
            user: actorId,
            action,
            entityType: finalEntityType,
            entityId: finalEntityId,
            details: metadata || {},
            ipAddress: metadata.ipAddress || 'System'
        });

        logger.info(`Activity Logged: ${action} by ${actorId}`);

        // Real-Time Broadcast Logic
        try {
            const { getIO } = require('./socket');
            const io = getIO();
            
            // Populate user data for the feed
            const populated = await auditEntry.populate('user', 'name avatar');

            if (finalEntityType === 'Security') {
                io.to('admin_security').emit('security_event', populated);
            } else if (projectId || finalEntityType === 'Project') {
                // Broadcast to project room
                io.to(`project_${projectId}`).emit('project_activity', populated);
                
                // Also broadcast a global high-level event for the Home page feed across multiple projects
                io.emit('workspace_activity', populated);
            }
        } catch (socketErr) {
            // Socket might not be ready — non-fatal
        }

        return auditEntry;
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
