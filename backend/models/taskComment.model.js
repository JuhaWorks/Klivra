const mongoose = require('mongoose');

const taskCommentSchema = new mongoose.Schema(
    {
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: [true, 'Comment must belong to a task'],
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Comment must have an author'],
        },
        content: {
            type: String,
            required: [true, 'Comment content is required'],
            trim: true,
            maxlength: [2000, 'Comment can not be more than 2000 characters'],
        },
        mentions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            }
        ],
        attachments: [
            {
                url: String,
                name: String,
                fileType: String
            }
        ]
    },
    {
        timestamps: true,
    }
);

// Indexes for fast lookup
taskCommentSchema.index({ task: 1, createdAt: -1 });
taskCommentSchema.index({ user: 1 });

module.exports = mongoose.model('TaskComment', taskCommentSchema);
