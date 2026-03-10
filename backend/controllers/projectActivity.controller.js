const ProjectActivity = require('../models/projectActivity.model');

// @desc    Get project activity logs
// @route   GET /api/projects/:id/activity
const getProjectActivity = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const logs = await ProjectActivity.find({ projectId: req.params.id })
            .populate('actorId', 'name email avatar')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await ProjectActivity.countDocuments({ projectId: req.params.id });

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

module.exports = {
    getProjectActivity
};
