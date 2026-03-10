const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { isNotArchived, authorizeProjectAccess } = require('../middlewares/project.middleware');

// Modular Controllers
const core = require('../controllers/projectCore.controller');
const members = require('../controllers/projectMembers.controller');
const activity = require('../controllers/projectActivity.controller');
const { getProjectInsights, getWorkspaceStats } = require('../controllers/projectAnalytics.controller');
const validate = require('../middlewares/validate.middleware');
const { addMemberSchema, updateMemberRoleSchema } = require('../validators/projectMember.validator');

// Relations
const taskRouter = require('./task.routes');
router.use('/:projectId/tasks', taskRouter);

// Set Global Protections
router.use(protect);

// ── CORE DOMAIN (CRUD & Soft-Delete) ─────────────────────────────────────────
router.route('/')
    .get(core.getProjects)
    .post(core.createProject);

const { uploadProjectImage } = require('../middlewares/upload.middleware');

router.route('/:id')
    .get(core.getProject)
    .put(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), core.updateProject)
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), uploadProjectImage, core.uploadProjectImage)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), core.deleteProject);

router.post('/:id/restore', authorizeProjectAccess(['Manager']), core.restoreProject);

// ── MEMBERS DOMAIN (RBAC & Teams) ───────────────────────────────────────────
router.route('/:id/members')
    .post(isNotArchived, authorizeProjectAccess(['Manager', 'Editor']), validate(addMemberSchema), members.addMember);

router.route('/:id/members/:userId')
    .put(isNotArchived, authorizeProjectAccess(['Manager']), validate(updateMemberRoleSchema), members.updateMemberRole)
    .delete(isNotArchived, authorizeProjectAccess(['Manager']), members.removeMember);

// ── ACTIVITY & ANALYTICS DOMAIN ───────────────────────────────────────────────
router.get('/:id/activity', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), activity.getProjectActivity);

const analytics = require('../controllers/projectAnalytics.controller');
router.get('/workspace/stats', analytics.getWorkspaceStats);
router.get('/:id/insights', authorizeProjectAccess(['Manager', 'Editor', 'Viewer']), analytics.getProjectInsights);

module.exports = router;
