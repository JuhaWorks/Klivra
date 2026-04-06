const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams allows grabbing :projectId from the project router
const {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskActivity
} = require('../controllers/task.controller');
const {
    getTaskComments,
    addTaskComment,
    deleteTaskComment
} = require('../controllers/taskComment.controller');
const { protect } = require('../middlewares/access.middleware');
const { cacheMiddleware } = require('../utils/redis');

// Apply auth middleware to all task routes
router.use(protect);

router.route('/')
    .get(cacheMiddleware('tasks', 300), getTasks)
    .post(createTask);

router.route('/:id')
    .put(updateTask)
    .delete(deleteTask);

router.get('/:id/activity', getTaskActivity);

// Comments routes
router.route('/:taskId/comments')
    .get(getTaskComments)
    .post(addTaskComment);

router.delete('/comments/:commentId', deleteTaskComment);

module.exports = router;
