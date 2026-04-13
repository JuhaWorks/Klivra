const mongoose = require('mongoose');
const crypto = require('crypto');

const projectInvitationSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    invitedEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['Manager', 'Editor', 'Viewer'],
        default: 'Viewer'
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    }
}, {
    timestamps: true
});

// Index for TTL and lookup performance
projectInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
projectInvitationSchema.index({ invitedEmail: 1, projectId: 1 });

module.exports = mongoose.model('ProjectInvitation', projectInvitationSchema);
