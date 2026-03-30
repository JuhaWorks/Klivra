const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending',
        },
        note: {
            type: String,
            maxlength: [300, 'Note cannot exceed 300 characters'],
            default: '',
        },
        labels: {
            type: [String],
            default: [],
            validate: {
                validator: (v) => v.length <= 5,
                message: 'Cannot have more than 5 labels',
            },
        },
        respondedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate requests in both directions
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Fast lookup for pending incoming requests
connectionSchema.index({ recipient: 1, status: 1 });

// Fast lookup for accepted connections
connectionSchema.index({ requester: 1, status: 1 });

// Pre-save validation: prevent self-connections
connectionSchema.pre('save', function () {
    if (this.requester.toString() === this.recipient.toString()) {
        throw new Error('You cannot connect with yourself');
    }
});

module.exports = mongoose.model('Connection', connectionSchema);
