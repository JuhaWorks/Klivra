const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const Audit = require('../models/audit.model');
const { protect } = require('../middlewares/access.middleware');
const catchAsync = require('../utils/catchAsync');
const { formatUserResponse } = require('../utils/helpers');

// Secure Dev Endpoints
/**
 * GET /api/dev/seed-radar/:email
 * Generates test data for a specific user to verify Radar Chart functionality.
 */
router.get('/seed-radar/:email', catchAsync(async (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // 1. Find User
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: `User ${email} not found` });

    // 2. Create Project
    const project = await Project.create({
        name: "Strategic Radar Test Workspace",
        description: "Automated dummy project for testing high-density radar chart visualizations.",
        category: "Testing",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "Active",
        createdBy: user._id,
        members: [{ userId: user._id, role: 'Manager', status: 'active' }]
    });

    // 3. Create 50 Tasks
    const domains = ['Strategic', 'Engineering', 'Sustainability', 'Operations'];
    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    const tasksToCreate = [];

    for (let i = 1; i <= 50; i++) {
        tasksToCreate.push({
            title: `Radar Test Task #${i}`,
            description: `Auto-generated task for domain saturation testing.`,
            status: 'Pending',
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            domain: domains[Math.floor(Math.random() * domains.length)],
            project: project._id,
            assignees: [user._id],
            assignee: user._id
        });
    }

    await Task.insertMany(tasksToCreate);

    // 4. Prime Radar Chart (Update gamification.specialties)
    const newSpecialties = new Map([
        ['Strategic', Math.floor(Math.random() * 500) + 300],
        ['Engineering', Math.floor(Math.random() * 500) + 300],
        ['Sustainability', Math.floor(Math.random() * 500) + 300],
        ['Operations', Math.floor(Math.random() * 500) + 300]
    ]);

    user.gamification = user.gamification || {};
    user.gamification.specialties = newSpecialties;
    user.gamification.xp = (user.gamification.xp || 0) + 5000;
    
    await user.save();

    res.status(200).json({
        status: 'success',
        message: 'Radar data seeded successfully.',
        data: {
            userId: user._id,
            projectId: project._id,
            tasksCreated: tasksToCreate.length,
            newSpecialties: Object.fromEntries(newSpecialties)
        }
    });
}));

router.use(protect);

/**
 * GET /api/dev/inspect
 * Returns the raw gamification state for the authenticated user.
 */
router.get('/inspect', async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const history = await Audit.find({ 
            user: user._id,
            action: 'EntityCreate',
            entityType: 'Task'
        }).limit(50).sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            data: {
                rawGamification: user.gamification,
                formatted: formatUserResponse(user).specialties,
                recentAuditCount: history.length,
                recentAudits: history.map(h => ({
                    date: h.createdAt,
                    type: h.details?.type,
                    status: h.details?.status
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

    res.status(200).json({
        status: 'success',
        message: 'Radar data seeded successfully.',
        data: {
            userId: user._id,
            projectId: project._id,
            tasksCreated: tasksToCreate.length,
            newSpecialties: Object.fromEntries(newSpecialties)
        }
    });
}));

/**
 * GET /api/dev/prime
 * Triggers a manual re-calculation of specialties if needed.
 */
router.get('/prime', async (req, res, next) => {
    try {
        // This endpoint can be used to trigger internal re-syncs if required.
        // For now, we rely on the vanguardPrime.js script for deep injection.
        res.status(200).json({
            status: 'success',
            message: 'Dev Priming endpoint active. Use vanguardPrime.js for high-density injection.'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
