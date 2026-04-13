const mongoose = require('mongoose');

const endorsementSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        skillName: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate endorsements (one user can endorse another user's skill only once)
endorsementSchema.index({ fromUser: 1, toUser: 1, skillName: 1 }, { unique: true });

// Optimize lookups for "Who endorsed this person for React?" or "What endorsements does John have?"
endorsementSchema.index({ toUser: 1, skillName: 1 });
endorsementSchema.index({ fromUser: 1 });

module.exports = mongoose.model('Endorsement', endorsementSchema);
