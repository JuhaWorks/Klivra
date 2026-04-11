const express = require('express');
const router = express.Router();
const { getApod } = require('../controllers/tool.controller');

// @route   GET /api/tools/apod
// @desc    Get NASA Astronomy Picture of the Day
// @access  Public
router.get('/apod', getApod);

module.exports = router;
