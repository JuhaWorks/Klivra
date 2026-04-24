const Project = require('../models/project.model');
const Audit = require('../models/audit.model');
const Task = require('../models/task.model');
const { logActivity } = require('../utils/system.utils');
const { cloudinary } = require('../config/cloudinary');
const { logger } = require('../utils/system.utils');
const mongoose = require('mongoose');
const ProjectMemberService = require('../services/projectMember.service');
const { ensureProjectChat } = require('./chat.controller');
const { catchAsync, getFrontendUrl } = require('../utils/core.utils');
const { checkSingleProject } = require('../cron/deadline.cron');
const { clearUserCache } = require('../utils/system.utils');
const notificationService = require('../services/notification.service');
const { TASK_STATUSES, TASK_PRIORITIES, PROJECT_ROLES, MEMBERSHIP_STATUS, NOTIFICATION_TYPES, PROJECT_STATUSES, AUDIT_LOG_TYPES, SYSTEM_MESSAGES } = require('../constants');

// --- Core Project Operations ---

const getProjects = async (req, res, next) => {
    try {
        const showArchived = req.query.archived === 'true';
        const query = { 
            members: { 
                $elemMatch: { 
                    userId: req.user._id, 
                    status: { $nin: [MEMBERSHIP_STATUS.PENDING, MEMBERSHIP_STATUS.REJECTED] } 
                } 
            } 
        };
        if (showArchived) query.deletedAt = { $ne: null };
        else query.deletedAt = null;

        const projects = await Project.find(query)
            .populate('members.userId', 'name email avatar')
            .select('name description status category startDate endDate coverImageUrl members.userId members.status createdBy')
            .sort('-createdAt')
            .lean();

        // Filter out pending/rejected members so the frontend team count is accurate
        const formattedProjects = projects.map(p => ({
            ...p,
            members: (p.members || []).filter(m => m.status !== MEMBERSHIP_STATUS.PENDING && m.status !== MEMBERSHIP_STATUS.REJECTED)
        }));

        res.status(200).json({ status: 'success', results: formattedProjects.length, data: formattedProjects });
    } catch (error) { 
        logger.error(`Critical 500 in getProjects: ${error.stack}`);
        next(error); 
    }
};

const getProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('members.userId', 'name email avatar')
            .select('-__v -deadlineNotified')
            .lean();

        if (!project || project.deletedAt !== null) {
            res.status(404);
            throw new Error(SYSTEM_MESSAGES.PROJECT_NOT_FOUND);
        }

        const memberData = project.members.find(m => (m.userId?._id?.toString() || m.userId?.toString()) === req.user._id.toString());
        const isMember = memberData && memberData.status !== MEMBERSHIP_STATUS.PENDING && memberData.status !== MEMBERSHIP_STATUS.REJECTED;
        
        if (!isMember && req.user.role !== PROJECT_ROLES.ADMIN) {
            res.status(403);
            throw new Error(SYSTEM_MESSAGES.ERROR_ACCESS_DENIED);
        }

        res.status(200).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const createProject = async (req, res, next) => {
    try {
        const { name, description, category, startDate, endDate, coverImageUrl } = req.body;
        const project = await Project.create({
            name, description, category, startDate, endDate, coverImageUrl,
            createdBy: req.user._id,
            members: [{ userId: req.user._id, role: PROJECT_ROLES.MANAGER, status: MEMBERSHIP_STATUS.ACTIVE }]
        });
        
        // Invalidate cache so user sees new project immediately
        await clearUserCache('projects_list', req.user._id);
        
        await logActivity(project._id, req.user._id, AUDIT_LOG_TYPES.ENTITY_CREATE, { name });

        // Automated Chat Sync
        await ensureProjectChat(project).catch(err => logger.error(`Chat creation error: ${err.message}`));

        res.status(201).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const updateProject = async (req, res, next) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, deletedAt: null });
        if (!project) {
            res.status(404);
            throw new Error(SYSTEM_MESSAGES.PROJECT_NOT_FOUND);
        }

        // Strict Optimistic Concurrency Control
        // If the client provides __v, we MUST match it. 
        // If you want to force OCC always, you would check if req.body.__v is missing here.
        if (req.body.__v !== undefined && project.__v !== req.body.__v) {
            res.status(409);
            throw new Error('Concurrency Conflict: This project was updated by another user. Please refresh and try again.');
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
            if (['name', 'description', 'category', 'startDate', 'endDate', 'status', 'coverImageUrl', 'coverImageId', 'kanbanConfig', 'taskTemplates', 'checklistTemplates', 'boardBackground'].includes(key)) {
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

        await logActivity(project._id, req.user._id, AUDIT_LOG_TYPES.ENTITY_UPDATE, req.body);
        req.io.to(`project_${project._id}`).emit('projectUpdated', { id: project._id, update: req.body });
        req.io.to(`project_${project._id}`).emit('projectActivity', { userName: req.user.name, action: 'updated the project details' });

        // Instantly trigger deadline check if endDate or status was part of this update.
        // Also notify managers about the strategic schedule adjustment immediately.
        if (req.body.endDate !== undefined || req.body.status !== undefined) {
            checkSingleProject(project._id).catch(err =>
                logger.error(`Instant deadline check error: ${err.message}`)
            );

            if (req.body.endDate !== undefined) {
                const managers = project.members.filter(m => m.role === PROJECT_ROLES.MANAGER);
                for (const manager of managers) {
                    notificationService.notify({
                        recipientId: manager.userId._id || manager.userId,
                        type: NOTIFICATION_TYPES.DEADLINE,
                        priority: TASK_PRIORITIES[2],
                        title: 'Strategic Schedule Adjustment',
                        message: `Notice: The deadline for project "${project.name}" has been synchronized to ${new Date(req.body.endDate).toLocaleDateString()}.`,
                        link: `/projects/${project._id}/settings`,
                        metadata: { projectId: project._id, projectName: project.name }
                    }).catch(err => logger.error(`Deadline update notification failed: ${err.message}`));
                }
            }
        }

        await project.populate('members.userId', 'name email avatar');
        
        // Clear cache for all active members
        const allMemberIds = project.members.map(m => (m.userId?._id || m.userId).toString());
        for (const uid of allMemberIds) {
            await clearUserCache('projects_list', uid);
        }

        // Animated Chat Sync (Update participants/details)
        await ensureProjectChat(project).catch(err => logger.error(`Chat sync error: ${err.message}`));

        res.status(200).json({ status: 'success', data: project });
    } catch (error) { next(error); }
};

const deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) { res.status(404); throw new Error('Project not found'); }

        // RBAC: Only the creator (or Admin) can archive/delete the project
        const creatorId = project.createdBy || project.members?.[0]?.userId;
        if (creatorId?.toString() !== req.user._id.toString() && req.user.role !== PROJECT_ROLES.ADMIN) {
            res.status(403);
            throw new Error('Permission Denied: Only the project creator can archive this workspace.');
        }

        project.deletedAt = new Date();
        project.status = PROJECT_STATUSES.ARCHIVED;
        await project.save();

        req.io.to(`project_${project._id}`).emit('projectUpdated', { id: project._id, status: 'Archived', deletedAt: project.deletedAt });

        // ARCHIVE tasks instead of deleting them to support Restoration
        await Task.updateMany({ project: req.params.id }, { $set: { isArchived: true } });
        await logActivity(project._id, req.user._id, AUDIT_LOG_TYPES.ENTITY_DELETE, { name: project.name, ipAddress: req.ip }, 'Security');

        // Clear cache for all members so the project moves to "Archived" view for everyone
        const memberIds = project.members.map(m => (m.userId?._id || m.userId).toString());
        for (const uid of memberIds) {
            await clearUserCache('projects_list', uid);
        }

        res.status(200).json({ status: 'success', message: 'Project moved to trash' });
    } catch (error) { next(error); }
};

const purgeProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) { res.status(404); throw new Error('Project not found'); }

        // RBAC Verification
        const creatorId = project.createdBy || project.members?.[0]?.userId;
        if (creatorId?.toString() !== req.user._id.toString() && req.user.role !== PROJECT_ROLES.ADMIN) {
            res.status(403);
            throw new Error('Permission Denied: Only the project creator can permanently delete this workspace.');
        }

        // Project must be archived first (sanity check)
        if (project.status !== PROJECT_STATUSES.ARCHIVED && project.deletedAt === null) {
            res.status(400);
            throw new Error('Only archived projects can be purged.');
        }

        // Recursively clean up associated tasks
        await Task.deleteMany({ project: project._id });

        // Final Deletion
        await Project.findByIdAndDelete(project._id);

        await logActivity(project._id, req.user._id, AUDIT_LOG_TYPES.ENTITY_DELETE, { name: project.name, action: 'Permanent Purge' }, 'Security');
        
        // Clear cache
        await clearUserCache('projects_list', req.user._id);

        res.status(200).json({ status: 'success', message: 'Project permanently purged' });
    } catch (error) { next(error); }
};

const restoreProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) { res.status(404); throw new Error('Project not found'); }
        project.deletedAt = null;
        project.status = PROJECT_STATUSES.ACTIVE;
        await project.save();

        // Restore tasks associated with the project
        await Task.updateMany({ project: req.params.id }, { $set: { isArchived: false } });

        req.io.to(`project_${project._id}`).emit('projectUpdated', { id: project._id, status: PROJECT_STATUSES.ACTIVE, deletedAt: null });
        await logActivity(project._id, req.user._id, AUDIT_LOG_TYPES.ENTITY_UPDATE, { action: 'Restore' });

        // Clear cache for all members
        const memberIds = project.members.map(m => (m.userId?._id || m.userId).toString());
        for (const uid of memberIds) {
            await clearUserCache('projects_list', uid);
        }

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
        await logActivity(project._id, req.user._id, AUDIT_LOG_TYPES.ENTITY_UPDATE, { coverImageUrl: project.coverImageUrl });
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
        const project = await Project.findOneAndUpdate({ _id: req.params.id }, { $addToSet: { [updateField]: req.user._id } }, { returnDocument: 'after' });
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
            .limit(parseInt(limit))
            .lean();
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
                    from: 'audits', // Fixed from 'activities' to match Audit model collection
                    let: { projectId: '$_id' },
                    pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$entityId', '$$projectId'] }, { $eq: ['$entityType', 'Project'] }, { $gte: ['$createdAt', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)] }] } } }],
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
        const userId = req.user._id;
        
        // 1. Fetch Projects user is associated with
        const projects = await Project.find({ 
            'members.userId': userId, 
            'members.status': { $in: [MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.PENDING] },
            deletedAt: null 
        }).select('_id status').lean();

        if (!projects || projects.length === 0) {
            return res.status(200).json({
                status: 'success',
                data: {
                    activeProjects: 0, archivedProjects: 0, totalProjects: 0,
                    totalTasks: 0, completedTasks: 0, inProgressTasks: 0,
                    pendingTasks: 0, activeTasks: 0, atRiskTasks: 0, completionPct: 0
                }
            });
        }

        // 2. Prepare IDs for aggregation (Explicitly cast to ObjectId for aggregate pipeline)
        const projectIds = projects.map(p => new mongoose.Types.ObjectId(p._id));
        const now = new Date();

        // 3. Aggregate Task Statistics
        const taskStats = await Task.aggregate([
            { $match: { project: { $in: projectIds } } },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUSES[2]] }, 1, 0] } },
                    inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUSES[1]] }, 1, 0] } },
                    pendingTasks: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUSES[0]] }, 1, 0] } },
                    canceledTasks: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUSES[3]] }, 1, 0] } },
                    atRiskTasks: { 
                        $sum: { 
                            $cond: [
                                { 
                                    $and: [
                                        { $not: { $in: ['$status', [TASK_STATUSES[2], TASK_STATUSES[3]]] } },
                                        { 
                                            $or: [
                                                { $in: ['$priority', [TASK_PRIORITIES[3], TASK_PRIORITIES[2]]] },
                                                {
                                                    $and: [
                                                        { $ne: ['$dueDate', null] }, 
                                                        { $lt: ['$dueDate', now] }
                                                    ]
                                                }
                                            ]
                                        }
                                    ] 
                                }, 
                                1, 0
                            ] 
                        } 
                    }
                }
            }
        ]);

        const stats = taskStats[0] || { 
            totalTasks: 0, completedTasks: 0, inProgressTasks: 0, 
            pendingTasks: 0, canceledTasks: 0, atRiskTasks: 0 
        };

        res.status(200).json({
            status: 'success',
            data: {
                activeProjects: projects.filter(p => p.status === PROJECT_STATUSES.ACTIVE).length,
                archivedProjects: projects.filter(p => p.status === PROJECT_STATUSES.ARCHIVED).length,
                totalProjects: projects.length,
                totalTasks: (stats.totalTasks || 0),
                completedTasks: (stats.completedTasks || 0),
                inProgressTasks: (stats.inProgressTasks || 0),
                pendingTasks: (stats.pendingTasks || 0),
                activeTasks: (stats.totalTasks || 0) - (stats.completedTasks || 0) - (stats.canceledTasks || 0),
                atRiskTasks: (stats.atRiskTasks || 0),
                completionPct: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
            }
        });
    } catch (error) {
        logger.error(`Workspace Stats Error: ${error.message}`);
        next(error); 
    }
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
            req.user.role === PROJECT_ROLES.ADMIN ? { $text: { $search: query } } : { 
                $text: { $search: query }, 
                members: { $elemMatch: { userId: req.user._id, status: MEMBERSHIP_STATUS.ACTIVE } } 
            },
            { score: { $meta: "textScore" } }
        ).populate('members.userId', 'name email avatar').sort({ score: { $meta: "textScore" } }).limit(5).lean();
    

        const [tasks, projects] = await Promise.all([tasksPromise, projectsPromise]);
        res.status(200).json({ status: 'success', data: { tasks, projects } });
    } catch (err) { next(err); }
};

// --- Invitations ---

const getProjectInvitations = async (req, res, next) => {
    try {
        // Find projects where user is in members array with status 'pending'
        const projects = await Project.find({
            members: { 
                $elemMatch: { userId: req.user._id, status: MEMBERSHIP_STATUS.PENDING } 
            },
            deletedAt: null
        })
        .populate('members.userId', 'name email avatar')
        .select('name description status category coverImageUrl members startDate endDate')
        .sort('-createdAt')
        .lean();

        // Map to get the role offered
        const formatted = projects.map(p => {
            const memberDoc = p.members.find(m => m.userId.toString() === req.user._id.toString());
            return {
                _id: p._id,
                name: p.name,
                description: p.description,
                coverImageUrl: p.coverImageUrl,
                status: p.status,
                startDate: p.startDate,
                endDate: p.endDate,
                members: (p.members || []).filter(m => m.status !== MEMBERSHIP_STATUS.PENDING && m.status !== MEMBERSHIP_STATUS.REJECTED),
                offeredRole: memberDoc?.role,
                invitedAt: memberDoc?.joinedAt
            };
        });

        res.status(200).json({ status: 'success', results: formatted.length, data: formatted });
    } catch (error) { next(error); }
};

const respondToProjectInvite = catchAsync(async (req, res) => {
    if (req.user.isBanned) {
        return res.status(403).json({ status: 'error', message: 'Your account is suspended. Action denied.' });
    }
    const { status } = req.body;
    if (![MEMBERSHIP_STATUS.ACTIVE, MEMBERSHIP_STATUS.REJECTED].includes(status)) {
        return res.status(400).json({ status: 'error', message: 'Invalid response status' });
    }
    const result = await ProjectMemberService.respondToInvite({
        projectId: req.params.id,
        userId: req.user._id,
        responseStatus: status,
        io: req.io
    });
    res.status(200).json(result);
});

const respondToInviteByToken = catchAsync(async (req, res) => {
    const { token, status } = req.query;
    const frontendUrl = getFrontendUrl();

    if (!token || !status) {
        return res.redirect(`${frontendUrl}/projects?invite_status=error&message=Invalid+request+parameters`);
    }

    try {
        const result = await ProjectMemberService.respondViaToken({ 
            token, 
            responseStatus: status, 
            io: req.io 
        });

        // Clear cache for the accepted member and the project list
        await clearUserCache('projects_list', result.userId);

        const statusMsg = status === 'active' ? 'accepted' : 'declined';
        res.redirect(`${frontendUrl}/projects?invite_status=success&message=Successfully+${statusMsg}+invitation+for+${encodeURIComponent(result.projectName)}`);
    } catch (error) {
        const errorMessage = encodeURIComponent(error.message || 'Verification failed');
        res.redirect(`${frontendUrl}/projects?invite_status=error&message=${errorMessage}`);
    }
});

module.exports = {
    getProjects, getProject, createProject, updateProject, deleteProject, restoreProject,
    uploadProjectImage, dismissDeadlineAlert, getProjectActivity, getProjectInsights,
    getWorkspaceStats, addMember, updateMemberRole, removeMember, globalSearch,
    getProjectInvitations, respondToProjectInvite, purgeProject, respondToInviteByToken
};

