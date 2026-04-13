const express = require('express');
const router = express.Router();
const { protect, isNotArchived, authorizeProjectAccess } = require('../middlewares/access.middleware');

// Consolidated Controller
const projectCtrl = require('../controllers/project.controller');
const analyticsCtrl = require('../controllers/analytics.controller');
const { cacheMiddleware } = require('../utils/redis');
const { validate } = require('../middlewares/common.middleware');
const { addMemberSchema, updateMemberRoleSchema } = require('../validators/projectMember.validator');
const { uploadProjectImage } = require('../middlewares/upload.middleware');

// Relations
const taskRouter = require('./task.routes');
const whiteboardRouter = require('./whiteboard.routes');
router.use('/:projectId/tasks', taskRouter);
router.use('/:projectId/whiteboard', whiteboardRouter);

// ── PUBLIC DOMAIN (Token-based actions) ──────────────────────────────────
router.get('/invitations/token/respond', projectCtrl.respondToInviteByToken);

// Set Global Protections
router.use(protect);

// ── SEARCH & DISCOVERY ──────────────────────────────────────────────────────
router.get('/search', projectCtrl.globalSearch);
router.get('/invitations', projectCtrl.getProjectInvitations);
router.post('/:id/invitations/respond', projectCtrl.respondToProjectInvite);

// ── ACTIVITY & ANALYTICS DOMAIN ───────────────────────────────────────────────
router.get('/workspace/stats', cacheMiddleware('workspace_stats', 300), projectCtrl.getWorkspaceStats);
router.get('/workspace/analytics', analyticsCtrl.getWorkspaceAnalytics);

router.route('/')
    .get(cacheMiddleware('projects_list', 60), projectCtrl.getProjects)
    .post(projectCtrl.createProject);

router.route('/:id')
    .get(cacheMiddleware('project_detail', 60), projectCtrl.getProject)
    .put(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), projectCtrl.updateProject)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), projectCtrl.deleteProject);

router.post('/:id/image', isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), uploadProjectImage, projectCtrl.uploadProjectImage);
router.post('/:id/restore', authorizeProjectAccess(['Manager']), projectCtrl.restoreProject);
router.delete('/:id/purge', authorizeProjectAccess(['Manager']), projectCtrl.purgeProject);
router.post('/:id/dismiss-alert', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), projectCtrl.dismissDeadlineAlert);


// ── MEMBERS DOMAIN (RBAC & Teams) ───────────────────────────────────────────
router.route('/:id/members')
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), validate(addMemberSchema), projectCtrl.addMember);

router.route('/:id/members/:userId')
    .put(isNotArchived, authorizeProjectAccess(['Manager']), validate(updateMemberRoleSchema), projectCtrl.updateMemberRole)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), projectCtrl.removeMember);

router.get('/:id/activity', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_activity', 30), projectCtrl.getProjectActivity);
router.get('/:id/insights', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_insights', 60), projectCtrl.getProjectInsights);
router.get('/:id/analytics', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_analytics', 60), analyticsCtrl.getProjectAnalytics);
router.get('/:id/leaderboard', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_leaderboard', 60), analyticsCtrl.getProjectLeaderboard);

module.exports = router;
