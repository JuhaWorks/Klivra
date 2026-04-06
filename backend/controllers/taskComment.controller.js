const TaskComment = require('../models/taskComment.model');
const Task = require('../models/task.model');
const Audit = require('../models/audit.model');

// @desc    Get all comments for a task
// @route   GET /api/tasks/:taskId/comments
// @access  Private
const getTaskComments = async (req, res, next) => {
    try {
        const comments = await TaskComment.find({ task: req.params.taskId })
            .populate('user', 'name email avatar')
            .sort('-createdAt')
            .lean();
        
        res.status(200).json({ status: 'success', data: comments });
    } catch (error) { next(error); }
};

// @desc    Add a comment to a task
// @route   POST /api/tasks/:taskId/comments
// @access  Private
const addTaskComment = async (req, res, next) => {
    try {
        const { content, mentions, attachments } = req.body;
        const taskId = req.params.taskId;

        const task = await Task.findById(taskId);
        if (!task) {
             res.status(404);
             throw new Error('Task not found');
        }

        const comment = await TaskComment.create({
            task: taskId,
            user: req.user._id,
            content,
            mentions,
            attachments
        });

        const populatedComment = await TaskComment.findById(comment._id).populate('user', 'name email avatar').lean();

        // Log in Audit system
        await Audit.create({
            entityType: 'Task',
            entityId: taskId,
            action: 'CommentAdded',
            details: {
                title: task.title,
                summary: `Added a comment: "${content.substring(0, 50)}..."`
            },
            user: req.user._id,
            ipAddress: req.ip || 'Unknown'
        });

        res.status(201).json({ status: 'success', data: populatedComment });
    } catch (error) { next(error); }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId
// @access  Private
const deleteTaskComment = async (req, res, next) => {
    try {
        const comment = await TaskComment.findById(req.params.commentId);
        if (!comment) {
            res.status(404);
            throw new Error('Comment not found');
        }

        // Only author or admin can delete
        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            res.status(401);
            throw new Error('Not authorized to delete this comment');
        }

        await comment.deleteOne();
        res.status(200).json({ status: 'success', data: {} });
    } catch (error) { next(error); }
};

module.exports = {
    getTaskComments,
    addTaskComment,
    deleteTaskComment
};
