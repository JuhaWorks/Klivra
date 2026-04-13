const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/access.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { uploadAvatar, updateProfile, changePassword, removeAvatar, requestEmailChangeOTP, verifyEmailChangeOTP, confirmEmailChange, getPublicProfile, getHeatmap } = require('../controllers/user.controller');

// POST   /api/users/profile/avatar  — upload / replace profile picture
router.post('/profile/avatar', protect, uploadSingle, uploadAvatar);

// DELETE /api/users/profile/avatar  — remove profile picture
router.delete('/profile/avatar', protect, removeAvatar);

// PUT    /api/users/profile          — update name, status, customMessage
router.put('/profile', protect, updateProfile);

// GET    /api/users/profile/heatmap  — get user completed tasks heatmap data
router.get('/profile/heatmap', protect, getHeatmap);

// PUT    /api/users/profile/password — change password (requires current password)
router.put('/profile/password', protect, changePassword);

// GET    /api/users/public/:id       — get public profile for networking
router.get('/public/:id', protect, getPublicProfile);

// ─── Secure Email Change Flow ────────────────────────────────────────────────

// POST   /api/users/email/request-otp    — step 1: request code to current email
router.post('/email/request-otp', protect, requestEmailChangeOTP);

// POST   /api/users/email/verify-otp     — step 2: verify code and send link
router.post('/email/verify-otp', protect, verifyEmailChangeOTP);

// GET    /api/users/email/confirm-new/:token — step 3: confirm token and swap
// Public endpoint for email link clicks
router.get('/email/confirm-new/:token', confirmEmailChange);

// All other user routes must be protected
router.use(protect);

module.exports = router;
