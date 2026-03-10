const ProjectMemberService = require('../services/projectMember.service');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Add member to project (Idempotent)
 * @route   POST /api/projects/:id/members
 */
const addMember = catchAsync(async (req, res) => {
    const { email, role } = req.body;

    const result = await ProjectMemberService.addMember({
        projectId: req.params.id,
        email,
        role,
        actorId: req.user._id,
        io: req.io,
    });

    res.status(200).json(result);
});

/**
 * @desc    Update member role
 * @route   PUT /api/projects/:id/members/:userId
 */
const updateMemberRole = catchAsync(async (req, res) => {
    const { role } = req.body;

    const result = await ProjectMemberService.updateMemberRole({
        projectId: req.params.id,
        userId: req.params.userId,
        role,
        actorId: req.user._id,
        io: req.io,
    });

    res.status(200).json(result);
});

/**
 * @desc    Remove member from project
 * @route   DELETE /api/projects/:id/members/:userId
 */
const removeMember = catchAsync(async (req, res) => {
    const result = await ProjectMemberService.removeMember({
        projectId: req.params.id,
        userId: req.params.userId,
        actorId: req.user._id,
        io: req.io,
    });

    res.status(200).json(result);
});

module.exports = {
    addMember,
    updateMemberRole,
    removeMember
};