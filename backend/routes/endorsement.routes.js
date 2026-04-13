const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/access.middleware');
const { toggleEndorsement, getUserEndorsements } = require('../controllers/endorsement.controller');

router.use(protect);

router.post('/toggle', toggleEndorsement);
router.get('/user/:id', getUserEndorsements);

module.exports = router;
