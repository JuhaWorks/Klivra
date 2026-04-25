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
    Users2,
    Pin
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
const ProjectCard = memo(({ project, user, onlineUsers, toggleGlobalPresence, respondMutation, restoreMutation, purgeMutation, togglePinMutation, view, EASE, getStatusStyles }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={EASE} className="group relative flex flex-col h-full rounded-[2rem] hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all p-2">
        <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-[1.5rem] border border-white/5">
            <ProjectImage project={project} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
            <div className="absolute top-3 left-3">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinMutation.mutate(project._id); }} className={twMerge("p-2 rounded-xl backdrop-blur-md border transition-all", project.isPinned ? "bg-theme/20 border-theme/30 text-theme" : "bg-white/5 border-white/10 text-tertiary")}>
                    <Pin className={twMerge("w-3.5 h-3.5", project.isPinned && "fill-current")} />
                </button>
            </div>
            <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                <div className={twMerge("px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all", getStatusStyles(project.status))}>{project.status || 'Active'}</div>
                {user?.interfacePrefs?.showGlobalPresence !== false && onlineUsers.filter(u => project.members?.some(m => (m.userId?._id || m.userId) === u.userId)).length > 0 && (
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGlobalPresence(true, project._id); }} className="flex items-center gap-1.5 px-2 py-1 bg-success/20 border border-success/30 rounded-lg"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /><span className="text-[8px] font-black text-success uppercase tracking-widest">Live</span></button>
                )}
            </div>
        </div>
        <div className="px-2 pb-4 flex-1 flex flex-col space-y-4">
            <div>
                <h3 className="text-lg font-bold text-primary group-hover:text-theme transition-colors">{project.name}</h3>
                <p className="text-tertiary text-[11px] line-clamp-2 opacity-40">{project.description}</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 opacity-40"><Calendar className="w-3 h-3" /><span className="text-[10px] font-mono">{new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div>
                </div>
                <div className="flex items-center gap-2">
                    {view === 'invitations' ? (
                        <>
                            <button onClick={() => respondMutation.mutate({ id: project._id, status: 'rejected' })} className="text-[10px] font-black uppercase text-tertiary">Decline</button>
                            <button onClick={() => respondMutation.mutate({ id: project._id, status: 'active' })} className="text-[10px] font-black uppercase text-theme px-3 py-1 bg-theme/10 rounded-md">Accept</button>
                        </>
                    ) : view === 'archived' ? (
                        <>
                            <button onClick={() => purgeMutation.mutate(project._id)} className="text-[10px] font-black uppercase text-tertiary">Delete</button>
                            <button onClick={() => restoreMutation.mutate(project._id)} className="text-[10px] font-black uppercase text-success px-3 py-1 bg-success/10 rounded-md">Restore</button>
                        </>
                    ) : (
                        <>
                            <Link to={`/projects/${project._id}/settings`} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-tertiary"><Settings className="w-3.5 h-3.5" /></Link>
                            <Link to={`/tasks?project=${project._id}`} className="flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black bg-theme/10 text-theme uppercase">Enter <ChevronRight className="w-3 h-3" /></Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    </motion.div>
));

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

    const togglePinMutation = useMutation({
        mutationFn: async (id) => {
            await api.post(`/projects/${id}/toggle-pin`);
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            // Optimization: We could manually update the cache here for snappier UI
        },
        onError: () => toast.error('Failed to update pin status.')
    });

    const activeProjects = activeRes?.data || [];
    const archivedProjects = archivedRes?.data || [];
    const invitedProjects = invitesRes?.data || [];

    const currentList = useMemo(() => {
        const list = view === 'active' ? activeProjects : (view === 'archived' ? archivedProjects : invitedProjects);
        if (view === 'active') return [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        return list;
    }, [view, activeProjects, archivedProjects, invitedProjects]);

    const isLoading = view === 'active' ? loadingActive : (view === 'archived' ? loadingArchived : loadingInvites);

    const filteredProjects = currentList.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pinnedProjects = filteredProjects.filter(p => p.isPinned);
    const otherProjects = filteredProjects.filter(p => !p.isPinned);

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

                        <Button
                            size="md"
                            onClick={() => setIsCreateModalOpen(true)}
                            leftIcon={Plus}
                            className="rounded-xl px-6 h-11"
                        >
                            New Project
                        </Button>
                    </div>
                </div>
            </header>

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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-8 px-1">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-full rounded-[4rem]" />)}
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="space-y-16">
                    <AnimatePresence mode="popLayout">
                        {[
                            { title: 'Pinned Projects', icon: Pin, list: pinnedProjects, color: 'text-theme' },
                            { title: 'All Projects', list: otherProjects, color: 'text-tertiary' }
                        ].map(section => section.list.length > 0 && (
                            <section key={section.title} className="space-y-8">
                                <div className="flex items-center gap-3 px-1">
                                    {section.icon && <section.icon className={`w-4 h-4 ${section.color} fill-current`} />}
                                    <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${section.color}`}>{section.title}</h2>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-10 px-1">
                                    {section.list.map(p => (
                                        <ProjectCard key={p._id} project={p} user={user} onlineUsers={onlineUsers} toggleGlobalPresence={toggleGlobalPresence} respondMutation={respondMutation} restoreMutation={restoreMutation} purgeMutation={purgeMutation} togglePinMutation={togglePinMutation} view={view} EASE={EASE} getStatusStyles={getStatusStyles} />
                                    ))}
                                </div>
                            </section>
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
