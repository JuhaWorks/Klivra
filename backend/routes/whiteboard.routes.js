const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorizeProjectAccess } = require('../middlewares/access.middleware');
const whiteboardCtrl = require('../controllers/whiteboard.controller');

// All whiteboard routes require project access
router.use(protect);
router.use(authorizeProjectAccess(['Manager', 'Editor', 'Viewer']));

router.route('/')
    .get(whiteboardCtrl.getNotes)
    .post(authorizeProjectAccess(['Manager', 'Editor']), whiteboardCtrl.createNote);

router.route('/:noteId')
    .patch(authorizeProjectAccess(['Manager', 'Editor']), whiteboardCtrl.updateNote)
    .delete(authorizeProjectAccess(['Manager', 'Editor']), whiteboardCtrl.deleteNote);

router.post('/:noteId/vote', whiteboardCtrl.toggleVote);

module.exports = router;
