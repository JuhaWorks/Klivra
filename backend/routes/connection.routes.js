const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/access.middleware');
const {
    sendRequest,
    respondToRequest,
    withdrawRequest,
    removeConnection,
    updateLabels,
    getMyConnections,
    getPendingRequests,
    getSentRequests,
    getStats,
    getMutualConnections,
    searchUsers,
    getSuggestions,
} = require('../controllers/connection.controller');

// All routes are protected
router.use(protect);

// ─── Discovery & Search ──────────────────────────────────────────────────────
router.get('/search', searchUsers);
router.get('/suggestions', getSuggestions);

// ─── Connection CRUD ─────────────────────────────────────────────────────────
router.get('/', getMyConnections);
router.get('/stats', getStats);
router.get('/pending', getPendingRequests);
router.get('/sent', getSentRequests);
router.get('/mutual/:userId', getMutualConnections);

router.post('/request', sendRequest);
router.put('/respond', respondToRequest);
router.put('/labels', updateLabels);

router.delete('/withdraw/:connectionId', withdrawRequest);
router.delete('/:connectionId', removeConnection);

module.exports = router;
