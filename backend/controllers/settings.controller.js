const mongoose = require('mongoose');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Task = require('../models/Task.model');

// @desc    Update user profile details (Name, About/Bio)
// @route   PUT /api/settings/profile
// @access  Private
const updateProfile = async (req, res, next) => {
    try {
        const { name, customMessage } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        if (name) user.name = name;
        if (customMessage !== undefined) user.customMessage = customMessage.substring(0, 250); // Hard cut at 250 as requested, though schema is 150

        const updatedUser = await user.save();

        res.status(200).json({
            status: 'success',
            data: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                avatar: updatedUser.avatar,
                role: updatedUser.role,
                status: updatedUser.status,
                customMessage: updatedUser.customMessage,
                isActive: updatedUser.isActive
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user security details (Email, Password)
// @route   PUT /api/settings/security
// @access  Private
const updateSecurity = async (req, res, next) => {
    try {
        const { email, currentPassword, newPassword } = req.body;

        // Note: Using +password to ensure the field is selected for matching
        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        let changesMade = false;

        // Handle Email Update
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                res.status(400);
                return next(new Error('Email is already in use by another account'));
            }
            user.email = email;
            changesMade = true;
        }

        // Handle Password Update
        if (currentPassword && newPassword) {
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                res.status(400);
                return next(new Error('Incorrect current password'));
            }
            user.password = newPassword;
            changesMade = true;
        } else if ((currentPassword && !newPassword) || (!currentPassword && newPassword)) {
            res.status(400);
            return next(new Error('Both current password and new password are required to change password'));
        }

        if (changesMade) {
            await user.save();
        }

        res.status(200).json({
            status: 'success',
            message: 'Security settings updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Deactivate user account
// @route   PUT /api/settings/deactivate
// @access  Private
const deactivateAccount = async (req, res, next) => {
    try {
        const { duration } = req.body;

        await User.deactivateAndCleanUp(req.user.id, duration);

        const isProd = process.env.NODE_ENV === 'production';
        res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });

        res.status(200).json({
            status: 'success',
            message: 'Account successfully deactivated'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete user account and clean up associations (Transaction)
// @route   DELETE /api/settings/delete
// @access  Private
const deleteAccount = async (req, res, next) => {
    try {
        console.log('🔴 DELETE /api/settings/delete - deleteAccount called');
        console.log('User ID:', req.user?.id);
        await User.deleteAndCleanUp(req.user.id);

        const isProd = process.env.NODE_ENV === 'production';
        res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });

        res.status(200).json({
            status: 'success',
            message: 'Account and associated references successfully deleted'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    updateProfile,
    updateSecurity,
    deactivateAccount,
    deleteAccount
};
