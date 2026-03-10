/**
 * Wraps an asynchronous function (like an Express controller) to catch any potential errors
 * and pass them to the global error handling middleware.
 * 
 * @param {Function} fn - The asynchronous function to wrap.
 * @returns {Function} - A wrapped function that calls the original function and catches errors.
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

module.exports = catchAsync;
