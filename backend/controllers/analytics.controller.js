const Task = require('../models/task.model');
const Audit = require('../models/audit.model');
const ProjectSnapshot = require('../models/projectSnapshot.model');
const mongoose = require('mongoose');
const { catchAsync } = require('../utils/core.utils');
const { TASK_STATUSES, TASK_PRIORITIES, PROJECT_ROLES, MEMBERSHIP_STATUS, TASK_TYPES } = require('../constants');

// High-fidelity local cache for analytics (30s TTL as per mission requirements)
const analyticsCache = {
    workspace: { data: null, timestamp: 0 },
    projects: {} // keyed by projectId
};
const ANALYTICS_CACHE_TTL = 30 * 1000;

/**
 * 🚀 Professional Analytics Engine (Hybrid Intelligence Edition)
 * Deep-data analysis using live logs + historical snapshots.
 */

const getProjectAnalytics = catchAsync(async (req, res) => {
    const projectId = new mongoose.Types.ObjectId(req.params.id);
    const now = Date.now();

    // Cache Retrieval
    const cached = analyticsCache.projects[req.params.id];
    if (cached && (now - cached.timestamp < ANALYTICS_CACHE_TTL)) {
        return res.status(200).json({ status: 'success', data: cached.data });
    }

    // 1. Fetch Contextual Data (Completed tasks for velocity, active for momentum)
    const tasks = await Task.find({ project: projectId, isArchived: false })
        .populate('assignees', 'name avatar')
        .populate('assignee', 'name avatar')
        .sort({ updatedAt: -1 }) // Get most recently updated tasks first
        .lean();
    
    if (!tasks || tasks.length === 0) {
        return res.status(200).json({
            status: 'success',
            data: { 
                projectProgress: { finished: 0, total: 0 }, 
                memberMetrics: [], 
                bottlenecks: [],
                velocityMetrics: [] 
            }
        });
    }

    // 2. Project Progress
    const completedTasks = tasks.filter(t => t.status === TASK_STATUSES[2]);
    const projectProgress = { finished: completedTasks.length, total: tasks.length };

    // 3. Member Metrics (The Precision Engine)
    const statsByMember = {};

    tasks.forEach(t => {
        const members = t.assignees?.length > 0 ? t.assignees : (t.assignee ? [t.assignee] : []);
        
        members.forEach(m => {
            if (!m) return;
            const memberId = m._id?.toString() || 'unknown';
            if (!statsByMember[memberId]) {
                statsByMember[memberId] = { 
                    name: m.name || 'User', 
                    avatar: m.avatar,
                    active: 0, 
                    completed: 0, 
                    totalDuration: 0, 
                    completedCount: 0,
                    overdue: 0
                };
            }

            if (t.status === TASK_STATUSES[2]) {
                statsByMember[memberId].completed += 1;
                
                // Priority 1: High-precision timer data (actualTime) - stored in hours
                let workDuration = t.actualTime || 0;
                
                // Priority 2: Session-based aggregation - durations in seconds
                if (workDuration === 0 && t.timeSessions?.length > 0) {
                    const totalSeconds = t.timeSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
                    workDuration = totalSeconds / 3600;
                }

                // Priority 3: Simple lifecycle delta (Fallback)
                if (workDuration === 0 && t.createdAt && t.updatedAt) {
                    workDuration = (new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
                }

                statsByMember[memberId].totalDuration += workDuration;
                statsByMember[memberId].completedCount += 1;
            } else if (t.status !== TASK_STATUSES[3]) {
                statsByMember[memberId].active += 1;
                if (t.dueDate && new Date(t.dueDate) < now) {
                    statsByMember[memberId].overdue += 1;
                }
            }
        });
    });

    const memberMetrics = Object.values(statsByMember).map(m => ({
        name: m.name,
        avatar: m.avatar,
        active: m.active,
        completed: m.completed,
        overdue: m.overdue,
        avgDuration: m.completedCount > 0 ? parseFloat((m.totalDuration / m.completedCount).toFixed(1)) : 0
    }));

    // 4. Practical Lead-Time Velocity (Last 15 completed tasks)
    const velocityMetrics = completedTasks
        .slice(0, 15)
        .map(t => {
            let duration = t.actualTime || 0;
            if (duration === 0 && t.timeSessions?.length > 0) {
                duration = t.timeSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600;
            }
            if (duration === 0 && t.createdAt && t.updatedAt) {
                duration = (new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60);
            }
            return {
                taskId: t._id,
                title: t.title,
                duration: parseFloat(duration.toFixed(1)),
                date: t.updatedAt
            };
        })
        .reverse();

    // 5. Task Distribution Breakdown (Live Active State)
    const priorityBreakdown = { [TASK_PRIORITIES[3]]: 0, [TASK_PRIORITIES[2]]: 0, [TASK_PRIORITIES[1]]: 0, [TASK_PRIORITIES[0]]: 0 };
    const typeBreakdown = { [TASK_TYPES.TASK]: 0, [TASK_TYPES.FEATURE]: 0, [TASK_TYPES.BUG]: 0, [TASK_TYPES.IMPROVEMENT]: 0 };
    
    // Only includes non-completed, non-canceled tasks to reflect real-time project risk
    tasks.filter(t => t.status !== TASK_STATUSES[2] && t.status !== TASK_STATUSES[3]).forEach(t => {
        if (priorityBreakdown[t.priority] !== undefined) priorityBreakdown[t.priority]++;
        if (typeBreakdown[t.type] !== undefined) typeBreakdown[t.type]++;
    });

    // 6. Live Timeline (Burn-down Projection from Tasks Data)
    const timeline = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);

        const createdBefore = tasks.filter(t => new Date(t.createdAt || t.updatedAt) < nextD).length;
        const completedBefore = completedTasks.filter(t => new Date(t.updatedAt) < nextD).length;
        
        timeline.push({
            date: d.toISOString(),
            remaining: Math.max(0, createdBefore - completedBefore),
            total: createdBefore,
            completed: completedBefore
        });
    }

    // 7. Strategic Bottlenecks
    const bottlenecks = tasks
        .filter(t => t.status !== TASK_STATUSES[2] && t.status !== TASK_STATUSES[3] && t.priority === TASK_PRIORITIES[3])
        .slice(0, 5);

    const responseData = {
        projectProgress,
        memberMetrics,
        bottlenecks,
        velocityMetrics,
        priorityBreakdown,
        typeBreakdown,
        timeline
    };

    // Populate Cache
    analyticsCache.projects[req.params.id] = {
        data: responseData,
        timestamp: Date.now()
    };

    res.status(200).json({
        status: 'success',
        data: responseData
    });
});

const getWorkspaceAnalytics = catchAsync(async (req, res) => {
    const Project = require('../models/project.model');
    const userId = req.user._id;
    const userRole = req.user.role;
    const nowMs = Date.now();
    let cacheKey = `${userId}_workspace`;

    // Cache Retrieval (User-specific for workspace analytics)
    const cached = analyticsCache.workspace[cacheKey];
    if (cached && (nowMs - cached.timestamp < ANALYTICS_CACHE_TTL)) {
        return res.status(200).json({ status: 'success', data: cached.data });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch relevant projects
    let projectQuery = { deletedAt: null };
    if (userRole !== PROJECT_ROLES.ADMIN) {
        projectQuery['members.userId'] = userId;
        projectQuery['members.status'] = MEMBERSHIP_STATUS.ACTIVE;
    }

    const projects = await Project.find(projectQuery).select('_id name').lean();
    const projectIds = projects.map(p => p._id);

    // 2. High-Performance Aggregation for KPIs
    const matchQuery = {
        $or: [
            { project: { $in: projectIds } },
            { assignee: userId },
            { assignees: userId }
        ],
        isArchived: false
    };

    const [kpiStats, snapshots, bottlenecks] = await Promise.all([
        Task.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                        $sum: { $cond: [{ $eq: ["$status", TASK_STATUSES[2]] }, 1, 0] }
                    },
                    activeTasks: {
                        $sum: { $cond: [{ $and: [{ $ne: ["$status", TASK_STATUSES[2]] }, { $ne: ["$status", TASK_STATUSES[3]] }] }, 1, 0] }
                    }
                }
            }
        ]),
        ProjectSnapshot.find({ 
            project: { $in: projectIds }, 
            date: { $gte: thirtyDaysAgo } 
        }).select('phi chaosIndex').lean(),
        Task.aggregate([
            { 
                $match: { 
                    ...matchQuery, 
                    status: { $nin: [TASK_STATUSES[2], TASK_STATUSES[3]] } 
                } 
            },
            {
                $addFields: {
                    priorityWeight: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$priority", TASK_PRIORITIES[3]] }, then: 50 },
                                { case: { $eq: ["$priority", TASK_PRIORITIES[2]] }, then: 30 }
                            ],
                            default: 10
                        }
                    },
                    hoursToDue: {
                        $divide: [
                            { $subtract: ["$dueDate", now] },
                            1000 * 60 * 60
                        ]
                    }
                }
            },
            {
                $addFields: {
                    urgencyScore: {
                        $cond: [
                            { $lt: ["$hoursToDue", 0] },
                            100,
                            { $cond: [{ $lt: ["$hoursToDue", 48] }, 60, 0] }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    riskScore: { $add: ["$priorityWeight", "$urgencyScore", { $ifNull: ["$points", 1] }] }
                }
            },
            { $sort: { riskScore: -1 } },
            { $limit: 5 },
            { 
                $lookup: { 
                    from: 'projects', 
                    localField: 'project', 
                    foreignField: '_id', 
                    as: 'projectInfo' 
                } 
            },
            { $unwind: { path: "$projectInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    title: 1,
                    status: 1,
                    priority: 1,
                    dueDate: 1,
                    riskScore: 1,
                    project: {
                        _id: "$projectInfo._id",
                        name: "$projectInfo.name"
                    }
                }
            }
        ])
    ]);

    const kpis = kpiStats[0] || { totalTasks: 0, completedTasks: 0, activeTasks: 0 };
    
    // 3. Calculate global derived metrics
    const avgPhi = snapshots.length > 0 
        ? snapshots.reduce((sum, s) => sum + (s.phi || 0), 0) / snapshots.length 
        : 100;

    const maxChaos = snapshots.length > 0 
        ? Math.max(...snapshots.map(s => s.chaosIndex || 0)) 
        : 0;

    const responseData = {
        phi: Math.round(avgPhi),
        chaosIndex: Math.round(maxChaos),
        totalTasks: kpis.totalTasks,
        completedTasks: kpis.completedTasks,
        completionPct: kpis.totalTasks > 0 ? Math.round((kpis.completedTasks / kpis.totalTasks) * 100) : 0,
        activeProjects: projects.length,
        bottlenecks,
        forecast: { predictedFinishDate: null }
    };

    analyticsCache.workspace[cacheKey] = {
        data: responseData,
        timestamp: Date.now()
    };

    res.status(200).json({ status: 'success', data: responseData });
});

const getProjectLeaderboard = catchAsync(async (req, res) => {
    const Project = require('../models/project.model');
    const User = require('../models/user.model');
    const projectId = new mongoose.Types.ObjectId(req.params.id);

    // Fetch project members
    const project = await Project.findById(projectId).select('members').lean();
    if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found' });
    }

    const memberIds = project.members.map(m => m.userId);

    // Fetch users with Gamification data
    const users = await User.find({ _id: { $in: memberIds } })
        .select('name avatar gamification')
        .lean();

    // Sort by XP descending
    const leaderboard = users.map(u => ({
        _id: u._id,
        name: u.name,
        avatar: u.avatar,
        xp: u.gamification?.xp || 0,
        level: u.gamification?.level || 1,
        badges: u.gamification?.badges || []
    })).sort((a, b) => b.xp - a.xp);

    res.status(200).json({
        status: 'success',
        data: leaderboard
    });
});

module.exports = {
    getProjectAnalytics,
    getWorkspaceAnalytics,
    getProjectLeaderboard
};
