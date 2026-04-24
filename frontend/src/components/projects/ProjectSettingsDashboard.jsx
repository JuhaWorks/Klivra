import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Settings,
    Users,
    History,
    AlertCircle,
    ArrowLeft,
    Lock,
    Ghost,
    Zap,
    Circle,
    LayoutDashboard
} from 'lucide-react';
import { useProject } from '../../hooks/projects/useProjectQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';
import { useProjectSocket } from '../../hooks/projects/useProjectSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/BaseUI';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


// Tabs Components
import CoreDetailsTab from './CoreDetailsTab';
import MembersTab from './MembersTab';
import ActivityTab from './ActivityTab';
import DangerZoneTab from './DangerZoneTab';
import InsightsTab from './InsightsTab';
// Shared UI Components
import { ProjectImage, AvatarGroup } from './ProjectShared';
import {  Skeleton  } from '../ui/Loaders';

/**
 * Modern 2026 Project Settings Dashboard
 * Glassmorphism 2.0, Real-time Presence, Anti-grid Layouts
 */

const ProjectSettingsDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const { activeViewers, onlineUsers, isConnected } = useSocketStore();
    const [activeTab, setActiveTab] = useState('core');

    // Socket Synchronization & Presence
    useProjectSocket(id);

    const isValidId = useMemo(() => /^[0-9a-fA-F]{24}$/.test(id), [id]);
    const { data: project, isLoading, error } = useProject(isValidId ? id : null);

    const presenceMembers = useMemo(() => {
        if (!project?.members) return [];
        const activeMembers = project.members.filter(m => m.userId && (!m.status || m.status === 'active'));
        return activeMembers.map(m => {
            const memberId = m.userId?._id || m.userId;
            const memberIdStr = memberId.toString();
            // Check project-room presence first (most accurate for current tab)
            const isInRoom = activeViewers.some(v => v.userId?.toString() === memberIdStr);
            // Fallback: check global presence (online users connected anywhere)
            const isOnlineGlobally = onlineUsers.some(
                u => u.userId?.toString() === memberIdStr && u.status !== 'Offline'
            );
            const isActive = isInRoom || isOnlineGlobally;
            return {
                userId: memberId,
                name: m.userId?.name || 'Unknown',
                avatar: m.userId?.avatar,
                status: isActive ? 'active' : 'away'
            };
        });
    }, [project?.members, activeViewers, onlineUsers]);

    if (!isValidId) {
        return <InternalSettingsError
            icon={AlertCircle}
            title="Invalid Project ID"
            description="The requested identifier does not match standard project formats."
        />;
    }

    if (isLoading) return <InternalSettingsSkeleton />;

    if (error) {
        const status = error.response?.status;
        if (status === 403) {
            return <InternalSettingsError
                icon={Lock}
                title="Access Denied"
                description="You do not have the required permissions for this project."
            />;
        }
        return <InternalSettingsError
            icon={Ghost}
            title="Project Not Found"
            description="This project may have been moved, deleted, or de-initialized."
        />;
    }

    if (!project) return <InternalSettingsError title="Sync Error" description="Failed to connect with the database server." />;

    const userRole = project.members?.find(m =>
        (m.userId?._id || m.userId) === currentUser?._id
    )?.role || 'Viewer';

    const isManager = userRole === 'Manager' || currentUser?.role === 'Admin';
    const isAuthorized = isManager || userRole === 'Editor';

    const tabs = [
        { id: 'core', label: 'General', icon: Settings },
        { id: 'insights', label: 'Insights', icon: Zap },
        { id: 'members', label: 'Team', icon: Users },
        { id: 'activity', label: 'Audit', icon: History },
        ...(isManager ? [{ id: 'danger', label: 'Critical Operations', icon: AlertCircle, color: 'text-red-400' }] : []),
    ];

    return (
        <div className="space-y-12">
            {/* Nav Header Area */}
            <div className="space-y-10">
                {/* Cinematic Banner Area */}
                <header className="relative h-[180px] w-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                    <ProjectImage
                        project={project}
                        aspect="h-full w-full"
                        className="transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent pointer-events-none" />
                    
                    {/* Navigation Control */}
                    <div className="absolute top-6 left-6 z-20">
                        <button 
                            onClick={() => navigate('/projects')}
                            className="group flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl hover:bg-black/60 transition-all duration-300"
                        >
                            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black text-white/60 group-hover:text-white uppercase tracking-widest">Back to Projects</span>
                        </button>
                    </div>

                    <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <h1 className="text-5xl font-black text-white tracking-tighter truncate max-w-xl">{project.name}</h1>
                                <div className="px-4 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                                    {project.status}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-gray-400 font-bold text-sm">
                                <div className="flex items-center gap-2">
                                    <LayoutDashboard className="w-4 h-4 text-cyan-500/60" />
                                    <span>Workspace Settings</span>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                                <span className="opacity-60">ID: {id.substring(0, 8).toUpperCase()}</span>
                            </div>
                        </div>

                        {/* Real-time Presence Indicators */}
                        <div className="flex items-center gap-6 glass-2 bg-black/40 p-2.5 pl-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
                            <div className="flex items-center gap-6">
                                <AvatarGroup
                                    viewers={presenceMembers}
                                    onClick={() => useSocketStore.getState().toggleGlobalPresence(true, project.members)}
                                />
                                <div className="w-px h-8 bg-white/10" />
                                <div className="flex items-center gap-3 pr-3">
                                    <div className="relative flex h-3 w-3">
                                        <div className={twMerge(clsx(
                                            "absolute inset-0 rounded-full animate-ping opacity-75",
                                            isConnected ? "bg-emerald-400" : "bg-red-400"
                                        ))} />
                                        <div className={twMerge(clsx(
                                            "relative rounded-full h-3 w-3",
                                            isConnected ? "bg-emerald-500" : "bg-red-500"
                                        ))} />
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                        {isConnected ? 'Live Sync' : 'Disconnected'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Anti-grid Tab Navigation */}
                <div className="flex flex-wrap items-center gap-3 p-2 glass-2 bg-white/5 border border-white/5 rounded-2xl w-fit">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={twMerge(clsx(
                                    "relative flex items-center gap-3 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 outline-none",
                                    isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                                ))}
                            >
                                <Icon className={twMerge(clsx("w-4 h-4 transition-colors", isActive ? (tab.color || 'text-cyan-400') : 'text-gray-600'))} />
                                <span className="relative z-10">{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeSettingsTab"
                                        className="absolute inset-0 bg-white/5 border border-white/10 rounded-2xl -z-10 shadow-2xl"
                                        transition={{ type: 'spring', bounce: 0.15, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Segment */}
            <main className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ 
                            type: 'spring', 
                            stiffness: 300, 
                            damping: 30 
                        }}
                    >
                        {activeTab === 'core' && <CoreDetailsTab project={project} isAuthorized={isAuthorized} />}
                        {activeTab === 'insights' && <InsightsTab projectId={project._id} />}
                        {activeTab === 'members' && <MembersTab project={project} currentUser={currentUser} />}
                        {activeTab === 'activity' && <ActivityTab projectId={project._id} />}
                        {activeTab === 'danger' && isManager && <DangerZoneTab project={project} />}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

/**
 * 🛠️ Project Settings Shared Helpers (Internal)
 */

const InternalSettingsError = ({ title, description, icon: Icon = Lock }) => {
    const navigate = useNavigate();
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
            <div className="p-12 text-center bg-zinc-950/50 border border-white/5 rounded-[40px] max-w-2xl mx-auto backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/10 blur-[100px] group-hover:bg-emerald-600/20 transition-all duration-700" />
                <div className="relative space-y-6">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                        <Icon className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-tighter">{title}</h2>
                        <p className="text-zinc-500 font-medium leading-relaxed max-w-sm mx-auto">{description}</p>
                    </div>
                    <div className="pt-4">
                        <button
                            onClick={() => navigate('/projects')}
                            className="group flex items-center gap-3 px-8 py-3.5 bg-white text-zinc-950 font-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5 mx-auto"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InternalSettingsSkeleton = () => {
    return (
        <div className="max-w-6xl mx-auto p-6 sm:p-10 space-y-10">
            <div className="flex items-center gap-5">
                <Skeleton className="w-11 h-11 rounded-2xl" opacity={0.2} />
                <div className="space-y-2">
                    <Skeleton className="h-10 w-48 rounded-xl" opacity={0.3} />
                    <Skeleton className="h-4 w-32 rounded-lg" opacity={0.15} />
                </div>
            </div>
            <div className="flex gap-2 p-1.5 bg-zinc-950/80 border border-white/5 rounded-2xl w-fit">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-xl" opacity={0.1} />
                ))}
            </div>
            <div className="space-y-6">
                <Skeleton className="h-64 w-full rounded-[32px]" opacity={0.05} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-48 w-full rounded-[32px]" opacity={0.05} />
                    <Skeleton className="h-48 w-full rounded-[32px]" opacity={0.05} />
                </div>
            </div>
        </div>
    );
};

export default ProjectSettingsDashboard;
