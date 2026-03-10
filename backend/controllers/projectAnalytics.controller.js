const Project = require('../models/project.model');
const Task = require('../models/Task.model');
const mongoose = require('mongoose');

// @desc    Get project insights and analytics
// @route   GET /api/projects/:id/insights
const getProjectInsights = async (req, res, next) => {
    try {
        const { id } = req.params;
        const now = new Date();

        const insights = await Project.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $lookup: {
                    from: 'activities', // Map exactly to activity collection name
                    let: { projectId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$projectId', '$$projectId'] },
                                        { $gte: ['$createdAt', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'recentActivities'
                }
            },
            {
                $project: {
                    name: 1,
                    endDate: 1,
                    status: 1,
                    daysRemaining: {
                        $ceil: {
                            $divide: [
                                { $subtract: ['$endDate', now] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    },
                    activityVelocity: { $size: '$recentActivities' },
                    healthScore: {
                        $switch: {
                            branches: [
                                {
                                    case: { $lt: [{ $subtract: ['$endDate', now] }, 0] },
                                    then: 'Overdue'
                                },
                                {
                                    case: { $lt: [{ $subtract: ['$endDate', now] }, 7 * 24 * 60 * 60 * 1000] },
                                    then: 'At Risk'
                                }
                            ],
                            default: 'On Track'
                        }
                    }
                }
            }
        ]);

        if (!insights || insights.length === 0) {
            res.status(404);
            throw new Error('Project insights not found');
        }

        res.status(200).json({ status: 'success', data: insights[0] });
    } catch (error) {
        next(error);
    }
};

// @desc    Get overall workspace statistics
// @route   GET /api/projects/workspace/stats
const getWorkspaceStats = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // 1. Get all active projects for the user
        const projects = await Project.find({
            'members.userId': userId,
            deletedAt: null
        });

        const projectIds = projects.map(p => p._id);
        const activeProjectsCount = projects.filter(p => p.status === 'Active').length;

        // 2. Aggregate task statistics across these projects
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

        const stats = taskStats[0] || {
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            pendingTasks: 0
        };

        const completionPct = stats.totalTasks > 0
            ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
            : 0;

        res.status(200).json({
            status: 'success',
            data: {
                activeProjects: activeProjectsCount,
                totalProjects: projects.length,
                totalTasks: stats.totalTasks,
                completedTasks: stats.completedTasks,
                inProgressTasks: stats.inProgressTasks,
                pendingTasks: stats.pendingTasks,
                completionPct
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProjectInsights,
    getWorkspaceStats
};
