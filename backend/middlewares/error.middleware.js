const logger = require('../utils/logger');

/**
 * Global Error Handler Middleware
 * Handles all errors thrown in the application, specifically MongoDB related corner cases.
 */
const globalErrorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error for developers
    if (err.status !== 404) {
        logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    }

    // Mongoose bad ObjectId (CastError)
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = new Error(message);
        error.statusCode = 404;
    }

    // Mongoose duplicate key (E11000)
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = new Error(message);
        error.statusCode = 400;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = new Error(message);
        error.statusCode = 400;
    }

    // Zod validation error (if using Zod middleware)
    if (err.name === 'ZodError') {
        const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        error = new Error(message);
        error.statusCode = 400;
    }

    const statusCode = error.statusCode || res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode).json({
        status: 'error',
        message: error.message || 'Server Error',
        requiresReactivation: err.requiresReactivation || false,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
};

module.exports = globalErrorHandler;
