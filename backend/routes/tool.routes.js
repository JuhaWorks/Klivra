const express = require('express');
const router = express.Router();
const { getApod, getWeather, getTeamIntelligence, reverseGeocode } = require('../controllers/tool.controller');
const { protect } = require('../middlewares/access.middleware');

// @route   GET /api/tools/apod
// @desc    Get NASA Astronomy Picture of the Day
// @access  Public
router.get('/apod', getApod);

// @route   GET /api/tools/weather
// @desc    Get current weather
// @access  Private
router.get('/weather', protect, getWeather);

// @route   GET /api/tools/team-times
// @desc    Get current local times for teammates
// @access  Private
router.get('/team-times', protect, getTeamIntelligence);

// @route   GET /api/tools/reverse-geocode
// @desc    Resolve coordinates to city name
// @access  Private
router.get('/reverse-geocode', protect, reverseGeocode);

module.exports = router;
