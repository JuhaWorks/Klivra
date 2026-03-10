const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/audit.controller');
const { protect, authorizeRoles } = require('../middlewares/auth.middleware');

// Protect all audit routes
router.use(protect);
router.get('/', authorizeRoles('Admin', 'Manager'), getLogs);

module.exports = router;
