const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/admin.controller');
const { protect, authorizeRoles } = require('../middlewares/access.middleware');

// Protect all audit routes
router.use(protect);
router.get('/', getLogs);

module.exports = router;
