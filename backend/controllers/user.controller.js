const User = require('../models/user.model');
const { z } = require('zod');

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
    name: z.string().min(1, 'Name cannot be empty').max(50, 'Name must be 50 characters or fewer').optional(),
    status: z.enum(['Online', 'Away', 'Do Not Disturb', 'Offline']).optional(),
    customMessage: z.string().max(150, 'Custom message must be 150 characters or fewer').optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

// @desc    Upload / replace profile picture
// @route   POST /api/users/profile/avatar
// @access  Private
const uploadAvatar = async (req, res, next) => {
    try {
        // multer-storage-cloudinary puts the secure URL on req.file.path
        if (!req.file) {
            // imageFilter rejected the file (wrong MIME type) or no file sent
            const msg = req.fileValidationError || 'Please upload an image file';
            res.status(400);
            return next(new Error(msg));
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: req.file.path },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            status: 'success',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                status: user.status,
                customMessage: user.customMessage,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile info (name, status, customMessage)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        // Validate with Zod
        const parsed = updateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.errors.map(e => e.message).join(', ');
            res.status(400);
            return next(new Error(message));
        }

        const { name, status, customMessage } = parsed.data;

        // Build update object with only the fields that were provided
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (status !== undefined) updates.status = status;
        if (customMessage !== undefined) updates.customMessage = customMessage;

        if (Object.keys(updates).length === 0) {
            res.status(400);
            return next(new Error('No valid fields provided to update'));
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            status: 'success',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                status: user.status,
                customMessage: user.customMessage,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Change password (requires current password verification)
// @route   PUT /api/users/profile/password
// @access  Private
const changePassword = async (req, res, next) => {
    try {
        // Validate with Zod
        const parsed = changePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.errors.map(e => e.message).join(', ');
            res.status(400);
            return next(new Error(message));
        }

        const { currentPassword, newPassword } = parsed.data;

        // Re-fetch with password (select: false in schema hides it by default)
        const user = await User.findById(req.user._id).select('+password');

        // Verify current password against stored hash
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            res.status(400);
            return next(new Error('Current password is incorrect'));
        }

        // Set the new password and save — the pre-save hook will hash it
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Password updated successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadAvatar, updateProfile, changePassword };
