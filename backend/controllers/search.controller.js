const Task = require('../models/task.model');
const Project = require('../models/project.model');

// @desc    Global Search across Projects and Tasks using $text and textScore
// @route   GET /api/search?q=searchstring
// @access  Private
exports.globalSearch = async (req, res, next) => {
    try {
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({ status: 'error', message: 'Search query is required' });
        }

        // 1. Search Tasks (only in projects the user has access to)
        // Since $text doesn't easily support cross-collection JOIN filtering, 
        // we first get projects the user has access to, then filter tasks within those projects
        const userProjects = await Project.find({
            "teamMembers.user": req.user._id
        }).select('_id').lean();

        const projectIds = userProjects.map(p => p._id);

        const tasksPromise = Task.find(
            { $text: { $search: query }, project: { $in: projectIds } },
            { score: { $meta: "textScore" } }
        )
            .sort({ score: { $meta: "textScore" } })
            .populate('project', 'name')
            .limit(10)
            .lean();

        // 2. Search Projects
        let projectsPromise;
        if (req.user.role === 'admin') {
            projectsPromise = Project.find(
                { $text: { $search: query } },
                { score: { $meta: "textScore" } }
            ).sort({ score: { $meta: "textScore" } }).limit(5).lean();
        } else {
            projectsPromise = Project.find(
                { $text: { $search: query }, "teamMembers.user": req.user._id },
                { score: { $meta: "textScore" } }
            ).sort({ score: { $meta: "textScore" } }).limit(5).lean();
        }

        const [tasks, projects] = await Promise.all([tasksPromise, projectsPromise]);

        res.status(200).json({
            status: 'success',
            data: {
                tasks,
                projects
            }
        });

    } catch (err) {
        next(err);
    }
};
