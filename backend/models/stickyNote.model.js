const mongoose = require('mongoose');

const stickyNoteSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    x: {
        type: Number,
        default: 100
    },
    y: {
        type: Number,
        default: 100
    },
    width: {
        type: Number,
        default: 200
    },
    height: {
        type: Number,
        default: 200
    },
    color: {
        type: String,
        default: '#fef08a' // Yellow-200
    },
    votes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    zIndex: {
        type: Number,
        default: 1
    },
    pinnedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('StickyNote', stickyNoteSchema);
