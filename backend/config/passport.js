const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/user.model');
const logger = require('../utils/logger');

// Serialize user into the sessions
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the sessions
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Helper function for graceful account linking
const linkOrCreateUser = async (profile, provider, providerIdKey, done) => {
    try {
        // 1. Check if user already exists with this specific provider ID
        let user = await User.findOne({ [providerIdKey]: profile.id });

        if (user) {
            if (user.isBanned) {
                logger.warn(`🚫 Banned user attempted to login via ${provider}: ${user.email}`);
                return done(new Error('Your account has been suspended for violating terms of service.'), null);
            }
            return done(null, user);
        }

        // Extract email from profile (Google gives arrays, GitHub might give array or separate fetch)
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

        if (!email) {
            return done(new Error(`No email found from ${provider} profile.`), null);
        }

        // 2. Check if a user with this email already exists (from another provider or local creds)
        user = await User.findOne({ email });

        if (user) {
            // Graceful Link: Update the existing user with the new provider ID
            user[providerIdKey] = profile.id;

            // Add to authProviders array if not already present
            if (!user.authProviders.includes(provider)) {
                user.authProviders.push(provider);
            }

            // OAuth providers verify emails — auto-verify the account
            if (!user.isEmailVerified) {
                user.isEmailVerified = true;
                user.emailVerificationToken = undefined;
                user.emailVerificationExpires = undefined;
            }

            // Save without triggering password validation
            await user.save({ validateBeforeSave: false });

            if (user.isBanned) {
                logger.warn(`🚫 Banned user attempted to login via ${provider}: ${email}`);
                return done(new Error('Your account has been suspended for violating terms of service.'), null);
            }

            logger.info(`✅ Linked ${provider} account to existing user: ${email}`);
            return done(null, user);
        }

        // 3. If no user exists, create a brand new one
        const newUser = await User.create({
            name: profile.displayName || profile.username || 'OAuth User',
            email: email,
            // No password needed
            [providerIdKey]: profile.id,
            authProviders: [provider],
            isEmailVerified: true, // OAuth providers have already verified the email
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined
        });

        logger.info(`✨ Created new ${provider} user: ${email}`);
        done(null, newUser);
    } catch (error) {
        logger.error(`❌ OAuth Error (${provider}): ${error.message}`);
        done(error, null);
    }
};

// ==========================================
// Google OAuth Strategy
// ==========================================
// Only mount if the env vars exist to prevent crashing on boot
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                // Using a relative URL lets Passport auto-resolve against the current server host regardless of environment
                callbackURL: '/api/auth/google/callback',
                proxy: true, // Forces passport to trust x-forwarded-proto from Render's load balancer
            },
            async (accessToken, refreshToken, profile, done) => {
                await linkOrCreateUser(profile, 'google', 'googleId', done);
            }
        )
    );
    logger.info("✅ Google OAuth Strategy configured.");
} else {
    logger.warn("⚠️ Google OAuth credentials missing. Strategy not loaded.");
}

// ==========================================
// GitHub OAuth Strategy
// ==========================================
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: '/api/auth/github/callback',
                scope: ['user:email'], // Explicitly request email
                proxy: true, // Trusted proxy calculation fallback
            },
            async (accessToken, refreshToken, profile, done) => {
                await linkOrCreateUser(profile, 'github', 'githubId', done);
            }
        )
    );
    logger.info("✅ GitHub OAuth Strategy configured.");
} else {
    logger.warn("⚠️ GitHub OAuth credentials missing. Strategy not loaded.");
}

module.exports = passport;
