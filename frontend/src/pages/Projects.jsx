import React, { useState, useTransition, useMemo, memo, useEffect } from 'react'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, api } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import { 
    Plus, 
    Search, 
    Folder, 
    Calendar, 
    Users, 
    Settings, 
    ExternalLink, 
    Trash2, 
    RefreshCw, 
    LayoutGrid, 
    Box, 
    Target,
    ChevronRight,
    SearchX,
    Users2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import ProjectCreationModal from '../components/projects/ProjectCreationModal';
import { ProjectImage, DeadlinePopup } from '../components/projects/ProjectShared';
import { toast } from 'react-hot-toast';
import { Button, Card, Input } from '../components/ui/BaseUI';
import { GlassSurface } from '../components/ui/Aesthetics';
import {  Skeleton  } from '../components/ui/Loaders';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getOptimizedAvatar } from '../utils/avatar';
import { PROJECT_STATUSES, PROJECT_ROLES } from '../constants';


// ── MEMOIZED PROJECT CARD ──
const ProjectCard = memo(({ project, user, onlineUsers, toggleGlobalPresence, respondMutation, restoreMutation, purgeMutation, view, EASE, getStatusStyles }) => {
    const onlineMembersCount = project.members?.filter(m => 
        onlineUsers.some(u => u.userId === (m.userId?._id || m.userId))
    ).length || 0;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={EASE}
            className="group relative flex flex-col h-full rounded-[2rem] hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all duration-300 p-2"
        >
            <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-[1.5rem] border border-white/5">
                <ProjectImage
                    project={project}
                    className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <div className={twMerge(clsx(
                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border backdrop-blur-xl transition-all",
                        getStatusStyles(project.status)
                    ))}>
                        {project.status || 'Active'}
                    </div>
                    {user?.interfacePrefs?.showGlobalPresence !== false && onlineMembersCount > 0 && (
                        <button 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGlobalPresence(true, project._id); }}
                            className="flex items-center gap-1.5 px-2 py-1 bg-success/20 border border-success/30 backdrop-blur-md rounded-lg group/presence"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[8px] font-black text-success uppercase tracking-widest">{onlineMembersCount} Live</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="px-2 pb-4 space-y-4 flex-1 flex flex-col">
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-primary tracking-tight group-hover:text-theme transition-colors line-clamp-1">
                        {project.name}
                    </h3>
                    <p className="text-tertiary text-[11px] font-medium line-clamp-2 opacity-40 leading-relaxed min-h-[32px]">
                        {project.description}
                    </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[10px] font-bold font-mono">
                                {new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex -space-x-1.5 overflow-hidden">
                            {(project.members || []).slice(0, 3).map((member, i) => (
                                <div key={i} className="w-5 h-5 rounded-full border border-[#0a0a0a] bg-white/[0.05] overflow-hidden flex-shrink-0">
                                    <img
                                        src={getOptimizedAvatar(member.userId?.avatar || member.avatar, 'xs')}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${member.userId?.name || 'User'}&background=random`; }}
                                    />
                                </div>
                            ))}
                            {project.members?.length > 3 && (
                                <div className="w-5 h-5 rounded-full border border-[#0a0a0a] bg-white/[0.05] flex items-center justify-center text-[7px] font-black text-tertiary">
                                    +{project.members.length - 3}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {view === 'invitations' ? (
                            <div className="flex gap-2">
                                <button onClick={() => respondMutation.mutate({ id: project._id, status: 'rejected' })} className="text-[10px] font-black uppercase text-tertiary hover:text-danger px-2 transition-colors">Decline</button>
                                <button onClick={() => respondMutation.mutate({ id: project._id, status: 'active' })} className="text-[10px] font-black uppercase text-theme px-3 py-1 bg-theme/10 rounded-md hover:bg-theme hover:text-white transition-colors">Accept</button>
                            </div>
                        ) : view === 'archived' ? (
                            <div className="flex gap-2">
                                <button onClick={() => purgeMutation.mutate(project._id)} className="text-[10px] font-black uppercase text-tertiary hover:text-danger px-2 transition-colors">Delete</button>
                                <button onClick={() => restoreMutation.mutate(project._id)} className="text-[10px] font-black uppercase text-success px-3 py-1 bg-success/10 rounded-md hover:bg-success hover:text-white transition-colors">Restore</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link 
                                    to={`/projects/${project._id}/settings`} 
                                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-tertiary hover:text-primary hover:bg-white/[0.08] transition-all"
                                    title="Settings"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </Link>
                                <Link 
                                    to={`/tasks?project=${project._id}`}
                                    className="group/btn flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black bg-theme/10 text-theme hover:bg-theme hover:text-white transition-all uppercase tracking-[0.1em]"
                                >
                                    <span>Enter</span>
                                    <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

const Projects = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState('active');
    const [isPending, startTransition] = useTransition();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const { onlineUsers, toggleGlobalPresence } = useSocketStore();
    const EASE = { type: 'spring', stiffness: 300, damping: 30 };

    // ── NOTIFICATION HANDLER (From Email Links) ──
    useEffect(() => {
        const inviteStatus = searchParams.get('invite_status');
        const message = searchParams.get('message');

        if (inviteStatus) {
            if (inviteStatus === 'success') {
                toast.success(message || 'Invitation processed successfully!');
            } else {
                toast.error(message || 'Failed to process invitation.');
            }

            // Cleanup URL after showing toast to prevent re-triggering on refresh
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('invite_status');
            newParams.delete('message');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const { data: activeRes, isLoading: loadingActive } = useQuery({
        queryKey: ['projects', 'active'],
        queryFn: async () => (await api.get('/projects')).data
    });

    const { data: archivedRes, isLoading: loadingArchived } = useQuery({
        queryKey: ['projects', 'archived'],
        queryFn: async () => (await api.get('/projects?archived=true')).data
    });

    const { data: invitesRes, isLoading: loadingInvites } = useQuery({
        queryKey: ['projects', 'invitations'],
        queryFn: async () => (await api.get('/projects/invitations')).data
    });

    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            await api.put(`/projects/${id}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project restored to active workspace.');
        },
        onError: () => toast.error('Restoration failed.')
    });

    const purgeMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/projects/${id}/purge`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project permanently deleted.');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to purge project.')
    });


    const respondMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            await api.post(`/projects/${id}/invitations/respond`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project invitation processed.');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to process invitation.')
    });

    const activeProjects = activeRes?.data || [];
    const archivedProjects = archivedRes?.data || [];
    const invitedProjects = invitesRes?.data || [];

    const currentList = view === 'active' ? activeProjects : (view === 'archived' ? archivedProjects : invitedProjects);
    const isLoading = view === 'active' ? loadingActive : (view === 'archived' ? loadingArchived : loadingInvites);

    const filteredProjects = currentList.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusStyles = (status) => {
        switch (status) {
            case PROJECT_STATUSES.ACTIVE: return 'text-accent bg-accent/10 border-accent';
            case 'Paused': return 'text-warning bg-warning/10 border-warning/20';
            case 'Completed': return 'text-success bg-success/10 border-success/20';
            case PROJECT_STATUSES.ARCHIVED: return 'text-tertiary bg-glass-heavy border-glass';
            default: return 'text-tertiary bg-glass-heavy border-glass';
        }
    };

    return (
        <div className="w-full space-y-8 sm:space-y-12 pb-20 max-w-[2000px] mx-auto overflow-x-hidden">
            <DeadlinePopup projects={activeProjects} user={user} />
            {/* Header Area */}
            <header className="relative pt-8 sm:pt-12 pb-8 border-b border-default mb-10">
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2.5 text-theme font-black text-[9px] uppercase tracking-[0.3em] opacity-60">
                            <LayoutGrid className="w-3 h-3" />
                            <span>Workspace</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-primary tracking-tighter leading-none">Projects</h1>
                        <p className="text-tertiary font-medium text-xs sm:text-sm max-w-lg opacity-60">
                            Collaborative project workspace for shared tasks and team management.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-8">
                        {/* Minimalist Tabs */}
                        <div className="flex items-center gap-8 px-1">
                            {[
                                { id: 'active', label: 'Active', count: activeProjects.length || 0, icon: Box },
                                { id: 'archived', label: 'Archived', count: archivedProjects.length || 0, icon: Trash2 },
                                { id: 'invitations', label: 'Invites', count: invitedProjects.length || 0, icon: Target }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => startTransition(() => setView(tab.id))}
                                    className={twMerge(clsx(
                                        "relative flex items-center gap-2 pb-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                        view === tab.id ? "text-primary" : "text-tertiary hover:text-secondary"
                                    ))}
                                >
                                    <span>{tab.label}</span>
                                    <span className="opacity-40 font-mono text-[9px]">({tab.count})</span>
                                    {view === tab.id && (
                                        <motion.div 
                                            layoutId="project-tab-line"
                                            className="absolute bottom-[-1px] left-0 right-0 h-[1.5px] bg-theme"
                                            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {user?.role !== PROJECT_ROLES.ADMIN && (
                            <Button
                                size="md"
                                onClick={() => setIsCreateModalOpen(true)}
                                leftIcon={Plus}
                                className="rounded-xl px-6 h-11"
                            >
                                New Project
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between px-1 mb-8">
                <div className="w-full md:w-[320px]">
                    <Input
                        placeholder="Search workspace..."
                        leftIcon={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-xl h-11 bg-surface border-glass text-xs"
                    />
                </div>
            </div>

            {/* Content Segment */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 gap-8 px-1">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-96 w-full rounded-[3.15rem] sm:rounded-[4rem]" />
                    ))}
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-10 px-1">
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project) => (
                            <ProjectCard 
                                key={project._id}
                                project={project}
                                user={user}
                                onlineUsers={onlineUsers}
                                toggleGlobalPresence={toggleGlobalPresence}
                                respondMutation={respondMutation}
                                restoreMutation={restoreMutation}
                                purgeMutation={purgeMutation}
                                view={view}
                                EASE={EASE}
                                getStatusStyles={getStatusStyles}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 sm:py-60 text-center bg-white/[0.02] border-dashed border-white/10 rounded-[5rem] sm:rounded-[8rem] px-8">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[3rem] sm:rounded-[4rem] bg-glass border border-glass flex items-center justify-center mb-10 sm:mb-12 shadow-inner">
                        <SearchX className="w-10 h-10 sm:w-14 sm:h-14 text-tertiary/40" />
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-primary tracking-tighter mb-4 leading-none">No Projects Found.</h2>
                    <p className="text-tertiary font-medium text-base sm:text-lg max-w-sm mb-12 sm:mb-16 leading-relaxed opacity-80">
                        This view is currently empty. Create a new project to get started.
                    </p>
                    <Button
                        size="lg"
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={Plus}
                        className="h-16 sm:h-20 px-10 sm:px-12 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-theme/20 text-lg"
                    >
                        Create Project
                    </Button>
                </div>
            )}

            <ProjectCreationModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </div>
    );
};

export default Projects;
