const Project = require('../models/project.model');
const { logActivity } = require('../utils/activityLogger');
const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

// @desc    Get all projects (filtered by soft-delete)
// @route   GET /api/projects
const getProjects = async (req, res, next) => {
    try {
        const showArchived = req.query.archived === 'true';

        const query = {
            'members.userId': req.user._id,
        };

        if (showArchived) {
            query.deletedAt = { $ne: null };
        } else {
            query.deletedAt = null;
        }

        const projects = await Project.find(query).sort('-createdAt');

        res.status(200).json({ status: 'success', results: projects.length, data: projects });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
const getProject = async (req, res, next) => {
    try {
        // Corner Case 4: The Ghost Project
        // Find by ID regardless of membership first to distinguish between 404 and 403
        const project = await Project.findById(req.params.id)
            .populate('members.userId', 'name email avatar');

        if (!project || project.deletedAt !== null) {
            res.status(404);
            throw new Error('Project not found or has been deleted.');
        }

        // Corner Case 5: Access Denied
        const isMember = project.members.some(m => m.userId?._id.toString() === req.user._id.toString());
        if (!isMember) {
            res.status(403);
            throw new Error('Access denied. You are not a member of this project.');
        }

        res.status(200).json({ status: 'success', data: project });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new project
// @route   POST /api/projects
const createProject = async (req, res, next) => {
    try {
        if (req.user.role === 'Admin') {
            res.status(403);
            throw new Error('Administrators are restricted from creating projects. Please use a Manager or Developer account.');
        }
        const { name, description, category, startDate, endDate } = req.body;

        const project = await Project.create({
            name,
            description,
            category,
            startDate,
            endDate,
            members: [{ userId: req.user._id, role: 'Manager' }]
        });

        await logActivity(project._id, req.user._id, 'PROJECT_CREATED', { name });

        res.status(201).json({ status: 'success', data: project });
    } catch (error) {
        next(error);
    }
};

// @desc    Update project details (with OCC)
// @route   PUT /api/projects/:id
const updateProject = async (req, res, next) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, deletedAt: null });

        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // version for OCC
        const currentVersion = project.__v;

        // If coverImageUrl is being updated/removed and we have a Cloudinary ID, clean it up
        if (req.body.coverImageUrl !== undefined && req.body.coverImageUrl !== project.coverImageUrl) {
            if (project.coverImageId) {
                // If the new body doesn't provide a new coverImageId, we assume it's a manual URL change
                // delete the old asset
                try {
                    await cloudinary.uploader.destroy(project.coverImageId);
                    // Clear the ID since the new URL is likely external
                    if (!req.body.coverImageId) {
                        project.coverImageId = null;
                    }
                } catch (err) {
                    logger.error(`Cloudinary Cleanup Error: ${err.message}`);
                }
            }
        }

        // Update fields
        Object.keys(req.body).forEach(key => {
            if (['name', 'description', 'category', 'startDate', 'endDate', 'status', 'coverImageUrl', 'coverImageId'].includes(key)) {
                project[key] = req.body[key];
            }
        });

        // Save with OCC check
        try {
            await project.save();
        } catch (saveError) {
            if (saveError.name === 'VersionError') {
                res.status(409); // Conflict
                throw new Error('Concurrency Conflict: This project was updated by another user. Please refresh and try again.');
            }
            throw saveError;
        }

        await logActivity(project._id, req.user._id, 'PROJECT_UPDATED', req.body);

        // Broadcast update via Socket.io
        req.io.to(`project_${project._id}`).emit('projectUpdated', {
            id: project._id,
            update: req.body
        });

        // Live Action Toast Notification
        req.io.to(`project_${project._id}`).emit('projectActivity', {
            userName: req.user.name,
            action: 'updated the project details'
        });

        res.status(200).json({ status: 'success', data: project });
    } catch (error) {
        next(error);
    }
};

// @desc    Soft-Delete project
// @route   DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        project.deletedAt = Date.now();
        project.status = 'Archived';
        await project.save();

        await logActivity(project._id, req.user._id, 'PROJECT_DELETED', {
            name: project.name,
            ipAddress: req.ip
        }, 'Security');

        res.status(200).json({ status: 'success', message: 'Project moved to trash' });
    } catch (error) {
        next(error);
    }
};

// @desc    Restore soft-deleted project
// @route   POST /api/projects/:id/restore
const restoreProject = async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        project.deletedAt = null;
        project.status = 'Active';
        await project.save();

        await logActivity(project._id, req.user._id, 'PROJECT_RESTORED');

        res.status(200).json({ status: 'success', data: project });
    } catch (error) {
        next(error);
    }
};

// Image uploads and assets

// @desc    Upload project cover image
// @route   POST /api/projects/:id/image
const uploadProjectImage = async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400);
            throw new Error('Please upload an image file');
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            res.status(404);
            throw new Error('Project not found');
        }

        // Delete old image from Cloudinary if exists
        if (project.coverImageId) {
            await cloudinary.uploader.destroy(project.coverImageId);
        }

        // multer-storage-cloudinary provides path (URL) and filename (ID)
        project.coverImageUrl = req.file.path;
        project.coverImageId = req.file.filename;

        await project.save();

        await logActivity(project._id, req.user._id, 'PROJECT_UPDATED', { coverImageUrl: project.coverImageUrl });

        // Broadcast to room
        req.io.to(`project_${project._id}`).emit('projectUpdated', {
            id: project._id,
            update: { coverImageUrl: project.coverImageUrl }
        });

        // Live Action Toast Notification
        req.io.to(`project_${project._id}`).emit('projectActivity', {
            userName: req.user.name,
            action: 'changed the project cover image'
        });

        res.status(200).json({ status: 'success', data: project });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    restoreProject,
    uploadProjectImage
};
