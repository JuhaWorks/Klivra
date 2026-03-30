const express = require('express');
const router = express.Router();
const projectCtrl = require('../controllers/project.controller');
const { protect } = require('../middlewares/access.middleware');

router.get('/', protect, projectCtrl.globalSearch);

module.exports = router;
