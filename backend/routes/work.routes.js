const express = require('express');
const router = express.Router();
const { protect, isNotArchived, authorizeProjectAccess } = require('../middlewares/access.middleware');
const { cacheMiddleware } = require('../utils/system.utils');
const { validate } = require('../middlewares/common.middleware');
const { uploadProjectImage } = require('../middlewares/upload.middleware');

// Controllers
const projectCtrl = require('../controllers/project.controller');
const analyticsCtrl = require('../controllers/analytics.controller');
const taskCtrl = require('../controllers/task.controller');
const toolCtrl = require('../controllers/tool.controller');

// Validators
const { addMemberSchema, updateMemberRoleSchema } = require('../validators/projectMember.validator');

// ─── 1. Project Management ──────────────────────────────────────────────────
const projectRouter = express.Router();
projectRouter.use(protect);

projectRouter.get('/search', projectCtrl.globalSearch);
projectRouter.get('/invitations', projectCtrl.getProjectInvitations);
projectRouter.post('/:id/invitations/respond', projectCtrl.respondToProjectInvite);
projectRouter.get('/workspace/stats', cacheMiddleware('workspace_stats', 300), projectCtrl.getWorkspaceStats);
projectRouter.get('/workspace/analytics', analyticsCtrl.getWorkspaceAnalytics);

projectRouter.route('/')
    .get(cacheMiddleware('projects_list', 60), projectCtrl.getProjects)
    .post(projectCtrl.createProject);

projectRouter.route('/:id')
    .get(cacheMiddleware('project_detail', 60), projectCtrl.getProject)
    .put(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), projectCtrl.updateProject)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), projectCtrl.deleteProject);

projectRouter.post('/:id/image', isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), uploadProjectImage, projectCtrl.uploadProjectImage);
projectRouter.post('/:id/restore', authorizeProjectAccess(['Manager']), projectCtrl.restoreProject);
projectRouter.delete('/:id/purge', authorizeProjectAccess(['Manager']), projectCtrl.purgeProject);
projectRouter.post('/:id/dismiss-alert', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), projectCtrl.dismissDeadlineAlert);

// Members & Insights
projectRouter.route('/:id/members')
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), validate(addMemberSchema), projectCtrl.addMember);
projectRouter.route('/:id/members/:userId')
    .put(isNotArchived, authorizeProjectAccess(['Manager']), validate(updateMemberRoleSchema), projectCtrl.updateMemberRole)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), projectCtrl.removeMember);

projectRouter.get('/:id/activity', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_activity', 30), projectCtrl.getProjectActivity);
projectRouter.get('/:id/insights', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_insights', 60), projectCtrl.getProjectInsights);
projectRouter.get('/:id/analytics', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_analytics', 60), analyticsCtrl.getProjectAnalytics);
projectRouter.get('/:id/leaderboard', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_leaderboard', 60), analyticsCtrl.getProjectLeaderboard);

// Public (Token-based)
projectRouter.get('/invitations/token/respond', projectCtrl.respondToInviteByToken);

// ─── 2. Task Management (Nested & Standalone) ──────────────────────────────
const taskRouter = express.Router({ mergeParams: true });
taskRouter.use(protect);

taskRouter.route('/')
    .get(taskCtrl.getTasks)
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), taskCtrl.createTask);

taskRouter.route('/:id')
    .get(taskCtrl.getTask)
    .put(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), taskCtrl.updateTask)
    .delete(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), taskCtrl.deleteTask);

taskRouter.patch('/:id/status', isNotArchived, authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), taskCtrl.updateTaskStatus);
taskRouter.get('/:id/activity', isNotArchived, authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), taskCtrl.getTaskActivity);
taskRouter.route('/:id/comments')
    .get(isNotArchived, authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), taskCtrl.getTaskComments)
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), taskCtrl.addTaskComment);
taskRouter.delete('/:id/comments/:commentId', isNotArchived, authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), taskCtrl.deleteTaskComment);

// ─── 3. Whiteboard (Sticky Notes) ──────────────────────────────────────────
const whiteboardRouter = express.Router({ mergeParams: true });
whiteboardRouter.use(protect);
whiteboardRouter.use(authorizeProjectAccess(['Manager', 'Editor', 'Viewer']));

whiteboardRouter.route('/')
    .get(toolCtrl.getNotes)
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), toolCtrl.createNote);

whiteboardRouter.route('/:noteId')
    .patch(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), toolCtrl.updateNote)
    .delete(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), toolCtrl.deleteNote);

whiteboardRouter.post('/:noteId/vote', toolCtrl.toggleVote);

// ─── 4. Sub-Route Mounting ────────────────────────────────────────────────
projectRouter.use('/:projectId/tasks', taskRouter);
projectRouter.use('/:projectId/whiteboard', whiteboardRouter);

module.exports = {
    projectRouter,
    taskRouter,
    whiteboardRouter
};
