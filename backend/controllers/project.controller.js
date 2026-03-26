const Project = require('../models/project.model');
const Audit = require('../models/audit.model');
const Task = require('../models/task.model');
const { logActivity } = require('../utils/activityLogger');
const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const ProjectMemberService = require('../services/projectMember.service');
const catchAsync = require('../utils/catchAsync');

// --- Core Project Operations ---

const getProjects = async (req, res, next) => {
    try {
        const showArchived = req.query.archived === 'true';
        const query = { 'members.userId': req.user._id };
        if (showArchived) query.deletedAt = { $ne: null };
        else query.deletedAt = null;

        const projects = await Project.find(query)
            .select('name description status category startDate endDate coverImageUrl members.userId')
            .sort('-createdAt')
            .lean();

        res.status(200).json({ status: 'success', results: projects.length, data: projects });
    } catch (error) { next(error); }
};

const getProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('members.userId', 'name email avatar')
            .lean();

        if (!project || project.deletedAt !== null) {
            res.status(404);
            throw new Error('Project not found or has been deleted.');
        }

        const isMember = project.members.some(m => m.userId?._id.toString() === req.user._id.toString());
        if (!isMember && req.user.role !== 'Admin') {
            res.status(403);
            throw new Error('Access denied. You are not a member of this project.');
        }

        res.status(200).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const createProject = async (req, res, next) => {
    try {
        const { name, description, category, startDate, endDate } = req.body;
        const project = await Project.create({
            name, description, category, startDate, endDate,
            members: [{ userId: req.user._id, role: 'Manager' }]
        });
        await logActivity(project._id, req.user._id, 'PROJECT_CREATED', { name });
        res.status(201).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const updateProject = async (req, res, next) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, deletedAt: null });
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        if (req.body.coverImageUrl !== undefined && req.body.coverImageUrl !== project.coverImageUrl) {
            if (project.coverImageId) {
                try {
                    await cloudinary.uploader.destroy(project.coverImageId);
                    if (!req.body.coverImageId) project.coverImageId = null;
                } catch (err) { logger.error(`Cloudinary Cleanup Error: ${err.message}`); }
            }
        }

        Object.keys(req.body).forEach(key => {
            if (['name', 'description', 'category', 'startDate', 'endDate', 'status', 'coverImageUrl', 'coverImageId'].includes(key)) {
                if (key === 'endDate') {
                    const oldDate = project.endDate ? new Date(project.endDate).getTime() : 0;
                    const newDate = new Date(req.body[key]).getTime();
                    if (oldDate !== newDate) {
                        project.deadlineNotified = { approaching: false, approachingDismissedBy: [], exceeded: false, exceededDismissedBy: [] };
                    }
                }
                project[key] = req.body[key];
            }
        });

        try {
            await project.save();
        } catch (saveError) {
            if (saveError.name === 'VersionError') {
                res.status(409);
                throw new Error('Concurrency Conflict: This project was updated by another user.');
            }
            throw saveError;
        }

        await logActivity(project._id, req.user._id, 'PROJECT_UPDATED', req.body);
        req.io.to(`project_${project._id}`).emit('projectUpdated', { id: project._id, update: req.body });
        req.io.to(`project_${project._id}`).emit('projectActivity', { userName: req.user.name, action: 'updated the project details' });

        res.status(200).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) { res.status(404); throw new Error('Project not found'); }
        project.deletedAt = Date.now();
        project.status = 'Archived';
        await project.save();
        await logActivity(project._id, req.user._id, 'PROJECT_DELETED', { name: project.name, ipAddress: req.ip }, 'Security');
        res.status(200).json({ status: 'success', message: 'Project moved to trash' });
    } catch (error) { next(error); }
};

const restoreProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) { res.status(404); throw new Error('Project not found'); }
        project.deletedAt = null;
        project.status = 'Active';
        await project.save();
        await logActivity(project._id, req.user._id, 'PROJECT_RESTORED');
        res.status(200).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const uploadProjectImage = async (req, res, next) => {
    try {
        if (!req.file) { res.status(400); throw new Error('Please upload an image file'); }
        const project = await Project.findById(req.params.id);
        if (!project) { res.status(404); throw new Error('Project not found'); }
        if (project.coverImageId) await cloudinary.uploader.destroy(project.coverImageId);
        project.coverImageUrl = req.file.path;
        project.coverImageId = req.file.filename;
        await project.save();
        await logActivity(project._id, req.user._id, 'PROJECT_UPDATED', { coverImageUrl: project.coverImageUrl });
        req.io.to(`project_${project._id}`).emit('projectUpdated', { id: project._id, update: { coverImageUrl: project.coverImageUrl } });
        req.io.to(`project_${project._id}`).emit('projectActivity', { userName: req.user.name, action: 'changed the project cover image' });
        res.status(200).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const dismissDeadlineAlert = async (req, res, next) => {
    try {
        const { type } = req.body;
        if (!['approaching', 'exceeded'].includes(type)) { res.status(400); throw new Error('Invalid alert type'); }
        const updateField = type === 'approaching' ? 'deadlineNotified.approachingDismissedBy' : 'deadlineNotified.exceededDismissedBy';
        const project = await Project.findOneAndUpdate({ _id: req.params.id }, { $addToSet: { [updateField]: req.user._id } }, { new: true });
        if (!project) { res.status(404); throw new Error('Project not found'); }
        res.status(200).json({ status: 'success', message: 'Alert dismissed' });
    } catch (error) { next(error); }
};

// --- Activity & Analytics ---

const getProjectActivity = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const logs = await Audit.find({ entityId: req.params.id, entityType: 'Project' })
            .populate('user', 'name email avatar')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Audit.countDocuments({ entityId: req.params.id, entityType: 'Project' });
        res.status(200).json({ status: 'success', results: logs.length, total, data: logs });
    } catch (error) { next(error); }
};

const getProjectInsights = async (req, res, next) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const insights = await Project.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: 'activities',
                    let: { projectId: '$_id' },
                    pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$projectId', '$$projectId'] }, { $gte: ['$createdAt', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)] }] } } }],
                    as: 'recentActivities'
                }
            },
            {
                $project: {
                    name: 1, endDate: 1, status: 1,
                    daysRemaining: { $ceil: { $divide: [{ $subtract: ['$endDate', now] }, 1000 * 60 * 60 * 24] } },
                    activityVelocity: { $size: '$recentActivities' },
                    healthScore: { $switch: { branches: [{ case: { $lt: [{ $subtract: ['$endDate', now] }, 0] }, then: 'Overdue' }, { case: { $lt: [{ $subtract: ['$endDate', now] }, 7 * 24 * 60 * 60 * 1000] }, then: 'At Risk' }], default: 'On Track' } }
                }
            }
        ]);
        if (!insights?.length) { res.status(404); throw new Error('Project insights not found'); }
        res.status(200).json({ status: 'success', data: insights[0] });
    } catch (error) { next(error); }
};

const getWorkspaceStats = async (req, res, next) => {
    try {
        const projects = await Project.find({ 'members.userId': req.user._id, deletedAt: null });
        const projectIds = projects.map(p => p._id);
        const taskStats = await Task.aggregate([
            { $match: { project: { $in: projectIds } } },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
                    inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
                    pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } }
                }
            }
        ]);
        const stats = taskStats[0] || { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, pendingTasks: 0 };
        res.status(200).json({
            status: 'success',
            data: {
                activeProjects: projects.filter(p => p.status === 'Active').length,
                totalProjects: projects.length,
                totalTasks: stats.totalTasks,
                completedTasks: stats.completedTasks,
                inProgressTasks: stats.inProgressTasks,
                pendingTasks: stats.pendingTasks,
                completionPct: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
            }
        });
    } catch (error) { next(error); }
};

// --- Member Management ---

const addMember = catchAsync(async (req, res) => {
    const result = await ProjectMemberService.addMember({ projectId: req.params.id, email: req.body.email, role: req.body.role, actorId: req.user._id, io: req.io });
    res.status(200).json(result);
});

const updateMemberRole = catchAsync(async (req, res) => {
    const result = await ProjectMemberService.updateMemberRole({ projectId: req.params.id, userId: req.params.userId, role: req.body.role, actorId: req.user._id, io: req.io });
    res.status(200).json(result);
});

const removeMember = catchAsync(async (req, res) => {
    const result = await ProjectMemberService.removeMember({ projectId: req.params.id, userId: req.params.userId, actorId: req.user._id, io: req.io });
    res.status(200).json(result);
});

// --- Search ---

const globalSearch = async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ status: 'error', message: 'Search query is required' });
        const userProjects = await Project.find({ "members.userId": req.user._id }).select('_id').lean();
        const projectIds = userProjects.map(p => p._id);

        const tasksPromise = Task.find({ $text: { $search: query }, project: { $in: projectIds } }, { score: { $meta: "textScore" } })
            .sort({ score: { $meta: "textScore" } }).populate('project', 'name').limit(10).lean();

        const projectsPromise = Project.find(
            req.user.role === 'Admin' ? { $text: { $search: query } } : { $text: { $search: query }, "members.userId": req.user._id },
            { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(5).lean();

        const [tasks, projects] = await Promise.all([tasksPromise, projectsPromise]);
        res.status(200).json({ status: 'success', data: { tasks, projects } });
    } catch (err) { next(err); }
};

module.exports = {
    getProjects, getProject, createProject, updateProject, deleteProject, restoreProject,
    uploadProjectImage, dismissDeadlineAlert, getProjectActivity, getProjectInsights,
    getWorkspaceStats, addMember, updateMemberRole, removeMember, globalSearch
};
