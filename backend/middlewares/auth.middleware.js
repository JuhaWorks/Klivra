const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
    let token;

    // Strict Bearer token check for Access Token
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401);
        return next(new Error('Not authorized, no access token provided'));
    }

    try {
        // Verify token authenticity
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from the token payload (excluding password)
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user || req.user.isActive === false) {
            res.status(401);
            return next(new Error('Not authorized, user not found or account deactivated'));
        }

        next();
    } catch (error) {
        res.status(401);
        if (error.name === 'TokenExpiredError') {
            next(new Error('TokenExpiredError')); // Let the frontend axios interceptor catch this
        } else {
            next(new Error('Not authorized, token failed'));
        }
    }
};

// Middleware to authorize specific roles
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // req.user must be set by the 'protect' middleware before calling this
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403); // Forbidden
            return next(new Error(`User role '${req.user ? req.user.role : 'Unknown'}' is not authorized to access this route`));
        }
        next();
    };
};

// Extremely strict middleware explicitly verifying Admin status
const verifyAdmin = (req, res, next) => {
    // protect middleware must run before this
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403);
        return next(new Error('Access denied. Administrator privileges required.'));
    }
};

// Middleware to optionally protect routes (populates req.user if token valid, but doesn't 401 if missing)
const optionalProtect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = { protect, optionalProtect, authorizeRoles, verifyAdmin };
