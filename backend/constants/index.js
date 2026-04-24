/**
 * Klivra Backend Constants Hub
 */

const AUTH_MESSAGES = {
    USER_EXISTS: 'User already exists. Please log in.',
    REGISTRATION_SUCCESS: 'Registration successful. Please verify your email.',
    VERIFICATION_RESENT: 'Verification email resent. Please check your inbox.',
    INVALID_CREDENTIALS: 'Invalid email or password',
    NOT_AUTHORIZED: 'Not authorized, no refresh token',
    TOKEN_ABUSE: 'Security alert: Token reuse detected. Please log in again.',
    EMAIL_VERIFIED: 'Email successfully verified',
    VERIFY_SUBJECT: 'Verify your Klivra account',
    ACCOUNT_BANNED: 'Your account has been suspended for violating terms of service.',
    ACCOUNT_DEACTIVATED: 'Your account is currently deactivated.',
    DEACTIVATED_PROMPT: 'Your account is currently deactivated. Would you like to reactivate it and log in?',
    ACCOUNT_SUSPENDED: 'Your account is currently suspended.',
    PENDING_VERIFICATION: 'Your account is pending verification.',
};

const SYSTEM_MESSAGES = {
    ERROR_NOT_FOUND: 'Entity not found',
    ERROR_ACCESS_DENIED: 'Access denied. You do not have permission for this action.',
    ERROR_BAD_REQUEST: 'Malformed request or missing parameters.',
    ERROR_SERVER: 'Internal systemic anomaly detected.',
    PROJECT_NOT_FOUND: 'Project not found',
    TASK_NOT_FOUND: 'Task not found',
    USER_NOT_FOUND: 'User not found',
    CHAT_NOT_FOUND: 'Chat not found',
    LOCATION_NOT_FOUND: 'Location not found',
    MAINTENANCE_ACTIVE: 'System is currently under maintenance.',
    MAINTENANCE_INACTIVE: 'System is operational.',
    RE_INVITED: 'User re-invited successfully.',
    MEMBER_ALREADY: 'User is already a member or pending.',
    INVITE_SENT: 'Invitation sent and email delivered',
};

const NETWORKING_MESSAGES = {
    REQUEST_SENT: 'Connection request sent',
    REQUEST_RESENT: 'Connection request re-sent',
    REQUEST_ALREADY_SENT: 'You have already sent a request to this user',
    ALREADY_CONNECTED: 'You are already connected with this user',
    AUTO_ACCEPTED: 'Connection accepted! They had already sent you a request.',
    ACCEPTED: 'Connection accepted',
    DECLINED: 'Connection declined',
    WITHDRAWN: 'Connection request withdrawn',
    REMOVED: 'Connection removed',
    ADMIN_RESTRICTED: 'Admin accounts cannot use this feature',
    SELF_CONNECT_RESTRICTED: 'You cannot connect with yourself',
};

const CHAT_MESSAGES = {
    MESSAGE_REMOVED: 'This message was removed',
    ACCESS_DENIED: 'Access denied. You are not a participant in this chat.',
    REMOVED_FOR_YOU: 'Chat removed for you',
    HISTORY_CLEARED: 'History cleared for you',
};

const AUDIT_LOG_TYPES = {
    ENTITY_CREATE: 'EntityCreate',
    ENTITY_UPDATE: 'EntityUpdate',
    ENTITY_DELETE: 'EntityDelete',
    MEMBER_ADDED: 'MEMBER_ADDED',
    MEMBER_REMOVED: 'MEMBER_REMOVED',
    MEMBER_ROLE_UPDATED: 'MEMBER_ROLE_UPDATED',
    INVITE_RESPONDED: 'INVITE_RESPONDED',
    TIMER_START: 'TimerStart',
    TIMER_STOP: 'TimerStop',
    SUBTASK_TOGGLE: 'SubtaskToggle',
    ROLE_UPDATED: 'ROLE_UPDATED',
    USER_BANNED: 'USER_BANNED',
    USER_UNBANNED: 'USER_UNBANNED',
    MAINTENANCE_ENABLED: 'MAINTENANCE_ENABLED',
    MAINTENANCE_DISABLED: 'MAINTENANCE_DISABLED',
    IP_BLOCKED: 'IP_BLOCKED',
};

const SYSTEM_FALLBACKS = {
    NASA_TITLE: 'System Insight',
    NASA_EXPLANATION: 'A panoramic view of orbital intelligence. NASA telemetry is currently under maintenance or rate-limited. Serving local archive.',
    NASA_AUTHOR: 'Klivra Intelligence',
    NASA_URL: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    QUOTE_BODY: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    QUOTE_AUTHOR: 'Winston Churchill',
};

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed', 'Canceled'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const DOMAIN_MAPPING = {
    Strategic: ['Epic', 'Feature', 'Story', 'Discovery', 'Research', 'Strategy'],
    Engineering: ['DevOps', 'Refactor', 'Technical Debt', 'QA', 'Performance', 'Engineering', 'Architecture'],
    Sustainability: ['Maintenance', 'Hygiene', 'Task', 'Sustainability', 'Security Patch', 'Legacy'],
    Operations: ['Bug', 'Security', 'Compliance', 'Meeting', 'Review', 'Support', 'Operations', 'Admin']
};

const PROJECT_ROLES = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    EDITOR: 'Editor',
    VIEWER: 'Viewer'
};

const MEMBERSHIP_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    REJECTED: 'rejected'
};

const CONNECTION_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined'
};

const USER_STATUSES = {
    ONLINE: 'Online',
    AWAY: 'Away',
    DND: 'Do Not Disturb',
    OFFLINE: 'Offline'
};

const NOTIFICATION_TYPES = {
    ASSIGNMENT: 'Assignment',
    MENTION: 'Mention',
    DEADLINE: 'Deadline',
    STATUS_UPDATE: 'StatusUpdate',
    METADATA_UPDATE: 'MetadataUpdate',
    COMMENT: 'Comment',
    CHAT: 'Chat',
    SECURITY: 'Security',
    CONNECTION_REQUEST: 'ConnectionRequest',
    CONNECTION_ACCEPTED: 'ConnectionAccepted',
    ENDORSEMENT: 'Endorsement',
    SYSTEM: 'System'
};

const TASK_TYPES = {
    TASK: 'Task',
    FEATURE: 'Feature',
    BUG: 'Bug',
    IMPROVEMENT: 'Improvement',
    EPIC: 'Epic',
    STORY: 'Story',
    RESEARCH: 'Research',
    DISCOVERY: 'Discovery',
    STRATEGY: 'Strategy',
    DEVOPS: 'DevOps',
    REFACTOR: 'Refactor',
    TECHNICAL_DEBT: 'Technical Debt',
    QA: 'QA',
    PERFORMANCE: 'Performance',
    ARCHITECTURE: 'Architecture',
    MAINTENANCE: 'Maintenance',
    HYGIENE: 'Hygiene',
    SUSTAINABILITY: 'Sustainability',
    SECURITY_PATCH: 'Security Patch',
    LEGACY: 'Legacy',
    SECURITY: 'Security',
    COMPLIANCE: 'Compliance',
    MEETING: 'Meeting',
    REVIEW: 'Review',
    SUPPORT: 'Support',
    OPERATIONS: 'Operations',
    ADMIN: 'Admin'
};

const EMERGENCY_TASK_TYPES = [TASK_TYPES.SECURITY, TASK_TYPES.COMPLIANCE];

const PROJECT_STATUSES = {
    ACTIVE: 'Active',
    ARCHIVED: 'Archived'
};

const SECURITY_CONFIG = {
    MAX_REFRESH_TOKENS: 10,
    VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    TEMP_AUTH_TOKEN_EXPIRY: 5 * 60 * 1000, // 5 minutes
};

const COOKIE_CONFIG = {
    REFRESH_TOKEN_NAME: 'refreshToken',
    EXPIRY_DAYS: 30,
};

module.exports = {
    AUTH_MESSAGES,
    SYSTEM_MESSAGES,
    NETWORKING_MESSAGES,
    CHAT_MESSAGES,
    AUDIT_LOG_TYPES,
    SYSTEM_FALLBACKS,
    TASK_STATUSES,
    TASK_PRIORITIES,
    DOMAIN_MAPPING,
    PROJECT_ROLES,
    MEMBERSHIP_STATUS,
    CONNECTION_STATUS,
    USER_STATUSES,
    NOTIFICATION_TYPES,
    TASK_TYPES,
    EMERGENCY_TASK_TYPES,
    PROJECT_STATUSES,
    SECURITY_CONFIG,
    COOKIE_CONFIG
};
