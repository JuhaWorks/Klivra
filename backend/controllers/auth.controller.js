const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logSecurityEvent } = require('../utils/activityLogger');
const { getFrontendUrl, formatUserResponse, sendStandardEmail, getCookieOptions } = require('../utils/helpers');

// Generate JWT Access Token (Short-lived)
const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// Generate JWT Refresh Token (Long-lived)
const generateRefreshToken = (id) => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    return jwt.sign({ id }, secret, { expiresIn: '7d' });
};

// Utility function to send JWT inside an HttpOnly Cookie
const sendTokenResponse = (user, statusCode, res, rememberMe = false) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res
        .status(statusCode)
        .cookie('refreshToken', refreshToken, getCookieOptions(rememberMe))
        .json({
            status: 'success',
            accessToken,
            data: formatUserResponse(user)
        });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, role, avatar } = req.body;
        console.log(`[DEBUG] Registration attempt for: ${email}`);

        // Check if user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            if (userExists.isEmailVerified) {
                res.status(400);
                throw new Error('User already exists. Please log in.');
            } else {
                // The Unverified Lockout Fix: Treat this as a resend request
                const verificationToken = crypto.randomBytes(32).toString('hex');
                userExists.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
                userExists.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
                await userExists.save();

                const verifyUrl = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;

                try {
                    await sendStandardEmail({
                        to: userExists.email,
                        subject: 'Verify your Klivra account',
                        title: 'Welcome back to Klivra!',
                        body: 'It looks like you previously signed up but didn\'t verify your account. Please verify your email address to access your workspace.',
                        ctaText: 'Verify Account',
                        ctaUrl: verifyUrl
                    });
                } catch (emailErr) {
                    console.error(`Email resend failed for ${userExists.email}:`, emailErr.message);
                }

                return res.status(200).json({
                    status: 'success',
                    message: 'Verification email resent. Please check your inbox.',
                    data: formatUserResponse(userExists)
                });
            }
        }

        // Create user. The password will be hashed via the pre-save hook in the User model.
        const user = await User.create({
            name,
            email,
            password,
            role,
            avatar
        });

        if (user) {
            // --- Email Verification Implementation ---
            const verificationToken = crypto.randomBytes(32).toString('hex');

            user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
            user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
            await user.save();

            const verifyUrl = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;

            try {
                await sendStandardEmail({
                    to: user.email,
                    subject: 'Verify your Klivra account',
                    title: 'Welcome to Klivra!',
                    body: 'Thanks for signing up. Please verify your email address to access your workspace.',
                    ctaText: 'Verify Account',
                    ctaUrl: verifyUrl,
                    footer: 'If you did not request this, please ignore this email.'
                });
            } catch (emailErr) {
                console.error(`Registration email failed for ${user.email}:`, emailErr.message);
            }

            res.status(201).json({
                status: 'success',
                message: 'Registration successful. Please verify your email.',
                data: formatUserResponse(user)
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        console.error('❌ Registration Error FULL:', error);

        // MongoDB duplicate key error (email already in use)
        if (error.code === 11000) {
            res.status(400);
            return next(new Error('An account with this email already exists. Please log in or use a different email.'));
        }
        // Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            res.status(400);
            return next(new Error(messages.join(', ')));
        }
        res.status(400);
        next(new Error(`Registration failed: ${error.message}`));
    }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password, reactivate, rememberMe } = req.body;

        if (!email || !password) {
            res.status(400);
            throw new Error('Please provide an email and password');
        }

        // Check for user email. We need to explicitly select the password because
        // it was set to `select: false` in the schema.
        const user = await User.findOne({ email }).select('+password');

        // Check if user exists and password matches
        if (user && (await user.matchPassword(password))) {

            if (user.isBanned) {
                await logSecurityEvent(user._id, 'FAILED_LOGIN', {
                    email,
                    reason: 'Account Banned',
                    ipAddress: req.ip
                });
                res.status(403);
                return next(new Error('Your account has been suspended for violating terms of service.'));
            }

            // Handle timed/manual deactivation reactivations
            if (!user.isActive) {
                if (reactivate === true) {
                    // Instantly reactivate the account on demand
                    user.isActive = true;
                    user.deactivationDate = null;
                    user.deactivationDuration = null;
                    await user.save();
                } else {
                    // Pre-flight check: Account is deactivated, tell the frontend to prompt them
                    res.status(403);
                    return next({
                        message: 'Your account is currently deactivated. Would you like to reactivate it and log in?',
                        requiresReactivation: true
                    });
                }
            }

            // Set status to Online on login
            user.status = 'Online';
            await user.save();

            sendTokenResponse(user, 200, res, rememberMe);
        } else {
            await logSecurityEvent(null, 'FAILED_LOGIN', {
                email,
                reason: 'Invalid Credentials',
                ipAddress: req.ip
            });
            res.status(401);
            throw new Error('Invalid email or password');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout // Normally POST but GET frequently used for ease
// @access  Public
const logoutUser = async (req, res, next) => {
    try {
        const options = getCookieOptions();
        options.expires = new Date(Date.now() + 10 * 1000); // Expires in 10 seconds
        res.cookie('refreshToken', 'none', options);

        // Set status to Offline on logout
        if (req.user) {
            const user = await User.findById(req.user._id);
            if (user) {
                user.status = 'Offline';
                await user.save();
            }
        }

        res.status(200).json({
            status: 'success',
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Refresh access token using HTTP-Only refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshTokenUser = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken || refreshToken === 'none') {
            res.status(401);
            return next(new Error('Not authorized, no refresh token'));
        }

        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        const decoded = jwt.verify(refreshToken, secret);

        // Ensure user actually exists and is active
        const user = await User.findById(decoded.id).select('-password');
        if (!user || user.isActive === false) {
            res.clearCookie('refreshToken', getCookieOptions());
            res.status(401);
            return next(new Error('Not authorized, user not found or deactivated'));
        }

        // Issue new short-lived access token
        const accessToken = generateAccessToken(user._id);

        res.status(200).json({
            status: 'success',
            accessToken
        });
    } catch (error) {
        res.clearCookie('refreshToken', getCookieOptions());
        res.status(401);
        next(new Error('Not authorized, refresh token failed/expired'));
    }
};

// @desc    OAuth Callback Handler
// @route   GET /api/auth/:provider/callback
// @access  Public
const oauthCallback = async (req, res) => {
    // req.user is populated by passport
    const user = req.user;

    // We cannot use sendTokenResponse directly because that sends JSON.
    // OAuth requires a browser redirect back to the frontend SPA.
    // We will set the HttpOnly cookie manually, then redirect with the short-lived access token in the URL.

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set status to Online on OAuth login
    user.status = 'Online';
    await user.save();

    const options = getCookieOptions(true);
    options.expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    res.cookie('refreshToken', refreshToken, options);

    res.redirect(`${getFrontendUrl()}/oauth/callback?token=${accessToken}`);
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        let user = await User.findOne({
            emailVerificationToken: hashedToken
        });

        if (!user) {
            res.status(400);
            return next(new Error('Invalid verification token.'));
        }

        // The Pre-Click Ghost Fix: Idempotency
        // If an enterprise firewall's bot pre-clicked the link, the user is already verified.
        // We do not throw an error if humans click it a second time.
        if (user.isEmailVerified) {
            return res.status(200).json({
                status: 'success',
                message: 'Email successfully verified!' // Soft pass
            });
        }

        if (user.emailVerificationExpires < Date.now()) {
            res.status(400);
            return next(new Error('Token has expired. Please request a new one.'));
        }

        // We mark them as verified, but we DO NOT instantly delete the token from the DB.
        // If we delete the token, the next click (by the real user) will yield "Invalid Token" (!user).
        // The token will just sit harmlessly until the Garbage Collector wipes it, or it expires.
        user.isEmailVerified = true;
        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Email successfully verified'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update user status (Online, Away, DND, Offline)
// @route   PUT /api/auth/profile/status
// @access  Private
const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['Online', 'Away', 'Do Not Disturb', 'Offline'].includes(status)) {
            res.status(400);
            return next(new Error('Invalid status value'));
        }

        const user = await User.findById(req.user._id);
        user.status = status;
        await user.save();

        res.status(200).json({
            status: 'success',
            data: { status: user.status }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user (session check for page reloads)
// @route   GET /api/auth/me
// @access  Private (Protected by JWT middleware)
const getMe = async (req, res) => {
    // req.user is already populated by the protect middleware (excluding password)
    res.status(200).json({ status: 'success', data: req.user });
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public (Expects email in body)
const resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        console.log(`[DEBUG] Resend verification requested for: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            res.status(404);
            return next(new Error('User not found'));
        }

        if (user.isEmailVerified) {
            res.status(400);
            return next(new Error('Email is already verified'));
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        const verifyUrl = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;

        console.log(`[DEBUG] Attempting to resend verification email to: ${user.email}`);
        await sendStandardEmail({
            to: user.email,
            subject: 'Verify your Klivra account',
            title: 'Verify it\'s you',
            body: 'You requested a new verification link. Please click below to verify your email address.',
            ctaText: 'Verify Account',
            ctaUrl: verifyUrl
        });
        console.log(`[DEBUG] Verification email resent successfully to: ${user.email}`);

        res.status(200).json({
            status: 'success',
            message: 'Verification email resent'
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshTokenUser,
    oauthCallback,
    verifyEmail,
    resendVerification,
    getMe,
    updateStatus
};
