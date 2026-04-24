const Task = require('../models/task.model');
const Project = require('../models/project.model');
const Audit = require('../models/audit.model');
const TaskComment = require('../models/taskComment.model');
const { getIO } = require('../utils/service.utils');
const { logActivity } = require('../utils/system.utils');
const notificationService = require('../services/notification.service');
const gamification = require('../services/gamification.service');
const { DOMAIN_MAPPING, TASK_STATUSES, TASK_PRIORITIES, PROJECT_ROLES, NOTIFICATION_TYPES, MEMBERSHIP_STATUS, TASK_TYPES, SYSTEM_MESSAGES, AUDIT_LOG_TYPES } = require('../constants');
const detectCircularDependency = async (startId, targetId) => {
    if (startId.toString() === targetId.toString()) return true;
    const visited = new Set();
    const queue = [targetId];
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId.toString())) continue;
        visited.add(currentId.toString());
        const task = await Task.findById(currentId).select('dependencies').lean();
        if (!task || !task.dependencies || !task.dependencies.blockedBy) continue;
        for (const depId of task.dependencies.blockedBy) {
            if (!depId) continue;
            if (depId.toString() === startId.toString()) return true;
            queue.push(depId);
        }
    }
    return false;
};
const getTasks = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        let query = { isArchived: false };
        if (projectId) {
            const project = await Project.findById(projectId).lean();
            if (!project) {
                res.status(404);
                throw new Error(SYSTEM_MESSAGES.PROJECT_NOT_FOUND);}
            const isMember = project.members.some(
                (member) => member.userId?.toString() === req.user._id.toString() && member.status === MEMBERSHIP_STATUS.ACTIVE);
            if (!isMember) {
                res.status(403);
                throw new Error(SYSTEM_MESSAGES.ERROR_ACCESS_DENIED);
            }
            query.project = projectId;
        } else {
            let projectQuery = { isArchived: false };
            if (req.user.role !== PROJECT_ROLES.ADMIN) {
                projectQuery['members.userId'] = req.user._id;
                projectQuery['members.status'] = MEMBERSHIP_STATUS.ACTIVE;}
            const userProjects = await Project.find(projectQuery).select('_id').lean();
            const projectIds = userProjects.map(p => p._id);
            if (req.user.role === PROJECT_ROLES.ADMIN) {
                query.project = { $in: projectIds };
            } else {
                query.$or = [
                    { project: { $in: projectIds } },
                    { assignee: req.user._id },
                    { assignees: req.user._id }
                ];
            }
        }
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;

        const total = await Task.countDocuments(query);
        const tasks = await Task.find(query)
            .populate('assignees', 'name email avatar')
            .populate('assignee', 'name email avatar')
            .populate('watchers', 'name email avatar')
            .populate('project', 'name color')
            .select('-__v -description -timeSessions -subtasks') // Payload reduction: omit heavy fields for list views
            .sort('-updatedAt')
            .skip(skip)
            .limit(limit)
            .lean();

        // Standardize assignees for legacy support
        const migratedTasks = tasks.map(task => {
            if (task.assignee && (!task.assignees || task.assignees.length === 0)) {
                task.assignees = [task.assignee];
            }
            if (!task.assignee && task.assignees?.length > 0) {
                task.assignee = task.assignees[0];
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
            throw new Error(SYSTEM_MESSAGES.PROJECT_NOT_FOUND);
        }

        const isMember = project.members.some(
            (m) => m.userId.toString() === req.user._id.toString() && m.status === MEMBERSHIP_STATUS.ACTIVE
        );

        if (!isMember && req.user.role !== PROJECT_ROLES.ADMIN) {
            res.status(403);
            throw new Error(SYSTEM_MESSAGES.ERROR_ACCESS_DENIED);
        }

        const projectStartDate = new Date(project.startDate);
        const projectEndDate = new Date(project.endDate);

        if (startDate && new Date(startDate) < projectStartDate) {
            res.status(400);
            throw new Error(`Task start date (${new Date(startDate).toLocaleDateString()}) cannot be before the project's start date (${projectStartDate.toLocaleDateString()}).`);
        }

        if (dueDate && new Date(dueDate) > projectEndDate) {
            res.status(400);
            throw new Error(`Task deadline (${new Date(dueDate).toLocaleDateString()}) cannot exceed the project's end date (${projectEndDate.toLocaleDateString()}).`);
        }

        if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
            res.status(400);
            throw new Error('Task start date cannot be after the due date.');
        }

        // Handle both single and multiple assignees for flexibility
        const taskAssignees = assignees || (assignee ? [assignee] : []);

        const task = await Task.create({
            title,
            description,
            status: status || TASK_STATUSES[0],
            priority: priority || TASK_PRIORITIES[1],
            assignees: taskAssignees,
            assignee: taskAssignees.length > 0 ? taskAssignees[0] : null, // Mirror first assignee for legacy mobile/client support
            type: type || TASK_TYPES.TASK,
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

        await logActivity(req.params.projectId, req.user._id, AUDIT_LOG_TYPES.ENTITY_CREATE, {
            title: task.title,
            priority: task.priority,
            status: task.status,
            type: task.type
        }, 'Task', task._id);
        const room = task.project?._id?.toString() || task.project?.toString();
        getIO().to(room).emit('taskUpdated', populatedTask);
        if (taskAssignees.length > 0) {
            const uniqueAssignees = [...new Set(taskAssignees.map(id => id.toString()))];
            for (const recipientId of uniqueAssignees) {
                if (recipientId === req.user._id.toString()) continue;

                await notificationService.notify({
                    recipientId,
                    senderId: req.user._id,
                    type: NOTIFICATION_TYPES.ASSIGNMENT,
                    title: 'New Task Assigned',
                    message: `${req.user.name} assigned you to "${task.title}"`,
                    link: `/tasks?project=${task.project._id || task.project}`,
                    metadata: {
                        taskId: task._id,
                        projectId: task.project._id || task.project,
                        taskName: task.title,
                        taskType: task.type, // Required for Emergency Command Bypass
                        projectName: populatedTask.project?.name || 'Project'
                    }
                });
            }
        }

        // --- Gamification Hook for Created "Completed" tasks ---
        if (task.status === TASK_STATUSES[2]) {
            const xp = gamification.calculateTaskXP(task, { wasBlocked: false });
            const assigneesToReward = task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : [req.user._id]);
            for (const u of assigneesToReward) {
                gamification.awardXP(u._id || u, xp, task).catch(err => console.error("Gamification Error:", err));
            }
        }

        res.status(201).json({ status: 'success', data: populatedTask });
    } catch (error) {
        next(error);
    }
}

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

        // Check if user is assigned to this task, or is an active manager in the project
        const isAssignee = (task.assignees && task.assignees.some(a => a?.toString() === req.user._id.toString())) ||
            (task.assignee && task.assignee.toString() === req.user._id.toString());

        const isManagerOrEditor = project.members.some(
            (m) => m.userId?.toString() === req.user._id.toString() && 
            (m.role === PROJECT_ROLES.MANAGER || m.role === PROJECT_ROLES.EDITOR) && 
            m.status === MEMBERSHIP_STATUS.ACTIVE
        );
        const isAuthorized = isAssignee || isManagerOrEditor || req.user.role === PROJECT_ROLES.ADMIN;

        if (!isAuthorized) {
            res.status(403);
            throw new Error(SYSTEM_MESSAGES.ERROR_ACCESS_DENIED);
        }

        const projectStartDate = new Date(project.startDate);
        const projectEndDate = new Date(project.endDate);

        const currentStartDate = req.body.startDate || task.startDate;
        const currentDueDate = req.body.dueDate || task.dueDate;

        if (req.body.startDate && new Date(req.body.startDate) < projectStartDate) {
            res.status(400);
            throw new Error(`Task start date cannot be before the project's start date (${projectStartDate.toLocaleDateString()}).`);
        }

        if (req.body.dueDate && new Date(req.body.dueDate) > projectEndDate) {
            res.status(400);
            throw new Error(`Task due date cannot exceed the project's end date (${projectEndDate.toLocaleDateString()}).`);
        }

        if (currentStartDate && currentDueDate && new Date(currentStartDate) > new Date(currentDueDate)) {
            res.status(400);
            throw new Error('Task start date cannot be after the due date.');
        }

        const oldStatus = task.status;
        const oldPriority = task.priority;
        const oldType = task.type || 'Task';

        // Capture XP to revoke BEFORE update if task is being un-completed
        let preUpdateXpData = null;
        if (oldStatus === TASK_STATUSES[2] && req.body.status && req.body.status !== TASK_STATUSES[2]) {
            preUpdateXpData = gamification.calculateTaskXP(task);
        }
        const oldBlockedBy = task.dependencies?.blockedBy?.map(id => id.toString()) || [];
        const oldBlocking = task.dependencies?.blocking?.map(id => id.toString()) || [];
        if (req.body.assignees) {
            req.body.assignee = req.body.assignees.length > 0 ? req.body.assignees[0] : null;
        }
        if (req.body.dependencies) {
            const newBlockedBy = req.body.dependencies.blockedBy || [];
            const newBlocking = req.body.dependencies.blocking || [];
            for (const depId of newBlockedBy) {
                if (!depId) continue;
                if (!oldBlockedBy.includes(depId.toString())) {
                    const isCircular = await detectCircularDependency(task._id, depId);
                    if (isCircular) {
                        res.status(400);
                        throw new Error(`Adding dependency for task ${depId} would create a circular loop.`);
                    }
                }
            }
            for (const targetId of newBlocking) {
                if (!targetId) continue;
                if (!oldBlocking.includes(targetId.toString())) {
                    const isCircular = await detectCircularDependency(targetId, task._id);
                    if (isCircular) {
                        res.status(400);
                        throw new Error(`Setting this task to block ${targetId} would create a circular loop.`);
                    }
                }
            }
            const addedBlockedBy = newBlockedBy.filter(id => !oldBlockedBy.includes(id.toString()));
            const removedBlockedBy = oldBlockedBy.filter(id => !newBlockedBy.map(d => d.toString()).includes(id));

            for (const id of addedBlockedBy) {
                const other = await Task.findByIdAndUpdate(id, { $addToSet: { 'dependencies.blocking': task._id } }, { returnDocument: 'after' }).select('dependencies project');
                if (other) {
                    const roomId = other.project?._id?.toString() || other.project?.toString() || task.project?._id?.toString() || task.project?.toString();
                    getIO().to(roomId).emit('taskUpdated', { _id: id, dependencies: other.dependencies });
                }
            }
            for (const id of removedBlockedBy) {
                const other = await Task.findByIdAndUpdate(id, { $pull: { 'dependencies.blocking': task._id } }, { returnDocument: 'after' }).select('dependencies project');
                if (other) {
                    const roomId = other.project?._id?.toString() || other.project?.toString() || task.project?._id?.toString() || task.project?.toString();
                    getIO().to(roomId).emit('taskUpdated', { _id: id, dependencies: other.dependencies });
                }
            }
            const addedBlocking = newBlocking.filter(id => !oldBlocking.includes(id.toString()));
            const removedBlocking = oldBlocking.filter(id => !newBlocking.map(d => d.toString()).includes(id));
            for (const id of addedBlocking) {
                const other = await Task.findByIdAndUpdate(id, { $addToSet: { 'dependencies.blockedBy': task._id } }, { returnDocument: 'after' }).select('dependencies');
                if (other) getIO().to(task.project.toString()).emit('taskUpdated', { _id: id, dependencies: other.dependencies });
            }
            for (const id of removedBlocking) {
                const other = await Task.findByIdAndUpdate(id, { $pull: { 'dependencies.blockedBy': task._id } }, { returnDocument: 'after' }).select('dependencies');
                if (other) getIO().to(task.project.toString()).emit('taskUpdated', { _id: id, dependencies: other.dependencies });
            }
            task.dependencies.blockedBy = newBlockedBy;
            task.dependencies.blocking = newBlocking;
            delete req.body.dependencies;
        }
        Object.assign(task, req.body);
        if (req.body.dependencies === undefined) {
        }
        await task.save();
        await task.populate([
            { path: 'assignees', select: 'name email avatar' },
            { path: 'project', select: 'name color' }
        ]);
        const changes = [];
        if (req.body.status && oldStatus !== req.body.status) {
            changes.push(`status from ${oldStatus} to ${req.body.status}`);
        }
        if (req.body.priority && task.priority !== req.body.priority) {
            changes.push(`priority to ${req.body.priority}`);
        }
        if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
            const oldCompleted = task.subtasks?.filter(s => s.completed).length || 0;
            const newCompleted = req.body.subtasks.filter(s => s.completed).length || 0;
            if (oldCompleted !== newCompleted) {
                changes.push(newCompleted > oldCompleted ? 'completed a subtask' : 'unchecked a subtask');
            }
        }
        if (changes.length > 0) {
            await logActivity(task.project._id || task.project, req.user._id, 'EntityUpdate', {
                title: task.title,
                summary: `Updated ${changes.join(', ')}`,
                details: changes
            }, 'Task', task._id);
        }
        if (req.body.subtasks && JSON.stringify(task.subtasks) !== JSON.stringify(req.body.subtasks)) {
            if (changes.some(c => c.includes('subtask'))) {
                await logActivity(task.project._id || task.project, req.user._id, 'SubtaskToggle', {
                    title: task.title,
                    subtasks: req.body.subtasks
                }, 'Task', task._id);
            }
        }
        const projectRoom = task.project?._id?.toString() || task.project?.toString();
        getIO().to(projectRoom).emit('taskUpdated', task);
        const statusChanged = req.body.status && oldStatus !== req.body.status;
        const priorityChanged = req.body.priority && oldPriority !== req.body.priority;
        const typeChanged = req.body.type && oldType !== req.body.type;

        if (statusChanged || priorityChanged || typeChanged) {
            const isCompleted = req.body.status === TASK_STATUSES[2];
            const assignees = task.assignees?.map(a => a._id || a) || [];

            let managers = [];
            if ((isCompleted || priorityChanged) && project) {
                managers = project.members
                    .filter(m => m.role === PROJECT_ROLES.MANAGER && m.status === MEMBERSHIP_STATUS.ACTIVE)
                    .map(m => (m.userId?._id || m.userId).toString());
            }
            const recipients = [...new Set([
                ...assignees.map(id => id.toString()),
                ...managers
            ])];
            let title = 'Task Updated';
            let message = `${req.user.name} updated "${task.title}": `;
            const changeLog = [];

            if (statusChanged) {
                changeLog.push(`status to ${req.body.status}`);
                if (isCompleted) title = 'Task Completed';
            }
            if (priorityChanged) {
                changeLog.push(`priority to ${req.body.priority}`);
                if (req.body.priority === TASK_PRIORITIES[3]) title = 'Urgent Priority Escalation';
            }
            if (typeChanged) {
                changeLog.push(`classification to ${req.body.type}`);
            }

            message += changeLog.join(', ');

            try {
                for (const recipientId of recipients) {
                    await notificationService.notify({
                        recipientId,
                        senderId: req.user._id,
                        type: isCompleted ? NOTIFICATION_TYPES.STATUS_UPDATE : NOTIFICATION_TYPES.METADATA_UPDATE,
                        priority: (isCompleted || req.body.priority === TASK_PRIORITIES[3] || task.priority === TASK_PRIORITIES[3]) ? TASK_PRIORITIES[3] : TASK_PRIORITIES[1],
                        title,
                        message,
                        link: `/tasks?project=${task.project._id || task.project}`,
                        metadata: {
                            taskId: task._id,
                            projectId: task.project._id || task.project,
                            taskName: task.title,
                            projectName: project.name || 'Project'
                        }
                    });
                }
            } catch (notifyErr) {
                logger.error(`[NOTIFICATION_CRASH] Resiliency bypass triggered: ${notifyErr.message}`);
            }
        }
        if (req.body.subtasks && Array.isArray(req.body.subtasks)) {
            const oldCompleted = task.subtasks?.filter(s => s.completed).length || 0;
            const newCompleted = req.body.subtasks.filter(s => s.completed).length || 0;
            if (newCompleted > oldCompleted) {
                const subtaskXP = (newCompleted - oldCompleted) * 15;
                gamification.awardXP(req.user._id, subtaskXP, task).catch(err => console.error("Subtask XP Error:", err));
            }
        }

        // 2. Main Task status change XP
        if (oldStatus !== TASK_STATUSES[2] && req.body.status === TASK_STATUSES[2]) {
            console.log(`[GAMIFICATION] Task ${task._id} marked COMPLETED. Starting award flow.`);

            const wasBlocked = task.dependencies?.blockedBy?.length > 0;
            const xpToAward = gamification.calculateTaskXP(task, { wasBlocked });
            console.log(`[GAMIFICATION] Calculated XP: ${xpToAward} (Was Blocked: ${wasBlocked})`);

            // Award to all assignees if multiple, or the single legacy assignee
            let usersToReward = task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : []);

            // Ensure the user actually doing the work gets the credit!
            const completerId = req.user._id.toString();
            const hasCompleter = usersToReward.some(u => (u._id?.toString() || u.toString()) === completerId);
            if (!hasCompleter) {
                usersToReward.push(req.user._id);
            }

            for (const assignedUser of usersToReward) {
                const userId = assignedUser._id || assignedUser;
                // Pass context to awardXP for tiered roll and milestones
                gamification.awardXP(userId, xpToAward, task, { wasBlocked }).catch(err => console.error("Gamification Error:", err));
            }
        }
        // Hook for Un-completing tasks
        else if (preUpdateXpData) {
            let usersToRevoke = task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : []);
            const completerId = req.user._id.toString();
            const hasCompleter = usersToRevoke.some(u => (u._id?.toString() || u.toString()) === completerId);
            if (!hasCompleter) {
                usersToRevoke.push(req.user._id);
            }

            for (const assignedUser of usersToRevoke) {
                const userId = assignedUser._id || assignedUser;
                if (gamification.revokeXP) {
                    gamification.revokeXP(userId, task, preUpdateXpData).catch(err => console.error("Gamification Error:", err));
                }
            }
        }

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
            (m) => m.userId.toString() === req.user._id.toString() && m.role === PROJECT_ROLES.MANAGER && m.status === MEMBERSHIP_STATUS.ACTIVE
        );

        if (!isManager && req.user.role !== PROJECT_ROLES.ADMIN) {
            res.status(401);
            throw new Error('User not authorized to delete this task');
        }

        await task.deleteOne();

        // Log Deletion
        await logActivity(task.project.toString(), req.user._id, 'EntityDelete', {
            title: task.title
        }, 'Task', task._id);

        // Emit real-time WebSocket deletion signal (passing deleted ID)
        getIO().to(task.project.toString()).emit('taskDeleted', task._id);

        res.status(200).json({ status: 'success', data: {} });
    } catch (error) {
        next(error);
    }
};

const getTaskActivity = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const logs = await Audit.find({
            entityId: req.params.id,
            entityType: 'Task'
        })
            .populate('user', 'name email avatar')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Audit.countDocuments({
            entityId: req.params.id,
            entityType: 'Task'
        });

        res.status(200).json({
            status: 'success',
            results: logs.length,
            total,
            data: logs
        });
    } catch (error) {
        next(error);
    }
};

const bulkUpdateTasks = async (req, res, next) => {
    try {
        const { taskIds, updates } = req.body;
        if (!Array.isArray(taskIds) || taskIds.length === 0) {
            res.status(400);
            throw new Error('Please provide an array of task IDs');
        }

        // We fetch all tasks to verify ownership and project membership
        const tasks = await Task.find({ _id: { $in: taskIds } });

        if (tasks.length === 0) {
            res.status(404);
            throw new Error('No tasks found for provided IDs');
        }

        const projectIds = [...new Set(tasks.map(t => t.project.toString()))];
        const projects = await Project.find({ _id: { $in: projectIds } }).lean();
        const projectMap = projects.reduce((map, p) => { map[p._id.toString()] = p; return map; }, {});

        // Strict Security Verification per Task
        for (const task of tasks) {
            const project = projectMap[task.project.toString()];
            if (!project) {
                res.status(404);
                throw new Error(`Project for task ${task._id} not found`);
            }

            const isAssignee = (task.assignees && task.assignees.some(a => a.toString() === req.user._id.toString())) ||
                (task.assignee && task.assignee.toString() === req.user._id.toString());

            const isManagerOrEditor = project.members.some(
                (m) => m.userId.toString() === req.user._id.toString() && (m.role === PROJECT_ROLES.MANAGER || m.role === PROJECT_ROLES.EDITOR) && m.status === MEMBERSHIP_STATUS.ACTIVE
            );

            if (!isAssignee && !isManagerOrEditor && req.user.role !== PROJECT_ROLES.ADMIN) {
                res.status(401);
                throw new Error(`User not authorized to update task ${task._id}`);
            }
        }

        // Prevent Mass Assignment: Whitelist allowed fields
        const allowedFields = ['status', 'priority', 'dueDate', 'assignees', 'title', 'description', 'points', 'type', 'labels', 'estimatedTime', 'startDate'];
        const safeUpdates = {};
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                safeUpdates[key] = updates[key];
            }
        }

        if (Object.keys(safeUpdates).length === 0) {
            res.status(400);
            throw new Error('No valid fields provided for bulk update');
        }

        // Legacy/Mirroring logic if assignees changed
        if (safeUpdates.assignees) {
            safeUpdates.assignee = safeUpdates.assignees.length > 0 ? safeUpdates.assignees[0] : null;
        }

        // Perform updates using .save() to trigger hooks correctly
        const updatePromises = taskIds.map(async (id) => {
            const task = await Task.findById(id);
            if (!task) return null;

            Object.assign(task, safeUpdates);
            await task.save();

            return await Task.findById(task._id)
                .populate('assignees', 'name email avatar')
                .populate('project', 'name color')
                .lean();
        });

        const updatedTasks = await Promise.all(updatePromises);

        // Audit, Socket & Notification events
        const { calculateTaskXP, awardXP } = require('../services/gamification.service');

        for (const task of updatedTasks) {
            getIO().to(task.project.toString()).emit('taskUpdated', task);

            const originalTask = tasks.find(t => t._id.toString() === task._id.toString());
            const isNowCompleted = originalTask && originalTask.status !== TASK_STATUSES[2] && task.status === TASK_STATUSES[2];
            const isNowUncompleted = originalTask && originalTask.status === TASK_STATUSES[2] && task.status !== TASK_STATUSES[2];

            // --- Notification Hook for Bulk Completion ---
            if (isNowCompleted) {
                const project = projectMap[task.project.toString()];
                const assignees = task.assignees?.map(a => a._id || a) || [];
                const managers = project.members
                    .filter(m => m.role === PROJECT_ROLES.MANAGER && m.status === MEMBERSHIP_STATUS.ACTIVE)
                    .map(m => m.userId?._id || m.userId);

                const recipients = [...new Set([...assignees, ...managers])];

                for (const recipientId of recipients) {
                    if (recipientId.toString() === req.user._id.toString()) continue;

                    await notificationService.notify({
                        recipientId,
                        senderId: req.user._id,
                        type: NOTIFICATION_TYPES.STATUS_UPDATE,
                        priority: TASK_PRIORITIES[3],
                        title: 'Task Completed (Bulk)',
                        message: `Task "${task.title}" was marked as completed during a bulk update by ${req.user.name}.`,
                        link: `/tasks?project=${task.project}`,
                        metadata: {
                            taskId: task._id,
                            projectId: task.project,
                            taskName: task.title,
                            projectName: project.name || 'Project',
                            priority: TASK_PRIORITIES[3]
                        }
                    }).catch(err => console.error("Bulk Notify Error:", err));
                }
            }

            // --- Gamification Engine Hook for Bulk ---
            if (isNowCompleted) {
                console.log(`[GAMIFICATION-BULK] Task ${task._id} marked COMPLETED. Starting award flow.`);
                const xpToAward = calculateTaskXP(task);
                let usersToReward = task.assignees?.length > 0 ? [...task.assignees] : (task.assignee ? [task.assignee] : []);

                const completerId = req.user._id.toString();
                const hasCompleter = usersToReward.some(u => (u._id?.toString() || u.toString()) === completerId);
                if (!hasCompleter) {
                    usersToReward.push(req.user._id);
                }

                for (const assignedUser of usersToReward) {
                    const userId = assignedUser._id || assignedUser;
                    awardXP(userId, xpToAward, task).catch(err => console.error("Bulk Gamification Error:", err));
                }
            }

            if (isNowUncompleted) {
                let usersToRevoke = task.assignees?.length > 0 ? [...task.assignees] : (task.assignee ? [task.assignee] : []);
                const completerId = req.user._id.toString();
                const hasCompleter = usersToRevoke.some(u => (u._id?.toString() || u.toString()) === completerId);
                if (!hasCompleter) {
                    usersToRevoke.push(req.user._id);
                }

                for (const assignedUser of usersToRevoke) {
                    const userId = assignedUser._id || assignedUser;
                    gamification.revokeXP(userId, originalTask).catch(err => console.error("Bulk Revocation Error:", err));
                }
            }
        }

        res.status(200).json({ status: 'success', count: updatedTasks.length, data: updatedTasks });
    } catch (error) { next(error); }
};

const startTimer = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) { res.status(404); throw new Error('Task not found'); }

        // Check if there's already an open session for this user
        const openSession = task.timeSessions.find(
            s => s.user.toString() === req.user._id.toString() && !s.endedAt
        );
        if (openSession) {
            return res.status(200).json({ status: 'success', message: 'Timer already running', data: task });
        }

        task.timeSessions.push({
            user: req.user._id,
            startedAt: new Date(),
        });
        await task.save();

        getIO().to(task.project.toString()).emit('taskUpdated', task);

        // Log Timer Start
        await logActivity(task.project.toString(), req.user._id, 'TimerStart', {
            title: task.title,
            startedAt: new Date()
        }, 'Task', task._id);

        res.status(200).json({ status: 'success', data: task });
    } catch (error) { next(error); }
};

const stopTimer = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) { res.status(404); throw new Error('Task not found'); }

        const openSession = task.timeSessions.find(
            s => s.user.toString() === req.user._id.toString() && !s.endedAt
        );

        if (!openSession) {
            return res.status(200).json({ status: 'success', message: 'No active session found' });
        }

        const endedAt = new Date();
        const duration = Math.round((endedAt.getTime() - openSession.startedAt.getTime()) / 1000); // seconds
        openSession.endedAt = endedAt;
        openSession.duration = duration;
        task.actualTime = (task.actualTime || 0) + duration / 3600;
        await task.save();

        // Log Timer Stop
        await logActivity(task.project.toString(), req.user._id, 'TimerStop', {
            title: task.title,
            duration: `${Math.round(duration / 60)} minutes`,
            totalActualTime: task.actualTime
        }, 'Task', task._id);

        getIO().to(task.project.toString()).emit('taskUpdated', task);

        res.status(200).json({ status: 'success', data: { duration, actualTime: task.actualTime } });
    } catch (error) { next(error); }
};

/**
 * @desc    Get single task
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignees', 'name email avatar')
            .populate('assignee', 'name email avatar')
            .populate('project', 'name color members')
            .populate({ path: 'dependencies.blockedBy', select: 'title status' })
            .populate({ path: 'dependencies.blocking', select: 'title status' })
            .lean();

        if (!task) { res.status(404); throw new Error('Task not found'); }

        const project = task.project;
        const isMember = project?.members?.some(m => m.userId?.toString() === req.user._id.toString() && m.status === MEMBERSHIP_STATUS.ACTIVE);
        if (!isMember && req.user.role !== PROJECT_ROLES.ADMIN) {
            res.status(403);
            throw new Error('User not authorized to access this task');
        }

        res.status(200).json({ status: 'success', data: task });
    } catch (error) { next(error); }
};

/**
 * @desc    Update task status specifically
 * @route   PATCH /api/tasks/:id/status
 * @access  Private
 */
const updateTaskStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!status) { res.status(400); throw new Error('Status is required'); }

        const task = await Task.findById(req.params.id);
        if (!task) { res.status(404); throw new Error('Task not found'); }

        const oldStatus = task.status;
        task.status = status;
        await task.save();

        // Audit & Socket
        await logActivity(task.project.toString(), req.user._id, 'StatusUpdate', {
            title: task.title,
            from: oldStatus,
            to: status
        }, 'Task', task._id);

        getIO().to(task.project.toString()).emit('taskUpdated', task);

        // Gamification logic for completion
        if (oldStatus !== 'Completed' && status === 'Completed') {
            const xp = gamification.calculateTaskXP(task);
            const assignees = task.assignees?.length > 0 ? task.assignees : [req.user._id];
            for (const u of assignees) {
                gamification.awardXP(u._id || u, xp, task).catch(err => logger.error(`XP Error: ${err.message}`));
            }
        }

        res.status(200).json({ status: 'success', data: task });
    } catch (error) { next(error); }
};

// ─── Task Comment Methods (Merged) ──────────────────────────────────────────

const getTaskComments = async (req, res, next) => {
    try {
        const comments = await TaskComment.find({ task: req.params.taskId })
            .populate('user', 'name email avatar')
            .sort('-createdAt')
            .lean();
        res.status(200).json({ status: 'success', data: comments });
    } catch (error) { next(error); }
};

const addTaskComment = async (req, res, next) => {
    try {
        const { content, mentions, attachments } = req.body;
        const taskId = req.params.taskId;
        const task = await Task.findById(taskId);
        if (!task) { res.status(404); throw new Error('Task not found'); }

        const comment = await TaskComment.create({
            task: taskId, user: req.user._id, content, mentions, attachments
        });

        const populatedComment = await TaskComment.findById(comment._id).populate('user', 'name email avatar').lean();

        getIO().to(task.project.toString()).emit('commentAdded', { taskId, comment: populatedComment });

        await logActivity(task.project.toString(), req.user._id, 'CommentAdded', {
            title: task.title, summary: `Added comment: "${content.substring(0, 30)}..."`
        }, 'Task', taskId);

        if (mentions?.length > 0) {
            for (const recipientId of mentions) {
                if (recipientId.toString() === req.user._id.toString()) continue;
                await notificationService.notify({
                    recipientId, senderId: req.user._id, type: 'Mention',
                    title: 'New Mention', message: `${req.user.name} mentioned you on "${task.title}"`,
                    link: `/tasks?project=${task.project}`,
                    metadata: { taskId: task._id, projectId: task.project }
                }).catch(e => logger.error(`Notify Error: ${e.message}`));
            }
        }

        gamification.awardXP(req.user._id, 10, task).catch(err => logger.error(`Comment XP Error: ${err.message}`));
        res.status(201).json({ status: 'success', data: populatedComment });
    } catch (error) { next(error); }
};

const deleteTaskComment = async (req, res, next) => {
    try {
        const comment = await TaskComment.findById(req.params.commentId);
        if (!comment) { res.status(404); throw new Error('Comment not found'); }
        if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            res.status(401); throw new Error('Unauthorized');
        }
        await comment.deleteOne();
        res.status(200).json({ status: 'success', data: {} });
    } catch (error) { next(error); }
};

const toggleReaction = async (req, res, next) => {
    try {
        const { emoji } = req.body;
        const comment = await TaskComment.findById(req.params.commentId);
        if (!comment) { res.status(404); throw new Error('Comment not found'); }
        const userId = req.user._id.toString();
        const existingReaction = comment.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
            const idx = existingReaction.users.findIndex(u => u.toString() === userId);
            if (idx !== -1) existingReaction.users.splice(idx, 1);
            else existingReaction.users.push(req.user._id);
            if (existingReaction.users.length === 0) comment.reactions = comment.reactions.filter(r => r.emoji !== emoji);
        } else {
            comment.reactions.push({ emoji, users: [req.user._id] });
        }
        await comment.save();
        const task = await Task.findById(comment.task).select('project').lean();
        getIO().to(task?.project?.toString() || '').emit('commentReacted', { commentId: comment._id, reactions: comment.reactions });
        res.status(200).json({ status: 'success', data: comment.reactions });
    } catch (error) { next(error); }
};
module.exports = {
    getTasks,
    getTask,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getTaskActivity,
    bulkUpdateTasks,
    startTimer,
    stopTimer,
    getTaskComments,
    addTaskComment,
    deleteTaskComment,
    toggleReaction
};

