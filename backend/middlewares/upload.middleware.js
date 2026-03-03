const multer = require('multer');
const { avatarStorage } = require('../config/cloudinary');

// Accept only image MIME types
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        req.fileValidationError = 'Only image files are allowed';
        cb(null, false);
    }
};

// Build the raw multer handler
const _multerHandler = multer({
    storage: avatarStorage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('avatar');

// Express v5 compatibility: wrap the callback-based multer handler in a Promise
// so that any MulterError it throws is passed to next() automatically.
const uploadSingle = (req, res, next) => {
    _multerHandler(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // e.g. file too large
            res.status(400);
            return next(new Error(err.message));
        }
        if (err) {
            res.status(400);
            return next(new Error(err.message || 'File upload error'));
        }
        next();
    });
};

module.exports = { uploadSingle };
