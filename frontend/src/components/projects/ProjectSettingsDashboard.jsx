import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
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
    User
} from 'lucide-react';
import { useProject } from '../../hooks/projects/useProjectQueries';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';
import { useProjectSocket } from '../../hooks/projects/useProjectSocket';
import { motion, AnimatePresence } from 'framer-motion';

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

const ProjectSettingsDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const { activeViewers, isConnected } = useSocketStore();
    const [activeTab, setActiveTab] = useState('core');

    // Socket Synchronization & Presence
    useProjectSocket(id);

    // Corner Case 1: Malformed URL / Invalid ID
    const isValidId = useMemo(() => /^[0-9a-fA-F]{24}$/.test(id), [id]);

    const { data: project, isLoading, error } = useProject(isValidId ? id : null);

    // Immediate redirection for invalid IDs
    if (!isValidId) {
        return <ProjectSettingsError
            icon={AlertCircle}
            title="Invalid Project Link"
            description="The project ID provided in the URL is malformed. Please verify the link and try again."
        />;
    }

    if (isLoading) return <ProjectSettingsSkeleton />;

    if (error) {
        const status = error.response?.status;
        if (status === 403) {
            return <ProjectSettingsError
                icon={Lock}
                title="Access Denied"
                description="You do not have permission to view the settings for this project."
            />;
        }
        return <ProjectSettingsError
            icon={Ghost}
            title="Ghost Project"
            description="This project might have been deleted or moved to another workspace."
        />;
    }

    if (!project) return <ProjectSettingsError title="Empty Data" description="We couldn't retrieve any data for this project." />;

    const userRole = project.members?.find(m =>
        (m.userId?._id || m.userId) === currentUser?._id
    )?.role || 'Viewer';

    // Permission flags
    const isManager = userRole === 'Manager' || currentUser?.role === 'Admin';
    const isAuthorized = isManager || userRole === 'Editor';

    const tabs = [
        { id: 'core', label: 'General', icon: Settings },
        { id: 'insights', label: 'Insights', icon: Zap },
        { id: 'members', label: 'Team', icon: Users },
        { id: 'activity', label: 'Audit', icon: History },
        ...(isManager ? [{ id: 'danger', label: 'Danger', icon: AlertCircle, color: 'text-red-400' }] : []),
    ];

    return (
        <div className="max-w-6xl mx-auto p-6 sm:p-10 space-y-10 pb-32">
            {/* Nav Header */}
            <div className="space-y-8">
                {/* Banner Area */}
                <div className="relative h-64 w-full rounded-[40px] overflow-hidden border border-white/5 shadow-2xl">
                    <ProjectImage
                        project={project}
                        aspect="h-full w-full"
                        className="transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => navigate('/projects')}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-zinc-400 hover:text-white border border-white/5 active:scale-90"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black text-white tracking-tighter truncate max-w-md">{project.name}</h1>
                                <span className="px-3 py-1 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">{project.status}</span>
                            </div>
                            <p className="text-zinc-500 font-bold text-sm mt-1 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-emerald-500/50" />
                                Workspace Management Ecosystem
                            </p>
                        </div>
                    </div>

                    {/* Presence & Socket Status */}
                    <div className="flex items-center gap-6 bg-zinc-900/50 p-2 pl-4 rounded-2xl border border-white/5 backdrop-blur-md">
                        <AvatarGroup
                            viewers={activeViewers}
                            onClick={() => useSocketStore.getState().toggleGlobalPresence(true, project.members)}
                        />

                        <div className="w-px h-6 bg-white/5" />

                        <div
                            onClick={() => useSocketStore.getState().toggleGlobalPresence(true, project.members)}
                            className="flex items-center gap-2 pr-2 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all"
                        >
                            <Circle className={`w-2.5 h-2.5 ${isConnected ? 'text-emerald-500 fill-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-zinc-700 fill-zinc-700'} transition-colors duration-500`} />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{isConnected ? 'Live' : 'Offline'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center p-1.5 bg-zinc-950/80 border border-white/5 rounded-2xl w-fit backdrop-blur-sm">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                    relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 outline-none
                                    ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}
                                `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? (tab.color || 'text-emerald-400') : ''}`} />
                            {tab.label}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabSlot"
                                    className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl -z-10 shadow-2xl"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'core' && <CoreDetailsTab project={project} isAuthorized={isAuthorized} />}
                        {activeTab === 'insights' && <InsightsTab projectId={project._id} />}
                        {activeTab === 'members' && <MembersTab project={project} currentUser={currentUser} />}
                        {activeTab === 'activity' && <ActivityTab projectId={project._id} />}
                        {activeTab === 'danger' && isManager && <DangerZoneTab project={project} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProjectSettingsDashboard;
