const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Generate JWT Access Token (Short-lived)
const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// Generate JWT Refresh Token (Long-lived)
const generateRefreshToken = (id) => {
    // In a production app, use a separate JWT_REFRESH_SECRET. We stick to JWT_SECRET as fallback
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    return jwt.sign({ id }, secret, { expiresIn: '7d' });
};

// Utility function to send JWT inside an HttpOnly Cookie
const sendTokenResponse = (user, statusCode, res, rememberMe = false) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const isProd = process.env.NODE_ENV === 'production';
    // sameSite: 'none' requires Secure=true in all modern browsers. Since local dev
    // is HTTP (Secure=false), it would reject the cookie entirely.
    // Thanks to your Vite proxy, dev requests are same-site anyway, so 'lax' works perfectly.
    const options = {
        httpOnly: true, // Crucial: Cookie cannot be accessed via client-side scripts
        secure: isProd, // HTTPS only in production
        sameSite: isProd ? 'none' : 'lax', // 'none' for cross-site prod, 'lax' for local proxy
    };

    // If rememberMe is true, cookie lasts 30 days. Otherwise, it's a session cookie defaults to browser session length.
    if (rememberMe) {
        options.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    res
        .status(statusCode)
        .cookie('refreshToken', refreshToken, options)
        .json({
            status: 'success',
            accessToken,
            data: {
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            }
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

                const isProd = process.env.NODE_ENV === 'production';
                const frontendUrl = isProd
                    ? 'https://klivra.vercel.app'
                    : (process.env.FRONTEND_URL || 'http://localhost:5173');

                const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

                const message = `
                    <div style="font-family: inherit; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
                        <h2 style="color: #060612;">Welcome back to Klivra!</h2>
                        <p style="color: #44445a; line-height: 1.6;">It looks like you previously signed up but didn't verify your account. Please verify your email address to access your workspace.</p>
                        <a href="${verifyUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #7B52FF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Account</a>
                    </div>
                `;

                // Send email FIRST, then respond (await ensures Render doesn't kill the process)
                try {
                    await sendEmail({
                        to: userExists.email,
                        subject: 'Verify your Klivra account',
                        html: message
                    });
                    console.log(`[RENDER-DEBUG] ✅ Resend verification email SENT to: ${userExists.email}`);
                } catch (emailErr) {
                    console.error(`[RENDER-DEBUG] ❌ Resend verification email FAILED for ${userExists.email}:`, emailErr.message, emailErr.stack);
                }

                return res.status(200).json({
                    status: 'success',
                    message: 'Verification email resent. Please check your inbox.',
                    data: {
                        _id: userExists.id,
                        name: userExists.name,
                        email: userExists.email,
                        role: userExists.role,
                        avatar: userExists.avatar,
                        isEmailVerified: userExists.isEmailVerified
                    }
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

            const isProd = process.env.NODE_ENV === 'production';
            const frontendUrl = isProd
                ? 'https://klivra.vercel.app'
                : (process.env.FRONTEND_URL || 'http://localhost:5173');

            const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

            const message = `
                <div style="font-family: inherit; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
                    <h2 style="color: #060612;">Welcome to Klivra!</h2>
                    <p style="color: #44445a; line-height: 1.6;">Thanks for signing up. Please verify your email address to access your workspace.</p>
                    <a href="${verifyUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #7B52FF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Account</a>
                    <p style="color: #8888aa; font-size: 13px; margin-top: 25px;">If you did not request this, please ignore this email.</p>
                </div>
            `;

            // Send email BEFORE responding (await ensures Render completes the send)
            try {
                console.log(`[RENDER-DEBUG] 📧 Attempting to send registration email to: ${user.email}`);
                console.log(`[RENDER-DEBUG] EMAIL_USER=${process.env.EMAIL_USER}, EMAIL_HOST=${process.env.EMAIL_HOST}, EMAIL_PORT=${process.env.EMAIL_PORT}`);
                await sendEmail({
                    to: user.email,
                    subject: 'Verify your Klivra account',
                    html: message
                });
                console.log(`[RENDER-DEBUG] ✅ Registration email SENT to: ${user.email}`);
            } catch (emailErr) {
                console.error(`[RENDER-DEBUG] ❌ Registration email FAILED for ${user.email}:`, emailErr.message);
                console.error(`[RENDER-DEBUG] Full error:`, JSON.stringify({ code: emailErr.code, command: emailErr.command, response: emailErr.response, responseCode: emailErr.responseCode }, null, 2));
            }

            res.status(201).json({
                status: 'success',
                message: 'Registration successful. Please verify your email.',
                data: {
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    isEmailVerified: user.isEmailVerified
                }
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

            sendTokenResponse(user, 200, res, rememberMe);
        } else {
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
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('refreshToken', 'none', {
            expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax'
        });

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
            const isProd = process.env.NODE_ENV === 'production';
            res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
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
        const isProd = process.env.NODE_ENV === 'production';
        res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
        res.status(401);
        next(new Error('Not authorized, refresh token failed/expired'));
    }
};

// @desc    OAuth Callback Handler
// @route   GET /api/auth/:provider/callback
// @access  Public
const oauthCallback = (req, res) => {
    // req.user is populated by passport
    const user = req.user;

    // We cannot use sendTokenResponse directly because that sends JSON.
    // OAuth requires a browser redirect back to the frontend SPA.
    // We will set the HttpOnly cookie manually, then redirect with the short-lived access token in the URL.

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const isProd = process.env.NODE_ENV === 'production';
    const options = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
    };

    res.cookie('refreshToken', refreshToken, options);

    const frontendUrl = isProd
        ? 'https://klivra.vercel.app'
        : (process.env.FRONTEND_URL || 'http://localhost:5173');

    res.redirect(`${frontendUrl}/oauth/callback?token=${accessToken}`);
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

// @desc    Get current user (session check for page reloads)
// @route   GET /api/auth/me
// @access  Private (Protected by JWT middleware)
const getMe = async (req, res) => {
    // req.user is already populated by the protect middleware
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

        const isProd = process.env.NODE_ENV === 'production';
        const frontendUrl = isProd
            ? 'https://klivra.vercel.app'
            : (process.env.FRONTEND_URL || 'http://localhost:5173');

        const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

        const message = `
            <div style="font-family: inherit; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
                <h2 style="color: #060612;">Verify it's you</h2>
                <p style="color: #44445a; line-height: 1.6;">You requested a new verification link. Please click below to verify your email address.</p>
                <a href="${verifyUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #7B52FF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Account</a>
            </div>
        `;

        console.log(`[DEBUG] Attempting to resend verification email to: ${user.email}`);
        await sendEmail({
            to: user.email,
            subject: 'Verify your Klivra account',
            html: message
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
    getMe
};
