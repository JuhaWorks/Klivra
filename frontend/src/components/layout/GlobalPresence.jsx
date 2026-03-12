import React, { useMemo } from 'react';
import { useSocketStore } from '../../store/useSocketStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Circle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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

    // The logic:
    // 1. If presenceUsers is provided (from a project click), show those.
    // 2. Otherwise show onlineUsers.
    // 3. Match statuses for project members from activeViewers if possible.

    const displayList = useMemo(() => {
        // If we are in a project context, show presenceUsers
        if (currentProjectId && presenceUsers && presenceUsers.length > 0) {
            return presenceUsers.map(user => ({
                userId: user.userId?._id || user.userId,
                name: user.name || user.userId?.name || 'Collaborator',
                avatar: user.avatar || user.userId?.avatar,
                status: user.status || 'Offline'
            }));
        }
        // Fallback to global online users
        return onlineUsers;
    }, [presenceUsers, onlineUsers, currentProjectId]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 300 }}
                    className="fixed top-20 right-6 z-[100] w-80 h-fit max-h-[70vh] flex flex-col"
                >
                    <div className="bg-surface/95 backdrop-blur-2xl border border-default rounded-[32px] shadow-elevation overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-subtle flex items-center justify-between">
                            <div>
                                <h3 className="text-primary font-black text-lg tracking-tight flex items-center gap-2">
                                    <Users className="w-5 h-5 text-theme" />
                                    {currentProjectId ? 'Project Team' : 'Live Presence'}
                                </h3>
                                <p className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em] mt-0.5">
                                    {currentProjectId ? 'Project Workspace' : 'Global Network'}
                                </p>
                            </div>
                            <button
                                onClick={() => toggleGlobalPresence()}
                                className="p-2 hover:bg-sunken rounded-full text-tertiary hover:text-primary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar max-h-[400px]">
                            {displayList.length > 0 ? displayList.map((user) => (
                                <div
                                    key={user.userId}
                                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-sunken border border-transparent hover:border-default transition-all group"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-default">
                                            <img
                                                src={user.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                                className="w-full h-full object-cover"
                                                alt={user.name}
                                            />
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-surface
                                            ${user.status === 'Online' || user.status === 'active' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                user.status === 'Away' || user.status === 'away' ? 'bg-warning' :
                                                    user.status === 'Do Not Disturb' ? 'bg-danger' : 'bg-tertiary'}
                                        `} />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-bold text-primary truncate group-hover:text-theme transition-colors uppercase tracking-tight">{user.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest
                                                ${user.status === 'Online' || user.status === 'active' ? 'text-success/80' :
                                                    user.status === 'Away' || user.status === 'away' ? 'text-warning/80' :
                                                        user.status === 'Do Not Disturb' ? 'text-danger' : 'text-tertiary'}
                                            `}>
                                                {user.status}
                                            </span>
                                            {(user.status === 'Online' || user.status === 'active') && (
                                                <span className="w-1 h-1 rounded-full bg-success/40 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10">
                                    <p className="text-tertiary text-xs font-bold">No active collaborators found</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Stats */}
                        <div className="p-4 bg-sunken border-t border-subtle flex items-center justify-between">
                            <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">
                                {displayList.filter(u => u.status !== 'Offline').length} Active
                            </span>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live Sync</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalPresence;
