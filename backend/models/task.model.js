const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a task title'],
            trim: true,
            maxlength: [100, 'Title can not be more than 100 characters'],
        },
        description: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            default: 'Pending',
            trim: true,
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Urgent'],
            default: 'Medium',
        },
        type: {
            type: String,
            default: 'Story',
        },
        domain: {
            type: String,
            enum: ['Strategic', 'Engineering', 'Sustainability', 'Operations'],
            default: 'Strategic',
        },
        points: {
            type: Number,
            default: 1,
        },
        // Support for multiple assignees
        assignees: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        // Backward compatibility fallback for migration
        assignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        watchers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        labels: [{
            type: String, // Label ID from project.kanbanConfig.availableLabels
        }],
        dependencies: {
            blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
            blocking: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }]
        },
        estimatedTime: { type: Number, default: 0 }, // In hours
        actualTime: { type: Number, default: 0 }, // In hours
        timeSessions: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            startedAt: { type: Date },
            endedAt: { type: Date },
            duration: { type: Number, default: 0 } // seconds
        }],
        startDate: { type: Date },
        dueDate: { type: Date },
        isRecurring: {
            enabled: { type: Boolean, default: false },
            frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
            nextOccurrence: { type: Date }
        },
        isArchived: { type: Boolean, default: false },
        reminderSent: { type: Boolean, default: false },
        // Reference to the project the task belongs to
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: [true, 'Task must belong to a project'],
        },
        subtasks: [
            {
                title: { type: String, required: true, trim: true },
                completed: { type: Boolean, default: false },
                id: { type: String, required: true }, // Internal ID for frontend tracking
                assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                dueDate: { type: Date, default: null },
                priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' }
            }
        ]
    },
    {
        timestamps: true,
    }
);

const { DOMAIN_MAPPING } = require('../utils/constants');

taskSchema.pre('save', function() {
    if (this.isModified('type') || this.isNew || !this.domain) {
        let foundDomain = 'Operations'; // Standard Executive Fallback
        for (const [domain, types] of Object.entries(DOMAIN_MAPPING)) {
            if (types.includes(this.type)) {
                foundDomain = domain;
                break;
            }
        }
        this.domain = foundDomain;
    }
});

// Optimize queries for finding tasks inside a project or assigned to a specific user
taskSchema.index({ project: 1, assignees: 1 });
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, priority: 1 });
taskSchema.index({ createdAt: -1 });

// Add $text index for Global Search weighting
taskSchema.index(
    { title: 'text', description: 'text', status: 'text' },
    { name: "TaskTextIndex", weights: { title: 10, description: 5, status: 2 } }
);

module.exports = mongoose.model('Task', taskSchema);
