import React, { useMemo } from 'react';
import { useSocketStore } from '../../store/useSocketStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Circle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getOptimizedAvatar } from '../../utils/avatar';

const GlobalPresence = () => {
    const location = useLocation();
    const {
        onlineUsers,
        globalPresenceOpen,
        presenceUsers,
        toggleGlobalPresence,
        activeViewers,
        currentProjectId
    } = useSocketStore();
    const isVisible = globalPresenceOpen;
    const displayList = useMemo(() => {
        if (presenceUsers && presenceUsers.length > 0) {
            return presenceUsers.map(user => {
                const memberId = user.userId?._id || user.userId;
                const memberName = user.name || user.userId?.name || 'Collaborator';
                const memberAvatar = user.avatar || user.userId?.avatar;
                const globalUser = onlineUsers.find(u => u.userId?.toString() === memberId?.toString());
                const liveStatus = globalUser ? globalUser.status : 'Offline';
                return {
                    userId: memberId,
                    name: memberName,
                    avatar: memberAvatar,
                    status: liveStatus
                };
            });
        }
        return onlineUsers;
    }, [presenceUsers, onlineUsers]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.98 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-24 right-6 z-[100] w-80 flex flex-col pointer-events-auto"
                >
                    <div className="glass-2 border-glass rounded-[2rem] shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[75vh]">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-glass flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h3 className="text-primary font-black text-sm tracking-[0.1em] uppercase flex items-center gap-2">
                                    <Users className="w-4 h-4 text-theme" />
                                    {presenceUsers?.length > 0 ? 'Project Team' : 'Live Presence'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest opacity-60">
                                        {presenceUsers?.length > 0 ? 'Project Workspace' : 'Global Network'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleGlobalPresence()}
                                className="p-2 hover:bg-white/5 rounded-xl text-tertiary hover:text-primary transition-all active:scale-95"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar min-h-[100px]">
                            {displayList.length > 0 ? displayList.map((user) => (
                                <div
                                    key={user.userId}
                                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/10 transition-all group"
                                >
                                    <div className="relative">
                                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-glass bg-white/5 flex items-center justify-center transition-transform group-hover:scale-105">
                                            <img
                                                src={getOptimizedAvatar(user.avatar, 'sm')}
                                                className="w-full h-full object-cover"
                                                alt={user.name}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-[#0a0a0a]
                                            ${user.status === 'Online' || user.status === 'active' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                user.status === 'Away' || user.status === 'away' ? 'bg-warning' :
                                                    user.status === 'Do Not Disturb' ? 'bg-danger' : 'bg-tertiary'}
                                        `} />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-xs font-black text-primary truncate group-hover:text-theme transition-colors uppercase tracking-tight">{user.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em]
                                                ${user.status === 'Online' || user.status === 'active' ? 'text-success/80' :
                                                    user.status === 'Away' || user.status === 'away' ? 'text-warning/80' :
                                                        user.status === 'Do Not Disturb' ? 'text-danger' : 'text-tertiary'}
                                            `}>
                                                {user.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 opacity-40">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">No active collaborators</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Stats */}
                        <div className="p-4 px-6 bg-white/[0.03] border-t border-glass flex items-center justify-between">
                            <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] opacity-60">
                                {displayList.filter(u => u.status === 'Online' || u.status === 'active').length} Active Users
                            </span>
                            <div className="flex items-center gap-1.5 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <span className="w-1 h-1 rounded-full bg-success" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Encypted Sync</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalPresence;
