const express = require('express');
const router = express.Router();
const projectCtrl = require('../controllers/project.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/', protect, projectCtrl.globalSearch);

module.exports = router;
