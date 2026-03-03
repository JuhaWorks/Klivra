const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
    let token;

    // Check if token exists in cookies
    if (req.cookies && req.cookies.token && req.cookies.token !== 'none') {
        token = req.cookies.token;
    }
    // Fallback: Check headers if cookie is missing (useful for mobile apps where cookies aren't as standard)
    else if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            // Verify token authenticity
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token payload (excluding password)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                // Clear the stale cookie so the browser doesn't keep sending it
                // Use sameSite:'none' here as well so the clear operation works when
                // the frontend is on a different origin/port.
                res.clearCookie('token', { httpOnly: true, sameSite: 'none' });
                res.status(401);
                return next(new Error('Not authorized, user not found'));
            }

            next();
        } catch (error) {
            // Clear the invalid/expired token cookie
            res.clearCookie('token', { httpOnly: true, sameSite: 'none' });
            res.status(401);
            next(new Error('Not authorized, token failed'));
        }
    } else {
        // If no token was found at all
        res.status(401);
        next(new Error('Not authorized, no token'));
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

module.exports = { protect, authorizeRoles };
