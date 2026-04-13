const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * 1. Request Logging Middleware (Morgan)
 */
const stream = { write: (message) => logger.http(message.trim()) };
const morganMiddleware = morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    { stream, skip: () => false }
);

/**
 * 2. Zod Validation Wrapper
 */
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({ body: req.body, query: req.query, params: req.params });
        next();
    } catch (err) { next(err); }
};

/**
 * 3. Global Error Handler
 */
const globalErrorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Prioritize statusCode set in middleware, then error object, then default to 500
    const statusCode = (res.statusCode && res.statusCode !== 200) 
        ? res.statusCode 
        : (error.statusCode || err.statusCode || 500);
    if (statusCode !== 404) {
        logger.error(`${statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    }

    if (err.name === 'CastError') {
        error = new Error(`Resource not found with id of ${err.value}`);
        error.statusCode = 404;
    } else if (err.code === 11000) {
        error = new Error('Duplicate field value entered');
        error.statusCode = 400;
    } else if (err.name === 'ValidationError') {
        error = new Error(Object.values(err.errors).map(val => val.message).join(', '));
        error.statusCode = 400;
    } else if (err.name === 'ZodError') {
        error = new Error(err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
        error.statusCode = 400;
    } else if (err.name === 'TokenExpiredError' || err.message === 'TokenExpiredError') {
        error = new Error('Your session has expired. Please login again.');
        error.statusCode = 401;
    } else if (err.name === 'JsonWebTokenError' || err.message === 'JsonWebTokenError') {
        error = new Error('Invalid session. Please login again.');
        error.statusCode = 401;
    }

    const finalStatusCode = error.statusCode || 500;
    res.status(finalStatusCode).json({
        status: 'error',
        message: error.message || 'Server Error',
        requiresReactivation: err.requiresReactivation || false,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
};

module.exports = {
    morganMiddleware,
    validate,
    globalErrorHandler
};
