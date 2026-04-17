const User = require('../models/user.model');
const axios = require('axios');
const { z } = require('zod');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { cloudinary } = require('../config/cloudinary');
const { getFrontendUrl, formatUserResponse, sendStandardEmail } = require('../utils/helpers');
const { logSecurityEvent } = require('../utils/activityLogger');

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
    name: z.string().min(1, 'Name cannot be empty').max(50, 'Name must be 50 characters or fewer').optional(),
    status: z.enum(['Online', 'Away', 'Do Not Disturb', 'Offline']).optional(),

    location: z.string().max(100, 'Location must be 100 characters or fewer').optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    bio: z.string().max(1000, 'Bio must be 1000 characters or fewer').optional(),
    skills: z.array(z.string()).optional(),
    coverImage: z.string().optional(),
    interfacePrefs: z.object({
        showTeamClock: z.boolean().optional(),
        showWeather: z.boolean().optional(),
        showApod: z.boolean().optional()
    }).optional(),
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
        if (!req.file) {
            const msg = req.fileValidationError || 'Please upload an image file';
            res.status(400);
            return next(new Error(msg));
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        // --- Asset Hygiene: Delete old Cloudinary image if it exists ---
        if (user.avatar && user.avatar.includes('cloudinary.com')) {
            try {
                // Extracts "klivra/avatars/XXXXXX" from the URL
                const parts = user.avatar.split('/');
                const publicIdWithExt = parts.slice(-3).join('/'); // [folder, subfolder, filename.ext]
                const publicId = publicIdWithExt.split('.')[0];
                
                await cloudinary.uploader.destroy(publicId);
                console.log(`[STORAGE] Deleted old avatar asset: ${publicId}`);
            } catch (err) {
                console.warn('[STORAGE] Failed to delete old avatar asset:', err.message);
                // We don't block the upload if deletion fails
            }
        }

        user.avatar = req.file.path;
        await user.save();

        res.status(200).json({
            status: 'success',
            data: formatUserResponse(user),
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload / replace cover banner
// @route   POST /api/users/profile/cover
// @access  Private
const uploadCoverImage = async (req, res, next) => {
    try {
        if (!req.file) {
            const msg = req.fileValidationError || 'Please upload an image file';
            res.status(400);
            return next(new Error(msg));
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        // --- Asset Hygiene: Delete old Cloudinary image if it exists ---
        if (user.coverImage && user.coverImage.includes('cloudinary.com')) {
            try {
                const parts = user.coverImage.split('/');
                const publicIdWithExt = parts.slice(-3).join('/');
                const publicId = publicIdWithExt.split('.')[0];
                
                await cloudinary.uploader.destroy(publicId);
                console.log(`[STORAGE] Deleted old cover asset: ${publicId}`);
            } catch (err) {
                console.warn('[STORAGE] Failed to delete old cover asset:', err.message);
            }
        }

        user.coverImage = req.file.path;
        await user.save();

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

        const { name, status, location, lat, lon } = parsed.data;

        // Build update object with only the fields that were provided
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (status !== undefined) updates.status = status;

        
        if (location !== undefined) {
            updates.location = location;
            // Automatic Timezone Resolution
            if (process.env.OPENWEATHER_API_KEY) {
                try {
                    // Use coordinates for high precision if available, else fall back to city name
                    const params = (lat && lon) 
                        ? { lat, lon, appid: process.env.OPENWEATHER_API_KEY }
                        : { q: location, appid: process.env.OPENWEATHER_API_KEY };

                    const weatherRes = await axios.get('https://api.openweathermap.org/data/2.5/weather', { params });
                    
                    if (weatherRes.data && weatherRes.data.timezone !== undefined) {
                        updates.timezoneOffset = weatherRes.data.timezone; // Offset in seconds
                        updates.timezoneName = weatherRes.data.name; 
                    }
                } catch (err) {
                    console.warn(`[TIMEZONE] Failed to resolve timezone for ${location}: ${err.message}`);
                }
            }
        }

        if (req.body.bio !== undefined) updates.bio = req.body.bio;
        if (req.body.skills !== undefined) updates.skills = req.body.skills;
        if (req.body.coverImage !== undefined) updates.coverImage = req.body.coverImage;

        if (req.body.interfacePrefs) {
            if (req.body.interfacePrefs.showTeamClock !== undefined) {
                updates['interfacePrefs.showTeamClock'] = req.body.interfacePrefs.showTeamClock;
            }
            if (req.body.interfacePrefs.showWeather !== undefined) {
                updates['interfacePrefs.showWeather'] = req.body.interfacePrefs.showWeather;
            }
            if (req.body.interfacePrefs.showApod !== undefined) {
                updates['interfacePrefs.showApod'] = req.body.interfacePrefs.showApod;
            }
        }

        if (Object.keys(updates).length === 0) {
            res.status(400);
            return next(new Error('No valid fields provided to update'));
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { returnDocument: 'after', runValidators: true }
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
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        // --- Asset Hygiene: Delete Cloudinary image if it exists ---
        if (user.avatar && user.avatar.includes('cloudinary.com')) {
            try {
                const parts = user.avatar.split('/');
                const publicIdWithExt = parts.slice(-3).join('/');
                const publicId = publicIdWithExt.split('.')[0];
                
                await cloudinary.uploader.destroy(publicId);
                console.log(`[STORAGE] Deleted avatar asset on removal: ${publicId}`);
            } catch (err) {
                console.warn('[STORAGE] Failed to delete avatar asset on removal:', err.message);
            }
        }

        const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        user.avatar = defaultAvatar;
        await user.save();

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

        await logSecurityEvent(user._id, 'SecurityAlert', {
            ipAddress: req.ip,
            action: 'PASSWORD_CHANGE'
        });

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
        const otp = crypto.randomInt(100000, 1000000).toString();

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

        user.pendingNewEmail = undefined;
        user.emailChangeToken = undefined;
        user.emailChangeTokenExpires = undefined;

        await user.save();

        await logSecurityEvent(user._id, 'EmailChangeSuccess', {
            oldEmail,
            newEmail: user.email,
            ipAddress: req.ip
        });

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

// @desc    Get public profile for networking
// @route   GET /api/users/public/:id
// @access  Private
const getPublicProfile = async (req, res, next) => {
    try {
        const userToView = await User.findById(req.params.id)
            .select('name avatar role location status bio skills coverImage gamification lastActive')
            .lean();
            
        if (!userToView) {
            res.status(404);
            return next(new Error('User not found'));
        }

        const currentUserId = req.user._id;
        let connectionCount = 0;
        let mutualProjects = 0;
        let mutualTasks = 0;

        try {
            const Connection = require('../models/connection.model');
            const Project = require('../models/project.model');
            const Task = require('../models/task.model');

            connectionCount = await Connection.countDocuments({
                $or: [{ requester: userToView._id }, { recipient: userToView._id }],
                status: 'accepted'
            });

            mutualProjects = await Project.countDocuments({
                'members.userId': { $all: [currentUserId, userToView._id] },
                status: { $ne: 'Archived' }
            });

            mutualTasks = await Task.countDocuments({
                assignees: { $all: [currentUserId, userToView._id] },
                status: 'Completed'
            });
        } catch(err) {}

        userToView.totalConnections = connectionCount;
        userToView.mutualStats = {
            projects: mutualProjects,
            tasks: mutualTasks
        };

        res.status(200).json({
            status: 'success',
            data: formatUserResponse(userToView)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get activity heatmap data
// @route   GET /api/users/profile/heatmap
// @access  Private
const getHeatmap = async (req, res, next) => {
    try {
        const Audit = require('../models/audit.model');
        // Fix: Use UTC-aligned date range to prevent gaps due to timezone shifting
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        start.setUTCDate(start.getUTCDate() - 730); // 2 years as requested for "all previous data"

        // Deep Aggregation: High-fidelity contribution recovery
        const heatmap = await Audit.aggregate([
            { 
                $match: { 
                    user: req.user._id, 
                    createdAt: { $gte: start } 
                } 
            },
            {
                $addFields: {
                    // Extract status and type from metadata for more robust matching
                    taskStatus: { $ifNull: ["$details.status", ""] },
                    taskType: { $ifNull: ["$details.type", "Task"] },
                    summary: { $ifNull: ["$details.summary", ""] },
                }
            },
            {
                $addFields: {
                    // Weighted impact: Captures both transitions AND direct completions
                    isCompletion: {
                        $or: [
                            { $regexMatch: { input: "$summary", regex: /to Completed/i } },
                            { $and: [
                                { $eq: ["$action", "EntityCreate"] },
                                { $eq: ["$taskStatus", "Completed"] }
                            ]}
                        ]
                    }
                }
            },
            {
                $addFields: {
                    weight: {
                        $cond: [
                            "$isCompletion",
                            5, // Milestone weight
                            { $cond: [{ $in: ["$action", ["CommentAdded", "TimerStop", "SubtaskToggle"]]}, 2, 1] }
                        ]
                    },
                    // Strategic Cohort Mapping (Must stay synced with task.model.js & gamification.service.js)
                    cohort: {
                        $switch: {
                            branches: [
                                { 
                                    case: { $in: ["$taskType", ["Epic", "Feature", "Research", "Discovery", "Story"]] }, 
                                    then: "Strategic" 
                                },
                                { 
                                    case: { $in: ["$taskType", ["Refactor", "DevOps", "Technical Debt", "QA", "Performance"]] }, 
                                    then: "Engineering" 
                                },
                                { 
                                    case: { $in: ["$taskType", ["Maintenance", "Hygiene", "Task"]] }, 
                                    then: "Sustainability" 
                                },
                                { 
                                    case: { $in: ["$taskType", ["Bug", "Security", "Compliance", "Meeting", "Review", "Support"]] }, 
                                    then: "Operations" 
                                }
                            ],
                            default: "Operations"
                        }
                    }
                }
            },
            { 
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: "$weight" },
                    items: { $addToSet: "$cohort" }
                } 
            },
            { 
                $project: { 
                    date: "$_id", 
                    count: 1, 
                    items: 1,
                    _id: 0 
                } 
            },
            { $sort: { date: 1 } }
        ]);

        res.status(200).json({
            status: 'success',
            data: heatmap
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Search all workspace members (for new conversation)
// @route   GET /api/users/workspace
// @access  Private
const getWorkspaceMembers = async (req, res, next) => {
    try {
        const { q = '' } = req.query;
        const query = q.trim();
        const searchFilter = query
            ? { $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
              ]}
            : {};

        const members = await User.find({
            _id: { $ne: req.user._id },
            role: { $ne: 'Admin' },
            isActive: true,
            isBanned: false,
            ...searchFilter
        })
        .select('name avatar status role')
        .limit(20)
        .lean();

        res.status(200).json({ status: 'success', data: members });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadAvatar,
    uploadCoverImage,
    updateProfile,
    changePassword,
    removeAvatar,
    requestEmailChangeOTP,
    verifyEmailChangeOTP,
    confirmEmailChange,
    getPublicProfile,
    getHeatmap,
    getWorkspaceMembers
};
