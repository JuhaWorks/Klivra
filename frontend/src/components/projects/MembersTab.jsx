import React, { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../store/useAuthStore';
import { useProjectMembers } from '../../hooks/projects/useProjectMembers';
import InviteMemberDialog from './InviteMemberDialog';
import MemberRow from './MemberRow';
import Card from '../ui/Card';
import { Users, ShieldCheck, Zap, Plus, UserPlus } from 'lucide-react';

/**
 * Modern 2026 MembersTab
 * High-performance team management with Glassmorphism 2.0
 */
const MembersTab = ({ project, currentUser }) => {
    const emailInputRef = useRef(null);

    const {
        state,
        actions,
        status,
        auth
    } = useProjectMembers(project, currentUser);

    // Fetch user's connections for Fast-Track
    const { data: connectionsRes } = useQuery({
        queryKey: ['connections'],
        queryFn: async () => (await api.get('/connections')).data,
        enabled: auth.isManager, // Only fetch if user can manage
        staleTime: 1000 * 60 * 5
    });

    const eligibleConnections = useMemo(() => {
        if (!connectionsRes?.data) return [];
        const existingEmails = new Set(project.members.filter(m => m.status !== 'rejected').map(m => m.userId?.email));
        return connectionsRes.data.filter(c => !existingEmails.has(c.user?.email));
    }, [connectionsRes, project.members]);

    return (
        <div className="space-y-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-cyan-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                        <Users className="w-3.5 h-3.5" />
                        <span>Team Management</span>
                    </div>
                    <h2 className="text-4xl font-bold text-white tracking-tighter">Team Members</h2>
                    <p className="text-gray-400 font-medium text-sm max-w-lg">
                        Manage roles and permissions for all members assigned to this project.
                    </p>
                </div>
                {auth.isManager && (
                    <div className="flex shrink-0">
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
                    </div>
                )}
            </header>

            {/* FAST-TRACK CAROUSEL */}
            <AnimatePresence>
                {auth.isManager && eligibleConnections.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 mb-2">
                            <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400/20" />
                                <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest">
                                    Network Connections
                                </span>
                            </div>
                            
                            {/* Horizontal scrolling block */}
                            <div className="flex overflow-x-auto pb-4 -mx-2 px-2 snap-x hide-scrollbar pointer-events-auto">
                                <div className="flex gap-3">
                                    <AnimatePresence>
                                        {eligibleConnections.map((conn) => (
                                            <motion.div
                                                layout
                                                key={conn._id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                                                transition={{ duration: 0.2 }}
                                                className="snap-start shrink-0 pointer-events-auto"
                                            >
                                                <button
                                                    onClick={() => actions.handleFastTrack(conn.user?.email)}
                                                    disabled={status.isAdding}
                                                    className="group relative flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-theme/10 hover:border-theme/30 active:scale-[0.98] transition-all disabled:opacity-50 text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-[#09090b] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                                                        {conn.user?.avatar ? (
                                                            <img src={conn.user.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-gray-400 font-black text-xs">
                                                                {conn.user?.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col pr-2">
                                                        <span className="text-xs font-bold text-white group-hover:text-theme-400 transition-colors">
                                                            {conn.user?.name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                                                            {conn.user?.role}
                                                        </span>
                                                    </div>
                                                    <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full bg-theme flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg shadow-theme/30">
                                                        <Plus className="w-3 h-3 text-white" />
                                                    </div>
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Card className="overflow-hidden" padding="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                                <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
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

                {project.members.length === 0 && (
                    <div className="py-24 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                            <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">No Members</h3>
                        <p className="text-gray-400 text-sm mt-1 max-w-xs">There are currently no members in this project.</p>
                    </div>
                )}

                <footer className="px-10 py-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Secure connection active
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                            {project.members.filter(m => !m.status || m.status === 'active').length} Active {project.members.filter(m => !m.status || m.status === 'active').length === 1 ? 'Member' : 'Members'}
                        </span>
                    </div>
                </footer>
            </Card>
        </div>
    );
};

export default MembersTab;
