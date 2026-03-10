const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            enum: ['maintenance_mode', 'blocked_ips', 'security_stats'],
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
