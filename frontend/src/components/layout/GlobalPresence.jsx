import React, { useMemo } from 'react';
import { useSocketStore } from '../../store/useSocketStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Circle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const GlobalPresence = () => {
    const location = useLocation();
    const {
        onlineUsers,
        isGlobalPresenceVisible,
        presenceUsers,
        toggleGlobalPresence,
        activeViewers
    } = useSocketStore();

    const isVisible = isGlobalPresenceVisible;

    // The logic:
    // 1. If presenceUsers is provided (from a project click), show those.
    // 2. Otherwise show onlineUsers.
    // 3. Match statuses for project members from activeViewers if possible.

    const displayList = useMemo(() => {
        if (presenceUsers && presenceUsers.length > 0) {
            return presenceUsers.map(member => {
                const userIdStr = (member.userId?._id || member.userId).toString();
                // Find if they are currently online/active in the socket state
                const socketState = onlineUsers.find(u => u.userId === userIdStr) ||
                    activeViewers.find(v => v.userId === userIdStr);

                return {
                    userId: userIdStr,
                    name: member.userId?.name || member.name || 'Unknown',
                    avatar: member.userId?.avatar || member.avatar,
                    status: socketState?.status || 'Offline'
                };
            });
        }
        return onlineUsers;
    }, [presenceUsers, onlineUsers, activeViewers]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 300 }}
                    className="fixed top-20 right-6 z-[100] w-80 h-fit max-h-[70vh] flex flex-col"
                >
                    <div className="bg-[#12121e]/95 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-black text-lg tracking-tight flex items-center gap-2">
                                    <Users className="w-5 h-5 text-emerald-500" />
                                    {presenceUsers?.length > 0 ? 'Team Status' : 'Live Presence'}
                                </h3>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-0.5">
                                    {presenceUsers?.length > 0 ? 'Project Workspace' : 'Global Network'}
                                </p>
                            </div>
                            <button
                                onClick={() => toggleGlobalPresence(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar max-h-[400px]">
                            {displayList.length > 0 ? displayList.map((user) => (
                                <div
                                    key={user.userId}
                                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                                            <img
                                                src={user.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                                className="w-full h-full object-cover"
                                                alt={user.name}
                                            />
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#12121e]
                                            ${user.status === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                user.status === 'Away' ? 'bg-amber-500' :
                                                    user.status === 'Do Not Disturb' ? 'bg-rose-500' : 'bg-zinc-700'}
                                        `} />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{user.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest
                                                ${user.status === 'Online' ? 'text-emerald-500/80' :
                                                    user.status === 'Away' ? 'text-amber-500/80' :
                                                        user.status === 'Do Not Disturb' ? 'text-rose-400' : 'text-zinc-600'}
                                            `}>
                                                {user.status}
                                            </span>
                                            {user.status === 'Online' && (
                                                <span className="w-1 h-1 rounded-full bg-emerald-500/40 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10">
                                    <p className="text-zinc-500 text-xs font-bold">No active collaborators found</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Stats */}
                        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                {displayList.filter(u => u.status !== 'Offline').length} Active
                            </span>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Sync</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalPresence;
