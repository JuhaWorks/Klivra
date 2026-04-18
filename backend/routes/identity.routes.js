const express = require('express');
const router = express.Router();
const passport = require('passport');
const { protect, optionalProtect } = require('../middlewares/access.middleware');
const { authLimiter } = require('../middlewares/security.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');

// Controllers
const authCtrl = require('../controllers/auth.controller');
const userCtrl = require('../controllers/user.controller');

// ─── 1. Authentication (Identity Base) ──────────────────────────────────────
const authRouter = express.Router();

authRouter.post('/register', authLimiter, authCtrl.registerUser);
authRouter.post('/login', authLimiter, authCtrl.loginUser);
authRouter.post('/refresh', authLimiter, authCtrl.refreshTokenUser);
authRouter.get('/logout', protect, authCtrl.logoutUser);
authRouter.post('/logout', protect, authCtrl.logoutUser);
authRouter.get('/verify-email/:token', authLimiter, authCtrl.verifyEmail);
authRouter.post('/resend-verification', authLimiter, authCtrl.resendVerification);
authRouter.get('/me', optionalProtect, authCtrl.getMe);
authRouter.put('/profile/status', protect, authCtrl.updateStatus);

// OAuth
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));
authRouter.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), authCtrl.oauthCallback);
authRouter.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
authRouter.get('/github/callback', passport.authenticate('github', { failureRedirect: '/login', session: false }), authCtrl.oauthCallback);
authRouter.post('/oauth/exchange', authCtrl.oauthExchange);

// Profile (Write)
authRouter.put('/profile', protect, userCtrl.updateProfile);
authRouter.put('/profile/password', protect, userCtrl.changePassword);
authRouter.post('/profile/avatar', protect, uploadSingle, userCtrl.uploadAvatar);
authRouter.post('/profile/cover', protect, uploadSingle, userCtrl.uploadCoverImage);
authRouter.delete('/profile/avatar', protect, userCtrl.removeAvatar);

// Profile (Read)
authRouter.get('/profile', protect, (req, res) => res.status(200).json({ status: 'success', data: req.user }));

// ─── 2. User & Workspace Info ──────────────────────────────────────────────
const userRouter = express.Router();
userRouter.use(protect);

userRouter.get('/profile/heatmap', userCtrl.getHeatmap);
userRouter.get('/public/:id', userCtrl.getPublicProfile);
userRouter.get('/workspace', userCtrl.getWorkspaceMembers);

// Secure Email Change
userRouter.post('/email/request-otp', userCtrl.requestEmailChangeOTP);
userRouter.post('/email/verify-otp', userCtrl.verifyEmailChangeOTP);
userRouter.get('/email/confirm-new/:token', userCtrl.confirmEmailChange);

// ─── 3. Account Settings ────────────────────────────────────────────────────
const settingsRouter = express.Router();

// Public Confirmation
settingsRouter.get('/email/confirm/:token', userCtrl.confirmEmailChange);

// Protected Settings
settingsRouter.use(protect);
settingsRouter.put('/profile', userCtrl.updateProfile);
settingsRouter.put('/security', userCtrl.updateSecurity);
settingsRouter.get('/security/logs', userCtrl.getSecurityLogs);
settingsRouter.put('/notifications', userCtrl.updateNotificationPreferences);
settingsRouter.post('/push/subscribe', userCtrl.subscribeToPush);
settingsRouter.post('/push/unsubscribe', userCtrl.unsubscribeFromPush);
settingsRouter.put('/deactivate', userCtrl.deactivateAccount);
settingsRouter.delete('/delete', userCtrl.deleteAccount);

module.exports = {
    authRouter,
    userRouter,
    settingsRouter
};
