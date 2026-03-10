const Task = require('../models/Task.model');
const Project = require('../models/project.model');
const socket = require('../utils/socket');

// @desc    Get all tasks for a project (with pagination & lean)
// @route   GET /api/projects/:projectId/tasks
// @access  Private
const getTasks = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.projectId).lean();

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Verify user is in project
        const isMember = project.teamMembers.some(
            (member) => member.user.toString() === req.user._id.toString()
        );

        if (!isMember && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('User not authorized to access tasks for this project');
        }

        // Pagination setup
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const skip = (page - 1) * limit;

        const total = await Task.countDocuments({ project: req.params.projectId });

        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignee', 'name email')
            .skip(skip)
            .limit(limit)
            .lean();

        res.status(200).json({
            status: 'success',
            count: tasks.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            data: tasks,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a task
// @route   POST /api/projects/:projectId/tasks
// @access  Private
const createTask = async (req, res, next) => {
    try {
        const { title, description, status, priority, assignee } = req.body;
        req.body.project = req.params.projectId;

        const project = await Project.findById(req.params.projectId);

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Only managers or admins can create tasks in this logic standard, but can adjust if needed
        const isMember = project.teamMembers.some(
            (m) => m.user.toString() === req.user._id.toString()
        );

        if (!isMember && req.user.role !== 'admin') {
            res.status(401);
            throw new Error('User not authorized to create a task in this project');
        }

        const task = await Task.create({
            title,
            description,
            status,
            priority,
            assignee,
            project: req.params.projectId
        });

        // Emit real-time WebSocket event
        socket.getIO().to(req.params.projectId).emit('taskUpdated', task);

        res.status(201).json({ status: 'success', data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        const project = await Project.findById(task.project);

        // Check if user is assigned to this task, or is a manager in the project
        const isAssignee = task.assignee && task.assignee.toString() === req.user._id.toString();
        const isManager = project.teamMembers.some(
            (m) => m.user.toString() === req.user._id.toString() && m.role === 'manager'
        );

        if (!isAssignee && !isManager && req.user.role !== 'admin') {
            res.status(401);
            throw new Error('User not authorized to update this task');
        }

        task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        // Emit real-time WebSocket event
        socket.getIO().to(task.project.toString()).emit('taskUpdated', task);

        res.status(200).json({ status: 'success', data: task });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            res.status(404);
            throw new Error('Task not found');
        }

        const project = await Project.findById(task.project);
        const isManager = project.teamMembers.some(
            (m) => m.user.toString() === req.user._id.toString() && m.role === 'manager'
        );

        if (!isManager && req.user.role !== 'admin') {
            res.status(401);
            throw new Error('User not authorized to delete this task');
        }

        await task.deleteOne();

        // Emit real-time WebSocket deletion signal (passing deleted ID)
        socket.getIO().to(task.project.toString()).emit('taskDeleted', task._id);

        res.status(200).json({ status: 'success', data: {} });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
};
