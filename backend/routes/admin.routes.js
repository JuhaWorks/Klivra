const express = require('express');
const router = express.Router();
const { 
  getUsers, updateUserRole, toggleBanUser, getPlatformStats, 
  toggleMaintenance, updateBlockedIps, getBlockedIps, getSystemStatus, getLogs 
} = require('../controllers/admin.controller');
const { protect, verifyAdmin } = require('../middlewares/access.middleware');

// Public route for maintenance status check
router.get('/system/status', getSystemStatus);

router.use(protect);
router.use(verifyAdmin);

// Routes
router.get('/users', getUsers);
router.get('/stats', getPlatformStats);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/ban', toggleBanUser);

// System Configuration
router.put('/system/maintenance', toggleMaintenance);
router.get('/system/blocked-ips', getBlockedIps);
router.put('/system/blocked-ips', updateBlockedIps);

// Audit Logs (Consolidated from audit routes if needed, but keeping separate route file for consistency)
router.get('/audit', getLogs);

module.exports = router;
