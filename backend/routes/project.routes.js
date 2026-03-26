const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { isNotArchived, authorizeProjectAccess } = require('../middlewares/project.middleware');

// Consolidated Controller
const projectCtrl = require('../controllers/project.controller');
const { cacheMiddleware } = require('../utils/redis');
const validate = require('../middlewares/validate.middleware');
const { addMemberSchema, updateMemberRoleSchema } = require('../validators/projectMember.validator');

// Relations
const taskRouter = require('./task.routes');
router.use('/:projectId/tasks', taskRouter);

// Set Global Protections
router.use(protect);

// ── CORE DOMAIN (CRUD & Soft-Delete) ─────────────────────────────────────────
router.route('/')
    .get(cacheMiddleware('projects_list', 120), projectCtrl.getProjects)
    .post(projectCtrl.createProject);

const { uploadProjectImage } = require('../middlewares/upload.middleware');

router.route('/:id')
    .get(cacheMiddleware('project_detail', 60), projectCtrl.getProject)
    .put(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), projectCtrl.updateProject)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), projectCtrl.deleteProject);

router.post('/:id/image', isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), uploadProjectImage, projectCtrl.uploadProjectImage);
router.post('/:id/restore', authorizeProjectAccess(['Manager']), projectCtrl.restoreProject);
router.post('/:id/dismiss-alert', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), projectCtrl.dismissDeadlineAlert);

// ── MEMBERS DOMAIN (RBAC & Teams) ───────────────────────────────────────────
router.route('/:id/members')
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), validate(addMemberSchema), projectCtrl.addMember);

router.route('/:id/members/:userId')
    .put(isNotArchived, authorizeProjectAccess(['Manager']), validate(updateMemberRoleSchema), projectCtrl.updateMemberRole)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), projectCtrl.removeMember);

// ── ACTIVITY & ANALYTICS DOMAIN ───────────────────────────────────────────────
router.get('/workspace/stats', cacheMiddleware('workspace_stats', 300), projectCtrl.getWorkspaceStats);
router.get('/:id/activity', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_activity', 30), projectCtrl.getProjectActivity);
router.get('/:id/insights', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), cacheMiddleware('project_insights', 60), projectCtrl.getProjectInsights);

module.exports = router;
