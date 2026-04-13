import React from 'react';

/**
 * Universal Activity Narrative Engine
 * Translates low-level audit logs into high-density professional prose.
 */
export const renderActivityNarrative = (log) => {
    const actor = log.user?.name || 'System';
    const details = log.details || {};
    const action = log.action;

    const Highlight = ({ children, color = 'theme' }) => (
        <span className={`font-bold inline-flex items-center px-1.5 py-0.5 rounded-lg bg-${color}/5 border border-${color}/10 text-${color}`}>
            {children}
        </span>
    );

    switch (action) {
        case 'TASK_CREATED':
        case 'EntityCreate':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> initialized <Highlight>{details.title || 'Task'}</Highlight>.
                </>
            );
        case 'TASK_UPDATED':
        case 'EntityUpdate':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> modified <Highlight>{details.title || 'Task'}</Highlight>: <span className="italic opacity-80">{details.summary || 'Parameters adjusted'}</span>.
                </>
            );
        case 'TASK_DELETED':
        case 'EntityDelete':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> purged <Highlight color="danger">{details.title || 'Task'}</Highlight> from the environment.
                </>
            );
        case 'CommentAdded':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> contributed a comment to <Highlight>{details.title || 'Task'}</Highlight>.
                </>
            );
        case 'TimerStart':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> activated the chronicler for <Highlight>{details.title || 'Task'}</Highlight>.
                </>
            );
        case 'TimerStop':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> concluded effort on <Highlight>{details.title || 'Task'}</Highlight> <span className="text-[10px] opacity-40">({details.duration || '0m'} logged)</span>.
                </>
            );
        case 'SubtaskToggle':
            const subAction = details.summary?.includes('unchecked') ? 'reopened' : 'resolved';
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> {subAction} a sub-unit of <Highlight>{details.title || 'Task'}</Highlight>.
                </>
            );
        case 'PROJECT_CREATED':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> provisioned new workspace <Highlight>{details.name}</Highlight>.
                </>
            );
        case 'PROJECT_UPDATED':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> updated workspace configuration for <Highlight>{details.name}</Highlight>.
                </>
            );
        case 'PROJECT_DELETED':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> decommissioned workspace <Highlight color="amber-500">{details.name}</Highlight>.
                </>
            );
        case 'ROLE_UPDATED':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> elevated <span className="font-bold mx-1">{details.targetUserName}</span> to <Highlight color="amber-500">{details.newRole}</Highlight>.
                </>
            );
        case 'USER_BANNED':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> suspended access for <Highlight color="danger">{details.targetUserName}</Highlight>.
                </>
            );
        case 'MEMBER_ADDED':
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> onboarded <span className="font-bold mx-1">{details.memberName}</span> as <Highlight>{details.role}</Highlight>.
                </>
            );
        case 'FAILED_LOGIN':
            return (
                <>
                    Unauthorized access attempt detected for <Highlight color="danger">{details.email}</Highlight>.
                </>
            );
        default:
            return (
                <>
                    <span className="font-semibold text-primary">{actor}</span> executed <span className="font-bold text-primary">{action.replace(/_/g, ' ')}</span>.
                </>
            );
    }
};
