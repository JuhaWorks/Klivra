const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false // Null for system notifications
        },
        type: {
            type: String,
            enum: ['Assignment', 'Mention', 'StatusUpdate', 'MetadataUpdate', 'Deadline', 'System', 'Chat'],
            required: true
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Urgent'],
            default: 'Medium',
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        message: {
            type: String,
            required: true
        },
        link: {
            type: String, // Full path like /tasks/:id or /projects/:id
            required: false
        },
        metadata: {
            taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
            projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true
        },
        isArchived: {
            type: Boolean,
            default: false
        },
        // For Daily Digest: Mark as "not yet emailed" if preference is 'digest'
        isEmailed: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Compound index for efficient inbox queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
