const Audit = require('../models/audit.model');
const ProjectActivity = require('../models/projectActivity.model');

// @desc    Get paginated audit/activity logs
// @route   GET /api/audit
// @access  Private (Admin/Manager)
const getLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const skip = (page - 1) * limit;
        const entityId = req.query.entityId;

        // Determine which model to use. If entityId is present, we check ProjectActivity first
        // as the Project Engine uses it specifically.
        let logs;
        let total;

        if (entityId) {
            // Fetch from ProjectActivity model
            total = await ProjectActivity.countDocuments({ projectId: entityId });
            logs = await ProjectActivity.find({ projectId: entityId })
                .populate('actorId', 'name email avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Map ProjectActivity to a consistent format for both Project View and Global Feed
            logs = logs.map(log => ({
                ...log,
                user: log.actorId, // Compatibility for Global Feed
                details: { title: log.metadata?.name || log.action.replace(/_/g, ' ') }, // Compatibility for Global Feed
                isProjectActivity: true
            }));
        } else {
            // General system audit logs
            const typeFilter = req.query.type;
            const query = typeFilter ? { entityType: typeFilter } : {};

            total = await Audit.countDocuments(query);
            logs = await Audit.find(query)
                .populate('user', 'name email avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
        }

        res.status(200).json({
            status: 'success',
            count: logs.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            data: logs,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLogs
};
