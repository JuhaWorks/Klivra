const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Project = require('../models/project.model');

/**
 * Ensures user is authenticated via JWT.
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        res.status(401);
        return next(new Error('Not authorized, no access token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user || req.user.isActive === false || req.user.isBanned) {
            res.status(401);
            return next(new Error(req.user?.isBanned ? 'Your account has been suspended' : 'Not authorized, user not found or account deactivated'));
        }

        next();
    } catch (error) {
        res.status(401);
        if (error.name === 'TokenExpiredError') {
            next(new Error('TokenExpiredError'));
        } else {
            next(new Error('Not authorized, token failed'));
        }
    }
};

/**
 * Optionally populates req.user if a valid token is present.
 */
const optionalProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (req.user && (req.user.isActive === false || req.user.isBanned)) {
            req.user = null;
        }
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

/**
 * Authorize specific globel user roles.
 */
const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403);
        return next(new Error(`User role '${req.user ? req.user.role : 'Unknown'}' is not authorized to access this route`));
    }
    next();
};

/**
 * Explicitly verify Administrator status.
 */
const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403);
        return next(new Error('Access denied. Administrator privileges required.'));
    }
};

/**
 * Blocks mutations on archived projects.
 */
const isNotArchived = async (req, res, next) => {
    try {
        const projectId = req.params.id || req.params.projectId;
        if (!projectId) return next();

        const project = await Project.findById(projectId);
        if (project && project.status === 'Archived') {
            res.status(403);
            return next(new Error('Archived projects are strictly read-only.'));
        }
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * RBAC for Project-Level Access.
 */
const authorizeProjectAccess = (roles = []) => async (req, res, next) => {
    try {
        const projectId = req.params.id || req.params.projectId;
        const project = await Project.findById(projectId);

        if (!project) {
            res.status(404);
            return next(new Error('Project not found'));
        }

        const member = project.members.find(m => m.userId.toString() === req.user._id.toString());
        const isMember = member && member.status === 'active';
        const hasAccess = isMember || req.user.role === 'Admin';

        if (!hasAccess) {
            res.status(403);
            return next(new Error('You do not have the required permissions for this action.'));
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    protect,
    optionalProtect,
    authorizeRoles,
    verifyAdmin,
    isNotArchived,
    authorizeProjectAccess
};
