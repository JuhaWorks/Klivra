const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            }
        ],
        type: {
            type: String,
            enum: ['private', 'group'],
            default: 'private',
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            default: null,
            index: true
        },
        name: {
            type: String, // Only for group chats (defaults to Project Name)
            trim: true
        },
        avatar: {
            type: String, // Project cover image or custom icon
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null,
        },
        unreadCounts: {
            type: Map,
            of: Number,
            default: () => new Map()
        },
        clearedAt: {
            type: Map,
            of: Date,
            default: () => new Map()
        },
        deletedAt: {
            type: Map,
            of: Date,
            default: () => new Map()
        }
    },
    {
        timestamps: true,
    }
);

// Index for getting a user's chats fast
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
