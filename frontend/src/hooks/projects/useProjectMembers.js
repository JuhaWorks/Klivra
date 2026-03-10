import { useState, useCallback, useMemo } from 'react';
import { useAddMember, useUpdateMemberRole, useRemoveMember } from './useProjectQueries';

/**
 * Custom hook to manage project members logic
 */
export const useProjectMembers = (project, currentUser) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Editor');
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const addMemberMutation = useAddMember();
    const updateRoleMutation = useUpdateMemberRole();
    const removeMemberMutation = useRemoveMember();

    // Derived State (Memoized to prevent unnecessary re-renders)
    const members = useMemo(() => project.members || [], [project.members]);

    const userRole = useMemo(() =>
        members.find(m => m.userId?._id === currentUser?._id)?.role || 'Viewer',
        [members, currentUser?._id]);

    const isManager = useMemo(() =>
        userRole === 'Manager' || currentUser?.role === 'Admin',
        [userRole, currentUser?.role]);

    const isViewer = useMemo(() => userRole === 'Viewer', [userRole]);

    const managerCount = useMemo(() =>
        members.filter(m => m.role === 'Manager').length,
        [members]);

    // Handlers (Wrapped in useCallback for performance in child components)
    const handleInvite = useCallback((e) => {
        e.preventDefault();
        addMemberMutation.mutate({ id: project._id, email: inviteEmail, role: inviteRole }, {
            onSuccess: () => {
                setInviteEmail('');
                setIsInviteOpen(false);
            }
        });
    }, [addMemberMutation, project._id, inviteEmail, inviteRole]);

    const handleUpdateRole = useCallback((userId, role) => {
        updateRoleMutation.mutate({ projectId: project._id, userId, role });
    }, [updateRoleMutation, project._id]);

    const handleRemoveMember = useCallback((userId) => {
        removeMemberMutation.mutate({ projectId: project._id, userId });
    }, [removeMemberMutation, project._id]);

    return {
        state: { inviteEmail, inviteRole, isInviteOpen },
        actions: { setInviteEmail, setInviteRole, setIsInviteOpen, handleInvite, handleUpdateRole, handleRemoveMember },
        status: {
            isAdding: addMemberMutation.isPending,
            isUpdating: updateRoleMutation.isPending,
            isRemoving: removeMemberMutation.isPending
        },
        auth: { isManager, isViewer, managerCount, currentUserRole: userRole }
    };
};
