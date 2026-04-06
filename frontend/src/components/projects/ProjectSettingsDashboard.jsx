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
import Button from '../ui/Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


// Tabs Components
import CoreDetailsTab from './CoreDetailsTab';
import MembersTab from './MembersTab';
import ActivityTab from './ActivityTab';
import DangerZoneTab from './DangerZoneTab';
import InsightsTab from './InsightsTab';
import ProjectImage from './ProjectImage';
import AvatarGroup from './AvatarGroup';

// Bulletproofing Components
import ProjectSettingsSkeleton from './ProjectSettingsSkeleton';
import ProjectSettingsError from './ProjectSettingsError';

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
        const activeMembers = project.members.filter(m => !m.status || m.status === 'active');
        return activeMembers.map(m => {
            const memberId = m.userId?._id || m.userId;
            // Check project-room presence first (most accurate for current tab)
            const isInRoom = activeViewers.some(v => v.userId === memberId);
            // Fallback: check global presence (online users connected anywhere)
            const isOnlineGlobally = onlineUsers.some(
                u => u.userId === memberId && u.status !== 'Offline'
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
        return <ProjectSettingsError
            icon={AlertCircle}
            title="Invalid Project ID"
            description="The requested identifier does not match standard project formats."
        />;
    }

    if (isLoading) return <ProjectSettingsSkeleton />;

    if (error) {
        const status = error.response?.status;
        if (status === 403) {
            return <ProjectSettingsError
                icon={Lock}
                title="Access Denied"
                description="You do not have the required permissions for this project."
            />;
        }
        return <ProjectSettingsError
            icon={Ghost}
            title="Project Not Found"
            description="This project may have been moved, deleted, or de-initialized."
        />;
    }

    if (!project) return <ProjectSettingsError title="Sync Error" description="Failed to connect with the database server." />;

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
                    
                    {/* Floating Navigation Controls */}
                    <div className="absolute top-8 left-8 flex gap-4">
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/projects')}
                            className="p-3 bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl hover:scale-110 active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Button>
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

export default ProjectSettingsDashboard;
