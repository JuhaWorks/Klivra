const express = require('express');
const router = express.Router();
// bcrypt, multer and schema validation are no longer needed here; they live in user.controller
const { protect, optionalProtect } = require('../middlewares/auth.middleware');
const { registerUser, loginUser, logoutUser, refreshTokenUser, oauthCallback, verifyEmail, resendVerification, getMe, updateStatus } = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const passport = require('passport');
// reuse the helpers from user.controller to keep validation/upload logic in one place
const { uploadAvatar, updateProfile, changePassword, removeAvatar } = require('../controllers/user.controller');

// the upload middleware, validation schemas and controller logic live in user.controller.js
// so we don't duplicate functionality here.  auth.routes is responsible only for
// authentication endpoints (login/register/logout) and providing a simple
// profile-read endpoint used during the initial auth check.

// Note: the same multer/cloudinary config is already handled indirectly by
// full routes under /api/users, so we don't need to re-declare it here.


// ── Public Auth Routes ─────────────────────────────────────────────────────────
router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/refresh', refreshTokenUser);
router.get('/logout', logoutUser);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', optionalProtect, getMe);

// ── OAuth Routes ───────────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' 
}));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), oauthCallback);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/login', session: false }), oauthCallback);

// ── GET /api/auth/profile — read current user ──────────────────────────────────
// this route just returns `req.user` so the client can populate its store during
// the initial auth check; the write operations are handled in /api/users to keep
// the code single-responsibility.
router.get('/profile', protect, (req, res) => {
    res.status(200).json({ status: 'success', data: req.user });
});

// ── the mutable profile endpoints now live under /api/users; the frontend uses
// the same paths (`/auth/...`) so we still need to forward those requests.  the
// forwarding is intentionally thin – simply delegate to the controllers defined
// in user.controller.js so we avoid maintaining the same logic twice.
router.post('/profile/avatar', protect, /* multer middleware defined below */(req, res, next) => {
    // re-use uploadSingle from user.routes via require to avoid duplication
    const { uploadSingle } = require('../middlewares/upload.middleware');
    uploadSingle(req, res, (err) => {
        if (err) return next(err);
        uploadAvatar(req, res, next);
    });
});

router.delete('/profile/avatar', protect, removeAvatar);
router.put('/profile', protect, updateProfile);
router.put('/profile/password', protect, changePassword);
router.put('/profile/status', protect, updateStatus);

module.exports = router;
