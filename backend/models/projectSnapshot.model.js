const mongoose = require('mongoose');

/**
 * 🏛️ ProjectSnapshot Model
 * Stores daily forensic metrics for a project to allow long-term tracking 
 * after raw audit logs are purged. (Data Warehouse Pattern)
 */

const projectSnapshotSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    phi: {
        type: Number,
        required: true,
        description: 'Project Health Index'
    },
    chaosIndex: {
        type: Number,
        default: 0
    },
    velocity: {
        type: Number,
        default: 0,
        description: 'Tasks completed on this day'
    },
    pointsCompleted: {
        type: Number,
        default: 0
    },
    mttrData: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
    },
    memberActivity: {
        type: Map,
        of: Number,
        description: 'Points per member on this day'
    }
}, {
    timestamps: true
});

// Compound index for fast time-series retrieval
projectSnapshotSchema.index({ project: 1, date: -1 });

// Ensure we only have one snapshot per project per day
projectSnapshotSchema.index({ project: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ProjectSnapshot', projectSnapshotSchema);
