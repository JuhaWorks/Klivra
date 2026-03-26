/**
 * Custom NoSQL Injection Protection Middleware
 * Compatible with Express 5.x
 * Recursively removes keys starting with $ or containing .
 */

const sanitize = (obj) => {
    if (obj instanceof Object) {
        for (const key in obj) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else if (obj[key] instanceof Object) {
                sanitize(obj[key]);
            }
        }
    }
    return obj;
};

const sanitizationMiddleware = (req, res, next) => {
    // Sanitize req.body and req.params (mutable)
    if (req.body) sanitize(req.body);
    if (req.params) sanitize(req.params);

    // Sanitize req.query
    // In Express 5, req.query is often read-only or has strict behavior.
    // We create a sanitized copy and attempt to reassign it.
    if (req.query) {
        const sanitizedQuery = sanitize({ ...req.query });
        try {
            // Attempt reassignment for standard Express behavior
            req.query = sanitizedQuery;
        } catch (e) {
            // Fallback: If req.query is read-only, we manually clear and re-populate
            // though this is rarely needed if 'query parser' is standard.
            Object.keys(req.query).forEach(key => {
                if (key.startsWith('$') || key.includes('.')) {
                    delete req.query[key];
                }
            });
        }
    }

    next();
};

module.exports = { sanitizationMiddleware };
