const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { uploadAvatar, updateProfile, changePassword } = require('../controllers/user.controller');

// POST   /api/users/profile/avatar  — upload / replace profile picture
router.post('/profile/avatar', protect, uploadSingle, uploadAvatar);

// PUT    /api/users/profile          — update name, status, customMessage
router.put('/profile', protect, updateProfile);

// PUT    /api/users/profile/password — change password (requires current password)
router.put('/profile/password', protect, changePassword);

module.exports = router;
