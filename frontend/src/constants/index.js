/**
 * Klivra Frontend Constants Hub
 */

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
        VERIFY_EMAIL: '/auth/verify-email',
        OAUTH_EXCHANGE: '/auth/oauth/exchange',
    },
    PROFILE: {
        UPDATE: '/auth/profile',
        PASSWORD: '/auth/profile/password',
        STATUS: '/auth/profile/status',
        AVATAR: '/auth/profile/avatar',
        COVER: '/auth/profile/cover',
    },
    TASKS: {
        BASE: '/tasks',
        ACTIVITY: (id) => `/tasks/${id}/activity`,
        COMMENTS: (id) => `/tasks/${id}/comments`,
    },
    ANALYTICS: {
        WORKSPACE: '/analytics/workspace',
        PROJECT: (id) => `/analytics/project/${id}`,
    },
    PROJECTS: '/projects',
    CHATS: '/chats',
    CHATS_MESSAGES: (id) => `/chats/${id}/messages`,
    CHATS_UPLOAD: '/chats/upload',
    CHATS_SEND: '/chats/send',
    CHATS_BUBBLE: (id) => `/chats/${id}/bubble`,
    CHATS_ARCHIVE: (id) => `/chats/${id}/archive`,
    CHATS_UNSEND: (id) => `/chats/messages/${id}/unsend`,
    CHATS_DELETE: (id) => `/chats/${id}`,
    CHATS_CLEAR: (id) => `/chats/${id}/clear`,
};

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Canceled'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
 
export const TASK_TYPES = {
    TASK: 'Task',
    FEATURE: 'Feature',
    BUG: 'Bug',
    IMPROVEMENT: 'Improvement'
};
 
export const PROJECT_STATUSES = {
    ACTIVE: 'Active',
    ARCHIVED: 'Archived'
};
 
export const PROJECT_ROLES = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    DEVELOPER: 'Developer',
    EDITOR: 'Editor'
};
 
export const MEMBERSHIP_STATUS = {
    ACTIVE: 'active',
    PENDING: 'pending',
    REJECTED: 'rejected'
};
 
export const CONNECTION_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    BLOCKED: 'blocked'
};
 
export const NOTIFICATION_TYPES = {
    ASSIGNMENT: 'Assignment',
    MENTION: 'Mention',
    CHAT: 'Chat',
    STATUS_UPDATE: 'StatusUpdate',
    METADATA_UPDATE: 'MetadataUpdate',
    DEADLINE: 'Deadline',
    GAMIFICATION: 'Gamification',
    SYSTEM: 'System'
};

export const TASK_COHORTS = [
    { id: 'Strategic', label: 'Strategic', types: ['Epic', 'Feature', 'Story', 'Research', 'Discovery'] },
    { id: 'Engineering', label: 'Engineering', types: ['Refactor', 'DevOps', 'Technical Debt', 'QA', 'Performance'] },
    { id: 'Sustainability', label: 'Sustainability', types: ['Bug', 'Security', 'Maintenance', 'Hygiene', 'Compliance'] },
    { id: 'Operations', label: 'Operations', types: ['Task', 'Support', 'Admin', 'Meeting', 'Review'] }
];

export const UI_LABELS = {
    CHRONICLE_EMPTY: 'Chronicle Empty',
    DISCUSSION_PENDING: 'Discussion Pending',
    NO_MATCH_FOUND: 'No match found',
    INTELLIGENCE_LOOP: 'Intelligence Loop',
};

export const THEME_COLORS = {
    EMERALD: '#10b981',
    EMERALD_RGB: '16,185,129',
};
