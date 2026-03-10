const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
    {
        entityType: {
            type: String,
            required: true,
            enum: ['Task', 'Project', 'User', 'Settings', 'Security', 'System'],
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false, // Make it optional for global system events
        },
        action: {
            type: String,
            required: true,
            enum: [
                'Create', 'Update', 'Delete', 'Deactivate', 'StatusChange',
                'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED', 'PROJECT_RESTORED',
                'MEMBER_ADDED', 'MEMBER_ROLE_UPDATED', 'MEMBER_REMOVED',
                'ROLE_UPDATED', 'USER_BANNED', 'USER_UNBANNED', 'FAILED_LOGIN',
                'MAINTENANCE_ENABLED', 'MAINTENANCE_DISABLED', 'IP_BLOCKED', 'IP_UNBLOCKED'
            ],
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        ipAddress: {
            type: String,
            default: 'Unknown'
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            description: 'The user who performed the action (null if system or unauthenticated)'
        }
    },
    {
        timestamps: true, // Auto adds createdAt timestamp
    }
);

// Explicit indexing for fast fetching of logs by Entity or by User
auditSchema.index({ entityId: 1, createdAt: -1 });
auditSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Audit', auditSchema);
