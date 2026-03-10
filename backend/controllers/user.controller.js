const User = require('../models/user.model');
const { z } = require('zod');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getFrontendUrl, formatUserResponse, sendStandardEmail } = require('../utils/helpers');

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

const verifyEmailChangeSchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newEmail: z.string().email('Please enter a valid email address'),
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
            data: formatUserResponse(user),
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
            data: formatUserResponse(user),
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove profile picture
// @route   DELETE /api/users/profile/avatar
// @access  Private
const removeAvatar = async (req, res, next) => {
    try {
        const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: defaultAvatar },
            { new: true, runValidators: true }
        );

        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        res.status(200).json({
            status: 'success',
            data: formatUserResponse(user),
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

// ─── Secure Email Change Flow ────────────────────────────────────────────────

// @desc    Step 1: Request OTP to current email for email change
// @route   POST /api/users/email/request-otp
// @access  Private
const requestEmailChangeOTP = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash and save
        user.emailChangeOTP = crypto.createHash('sha256').update(otp).digest('hex');
        user.emailChangeOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        await sendStandardEmail({
            to: user.email,
            subject: 'Your Klivra Verification Code',
            title: 'Email Change Request',
            body: 'You requested to change your email address. Here is your 6-digit verification code:',
            customHtml: `<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7B52FF; margin: 20px 0;">${otp}</div>`,
            footer: 'This code will expire in 10 minutes. If you did not request this, please ignore this email and your email will remain unchanged.'
        });

        res.status(200).json({ status: 'success', message: 'OTP sent to current email' });
    } catch (error) {
        next(error);
    }
};

// @desc    Step 2: Verify OTP & Propose New Email
// @route   POST /api/users/email/verify-otp
// @access  Private
const verifyEmailChangeOTP = async (req, res, next) => {
    try {
        const parsed = verifyEmailChangeSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400);
            return next(new Error(parsed.error.errors.map(e => e.message).join(', ')));
        }

        const { otp, newEmail } = parsed.data;

        // Check if new email is already in use by another user
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            res.status(400);
            return next(new Error('This email address is already in use'));
        }

        const user = await User.findById(req.user._id);

        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        if (!user.emailChangeOTP || user.emailChangeOTP !== hashedOTP || user.emailChangeOTPExpires < Date.now()) {
            res.status(400);
            return next(new Error('Invalid or expired OTP'));
        }

        // OTP is valid, generate Confirmation Token for new email
        const token = crypto.randomBytes(32).toString('hex');

        user.emailChangeToken = crypto.createHash('sha256').update(token).digest('hex');
        user.emailChangeTokenExpires = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
        user.pendingNewEmail = newEmail;
        // clear OTP fields
        user.emailChangeOTP = undefined;
        user.emailChangeOTPExpires = undefined;
        await user.save();

        const confirmUrl = `${getFrontendUrl()}/verify-email-change/${token}`;

        await sendStandardEmail({
            to: newEmail,
            subject: 'Confirm your new Klivra email',
            title: 'Confirm New Email',
            body: 'You requested to change your Klivra email to this address. Please click below to confirm:',
            ctaText: 'Confirm Email',
            ctaUrl: confirmUrl,
            footer: 'If you did not initiate this change, please ignore this email.'
        });

        res.status(200).json({ status: 'success', message: 'Confirmation link sent to new email' });
    } catch (error) {
        next(error);
    }
};

// @desc    Step 3: Confirm New Email via Token
// @route   GET /api/users/email/confirm-new/:token
// @access  Public (so user can just click from email client)
const confirmEmailChange = async (req, res, next) => {
    try {
        const { token } = req.params;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            emailChangeToken: hashedToken,
            emailChangeTokenExpires: { $gt: Date.now() }
        });

        if (!user || !user.pendingNewEmail) {
            res.status(400);
            return next(new Error('Invalid or expired confirmation link.'));
        }

        // Corner Case 1: The Race Condition
        // Check if the pending email was taken by another user during the wait period
        const emailTaken = await User.findOne({ email: user.pendingNewEmail });
        if (emailTaken) {
            // Block update, clear pending fields to force a new request
            user.pendingNewEmail = undefined;
            user.emailChangeToken = undefined;
            user.emailChangeTokenExpires = undefined;
            await user.save();

            res.status(400);
            return next(new Error('This email address has already been taken by another user. Please request a new change.'));
        }

        // Execution: Perform the swap
        const oldEmail = user.email;
        user.email = user.pendingNewEmail;
        user.isEmailVerified = true;

        // Corner Case 2: Garbage Collection
        user.pendingNewEmail = undefined;
        user.emailChangeToken = undefined;
        user.emailChangeTokenExpires = undefined;

        await user.save();

        // Corner Case 3: The Stale JWT Issue
        // Generate a new access token for the updated email to maintain the session
        const accessToken = jwt.sign(
            { id: user._id, email: user.email }, // Explicitly including email in payload as requested
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            status: 'success',
            message: 'Email address updated successfully',
            accessToken,
            data: {
                _id: user._id,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadAvatar,
    updateProfile,
    changePassword,
    removeAvatar,
    requestEmailChangeOTP,
    verifyEmailChangeOTP,
    confirmEmailChange
};
