import React, { useRef } from 'react';
import { useProjectMembers } from '../../hooks/projects/useProjectMembers';
import InviteMemberDialog from './InviteMemberDialog';
import MemberRow from './MemberRow';

/**
 * Shrunk MembersTab component using custom hook and component fission.
 * Follows React FSD architecture and MVC Purist standards.
 */
const MembersTab = ({ project, currentUser }) => {
    const emailInputRef = useRef(null);

    // Logic extracted to custom hook
    const {
        state,
        actions,
        status,
        auth
    } = useProjectMembers(project, currentUser);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Project Members</h2>
                    <p className="text-zinc-500 text-sm mt-1">Manage team access and roles.</p>
                </div>
                {auth.isManager && (
                    <InviteMemberDialog
                        ref={emailInputRef}
                        isOpen={state.isInviteOpen}
                        onOpenChange={actions.setIsInviteOpen}
                        email={state.inviteEmail}
                        role={state.inviteRole}
                        onEmailChange={actions.setInviteEmail}
                        onRoleChange={actions.setInviteRole}
                        onInvite={actions.handleInvite}
                        isLoading={status.isAdding}
                    />
                )}
            </div>

            <div className="bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Member</th>
                                <th className="px-6 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Role</th>
                                <th className="px-6 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">Joined At</th>
                                <th className="px-6 py-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {project.members.map((member) => (
                                <MemberRow
                                    key={member.userId?._id}
                                    member={member}
                                    currentUser={currentUser}
                                    managerCount={auth.managerCount}
                                    isViewer={auth.isViewer}
                                    onUpdateRole={actions.handleUpdateRole}
                                    onRemove={actions.handleRemoveMember}
                                    isUpdating={status.isUpdating}
                                    isRemoving={status.isRemoving}
                                    canManage={auth.isManager}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MembersTab;
