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
            enum: ['Pending', 'In Progress', 'Completed'],
            default: 'Pending',
        },
        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Urgent'],
            default: 'Medium',
        },
        // Reference to the user assigned to the task
        assignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Reference to the project the task belongs to
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: [true, 'Task must belong to a project'],
        },
    },
    {
        timestamps: true,
    }
);

// Optimize queries for finding tasks inside a project or assigned to a specific user
taskSchema.index({ project: 1, assignee: 1 });

// Add $text index for Global Search weighting
taskSchema.index(
    { title: 'text', description: 'text', status: 'text' },
    { name: "TaskTextIndex", weights: { title: 10, description: 5, status: 2 } }
);

module.exports = mongoose.model('Task', taskSchema);
