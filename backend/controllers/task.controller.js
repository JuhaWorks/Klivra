const Task = require('../models/task.model');
const Project = require('../models/project.model');
const Audit = require('../models/audit.model');
const socket = require('../utils/socket');

const getTasks = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        let query = { isArchived: false };

        if (projectId) {
            const project = await Project.findById(projectId).lean();
            if (!project) {
                res.status(404);
                throw new Error('Project not found');
            }

            // Verify user is in project
            const isMember = project.members.some(
                (member) => member.userId.toString() === req.user._id.toString()
            );

            if (!isMember && req.user.role !== 'Admin') {
                res.status(403);
                throw new Error('User not authorized to access tasks for this project');
            }
            query.project = projectId;
        } else {
            // "All Projects" logic: Find projects user is a member of
            const userProjects = await Project.find({
                'members.userId': req.user._id,
                isArchived: false
            }).select('_id').lean();
            
            const projectIds = userProjects.map(p => p._id);
            query.project = { $in: projectIds };
        }

        // Pagination setup
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100; // Larger limit for all projects
        const skip = (page - 1) * limit;

        const total = await Task.countDocuments(query);
        const tasks = await Task.find(query)
            .populate('assignees', 'name email avatar')
            .populate('assignee', 'name email avatar')
            .populate('watchers', 'name email avatar')
            .populate('project', 'name color') // Added project name for "All Projects" context
            .select('-__v')
            .sort('-updatedAt')
            .skip(skip)
            .limit(limit)
            .lean();

        // Migration logic on-the-fly for old tasks
        const migratedTasks = tasks.map(task => {
            if (task.assignee && (!task.assignees || task.assignees.length === 0)) {
                task.assignees = [task.assignee];
            }
            return task;
        });

        res.status(200).json({
            status: 'success',
            count: migratedTasks.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            data: migratedTasks,
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
        const { 
            title, description, status, priority, 
            assignee, assignees, type, points, 
            labels, dueDate, startDate, estimatedTime 
        } = req.body;
        
        req.body.project = req.params.projectId;

        const project = await Project.findById(req.params.projectId).lean();

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        const isMember = project.members.some(
            (m) => m.userId.toString() === req.user._id.toString()
        );

        if (!isMember && req.user.role !== 'Admin') {
            res.status(401);
            throw new Error('User not authorized to create a task in this project');
        }

        const projectEndDate = new Date(project.endDate);
        const now = new Date();
        
        if (now > projectEndDate) {
            res.status(403);
            throw new Error('Cannot add new tasks; the project deadline has already passed.');
        }

        if (dueDate && new Date(dueDate) > projectEndDate) {
            res.status(400);
            throw new Error('Task deadline cannot exceed the project end date.');
        }

        // Handle both single and multiple assignees for flexibility
        const taskAssignees = assignees || (assignee ? [assignee] : []);

        const task = await Task.create({
            title,
            description,
            status: status || 'Pending',
            priority: priority || 'Medium',
            assignees: taskAssignees,
            assignee: taskAssignees.length > 0 ? taskAssignees[0] : null, // Mirror first assignee for legacy mobile/client support
            type: type || 'Task',
            points: points || 1,
            labels: labels || [],
            dueDate: dueDate || null,
            startDate: startDate || null,
            estimatedTime: estimatedTime || 0,
            project: req.params.projectId
        });

        // Populate the new task for immediate UI usage
        const populatedTask = await Task.findById(task._id)
            .populate('assignees', 'name email avatar')
            .populate('project', 'name color')
            .lean();

        // Emit real-time WebSocket event
        socket.getIO().to(req.params.projectId).emit('taskUpdated', populatedTask);

        res.status(201).json({ status: 'success', data: populatedTask });
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

        const project = await Project.findById(task.project).lean();

        // Check if user is assigned to this task, or is a manager in the project
        const isAssignee = (task.assignees && task.assignees.some(a => a.toString() === req.user._id.toString())) || 
                         (task.assignee && task.assignee.toString() === req.user._id.toString());
        
        const isManager = project.members.some(
            (m) => m.userId.toString() === req.user._id.toString() && m.role === 'Manager'
        );

        if (!isAssignee && !isManager && req.user.role !== 'Admin') {
            res.status(401);
            throw new Error('User not authorized to update this task');
        }

        if (req.body.dueDate && new Date(req.body.dueDate) > new Date(project.endDate)) {
            res.status(400);
            throw new Error('Task deadline cannot exceed the project end date.');
        }

        const oldStatus = task.status;
        
        // Sync legacy assignee if assignees changed
        if (req.body.assignees) {
            req.body.assignee = req.body.assignees.length > 0 ? req.body.assignees[0] : null;
        }

        // Clean up dependencies if they are coming as IDs
        if (req.body.dependencies) {
            if (req.body.dependencies.blockedBy) task.dependencies.blockedBy = req.body.dependencies.blockedBy;
            if (req.body.dependencies.blocking) task.dependencies.blocking = req.body.dependencies.blocking;
            delete req.body.dependencies;
        }

        task = await Task.findByIdAndUpdate(req.params.id, { $set: { ...req.body, dependencies: task.dependencies } }, {
            new: true,
            runValidators: true,
        });

        // Log state changes
        const changes = [];
        if (req.body.status && oldStatus !== req.body.status) changes.push(`status to ${req.body.status}`);
        if (req.body.priority && task.priority !== req.body.priority) changes.push(`priority to ${req.body.priority}`);
        if (req.body.dueDate && task.dueDate !== req.body.dueDate) changes.push(`deadline to ${new Date(req.body.dueDate).toLocaleDateString()}`);

        if (changes.length > 0) {
            await Audit.create({
                entityType: 'Task',
                entityId: task._id,
                action: 'Update',
                details: {
                    title: task.title,
                    summary: `Updated ${changes.join(', ')}`,
                    oldStatus,
                    newStatus: req.body.status || oldStatus
                },
                user: req.user._id,
                ipAddress: req.ip || 'Unknown'
            });
        }

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

        const project = await Project.findById(task.project).lean();
        const isManager = project.members.some(
            (m) => m.userId.toString() === req.user._id.toString() && m.role === 'Manager'
        );

        if (!isManager && req.user.role !== 'Admin') {
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

const getTaskActivity = async (req, res, next) => {
    try {
        const logs = await Audit.find({ entityId: req.params.id, entityType: 'Task' })
            .populate('user', 'name email avatar')
            .sort('-createdAt')
            .limit(10)
            .lean();
        res.status(200).json({ status: 'success', data: logs });
    } catch (error) { next(error); }
};

module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskActivity
};
