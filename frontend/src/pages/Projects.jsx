import React, { useState, useTransition, useMemo, memo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, api } from '../store/useAuthStore';
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
    SearchX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import ProjectCreationModal from '../components/projects/ProjectCreationModal';
import { ProjectImage, DeadlinePopup } from '../components/projects/ProjectShared';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import GlassSurface from '../components/ui/GlassSurface';
import { Skeleton } from '../components/ui/PremiumLoaders';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


const Projects = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState('active');
    const [isPending, startTransition] = useTransition();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();

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
            case 'Active': return 'text-accent bg-accent/10 border-accent';
            case 'Paused': return 'text-warning bg-warning/10 border-warning/20';
            case 'Completed': return 'text-success bg-success/10 border-success/20';
            case 'Archived': return 'text-tertiary bg-glass-heavy border-glass';
            default: return 'text-tertiary bg-glass-heavy border-glass';
        }
    };

    return (
        <div className="w-full space-y-8 sm:space-y-12 pb-20 max-w-[2000px] mx-auto overflow-x-hidden">
            <DeadlinePopup projects={activeProjects} user={user} />
            {/* Header Area */}
            <header className="relative -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-10 sm:pb-16 overflow-hidden border-b border-default rounded-b-[2.5rem] sm:rounded-b-[5rem] mb-8 sm:mb-12">
                <div className="absolute inset-0 z-0">
                    <GlassSurface width="100%" height="100%" borderRadius={0} displace={0.5} distortionScale={-40} backgroundOpacity={0.06} opacity={0.93} blur={30} />
                </div>
                
                <div className="absolute -top-10 left-0 w-64 h-64 bg-theme/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-10">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-3 text-theme font-black text-[9px] sm:text-[10px] uppercase tracking-[0.4em]">
                            <LayoutGrid className="w-3.5 h-3.5 text-theme/60" />
                            <span>Project Workspace</span>
                        </div>
                        <h1 className="text-4xl sm:text-7xl font-black text-primary tracking-tighter leading-[0.9]">Projects</h1>
                        <p className="text-secondary font-medium text-sm sm:text-xl max-w-xl leading-relaxed opacity-80">
                            Collaborate and manage project tasks within a professional shared workspace.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        {/* Segmented Control */}
                        <div className="flex p-1.5 glass-2 bg-sunken border-glass rounded-[1.75rem] sm:rounded-[2rem] overflow-x-auto no-scrollbar max-w-full">
                            {[
                                { id: 'active', label: 'Active', count: activeProjects.length || 0, icon: Box },
                                { id: 'archived', label: 'Archived', count: archivedProjects.length || 0, icon: Trash2 },
                                { id: 'invitations', label: 'Invites', count: invitedProjects.length || 0, icon: Target }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => startTransition(() => setView(tab.id))}
                                    className={twMerge(clsx(
                                        "flex items-center gap-2 sm:gap-3 px-3.5 sm:px-6 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all relative overflow-hidden shrink-0",
                                        view === tab.id ? "text-theme" : "text-tertiary hover:text-secondary"
                                    ))}
                                >
                                    {view === tab.id && (
                                        <motion.div 
                                            layoutId="project-tab"
                                            className="absolute inset-0 bg-surface border border-glass rounded-2xl shadow-glass"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
                                    <span className="relative z-10 uppercase tracking-widest">{tab.label}</span>
                                    <span className={twMerge(clsx(
                                        "relative z-10 px-1.5 py-0.5 rounded-lg text-[9px] font-mono",
                                        view === tab.id ? "bg-theme/10 text-theme" : "bg-glass text-tertiary"
                                    ))}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {user?.role !== 'Admin' && (
                            <Button
                                size="lg"
                                onClick={() => setIsCreateModalOpen(true)}
                                leftIcon={Plus}
                                className="h-14 sm:h-16 px-6 sm:px-8 rounded-2xl sm:rounded-[2rem] shadow-theme-slight w-full sm:w-auto"
                            >
                                New Project
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between px-1">
                <div className="w-full md:w-[450px]">
                    <Input
                        placeholder="Search project archives..."
                        leftIcon={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-2xl sm:rounded-[2.5rem] h-12 sm:h-14 bg-surface border-glass"
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 gap-8 px-1">
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project) => {
                            const isOwner = (project.createdBy ? project.createdBy === user?._id : (project.members?.[0]?.userId?._id === user?._id || project.members?.[0]?.userId === user?._id)) || user?.role === 'Admin';
                            
                            return (
                                <Card 
                                    key={project._id} 
                                    className="group h-full flex flex-col rounded-[2.5rem] sm:rounded-[3.15rem] overflow-hidden border-glass hover:border-theme/30 transition-all duration-500"
                                    padding="p-0"
                                >

                                <div className="p-1.5 flex flex-col h-full">
                                    <div className="relative mb-4 sm:mb-8">
                                        <ProjectImage
                                            project={project}
                                            className="rounded-[2rem] sm:rounded-[2.5rem] border border-glass aspect-video object-cover"
                                        />
                                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                                            <div className={twMerge(clsx(
                                                "px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] border backdrop-blur-xl shadow-2xl transition-all group-hover:scale-105",
                                                getStatusStyles(project.status)
                                            ))}>
                                                {project.status || 'Active'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-3 sm:px-6 space-y-4 mb-6 sm:mb-8">
                                        <div className="space-y-1.5">
                                            <h3 className="text-xl sm:text-3xl font-black text-primary tracking-tighter group-hover:text-theme transition-colors line-clamp-1">
                                                {project.name}
                                            </h3>
                                            <p className="text-tertiary text-[11px] sm:text-sm font-medium line-clamp-2 leading-relaxed min-h-[36px] sm:min-h-[40px] opacity-80">
                                                {project.description}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 sm:gap-8 pt-4 border-t border-glass">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block opacity-60">Deadline</span>
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Calendar className="w-3.5 h-3.5 text-theme/60" />
                                                    <span className="text-[11px] sm:text-sm font-bold font-mono">
                                                        {new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block opacity-60">Team Members</span>
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Users className="w-3.5 h-3.5 text-theme/60" />
                                                    <span className="text-[11px] sm:text-sm font-bold font-mono truncate">{(project.members?.length || 0)} MEMBERS</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto px-4 sm:px-8 py-4 sm:py-8 border-t border-glass bg-glass-heavy flex items-center justify-between gap-4">
                                        <div className="flex -space-x-2.5">
                                            {project.members?.slice(0, 4).map((m, i) => (
                                                <div key={i} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-base bg-glass flex items-center justify-center overflow-hidden transition-all group-hover:scale-110 hover:z-10 shadow-lg">
                                                    {m.userId?.avatar ? (
                                                        <img src={m.userId.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] sm:text-xs font-black text-gray-400">{m.userId?.name?.charAt(0)}</span>
                                                    )}
                                                </div>
                                            ))}
                                            {project.members?.length > 4 && (
                                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-base bg-sunken flex items-center justify-center text-[10px] font-black text-tertiary shadow-lg">
                                                    +{project.members.length - 4}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {view === 'invitations' ? (
                                                <>
                                                    <button onClick={() => respondMutation.mutate({ id: project._id, status: 'rejected' })} disabled={respondMutation.isPending} className="text-[10px] font-black uppercase tracking-widest text-secondary hover:text-danger transition-colors">
                                                        Decline
                                                    </button>
                                                    <Button size="md" onClick={() => respondMutation.mutate({ id: project._id, status: 'active' })} rightIcon={ChevronRight} disabled={respondMutation.isPending} className="rounded-xl">
                                                        Accept
                                                    </Button>
                                                </>
                                            ) : project.status === 'Archived' ? (
                                                <div className="flex items-center gap-3">
                                                    {isOwner && (
                                                        <>
                                                            <Button
                                                                size="md"
                                                                variant="danger"
                                                                onClick={() => {
                                                                    if (window.confirm('IRREVERSIBLE: Are you absolutely sure you want to permanently delete this project and all its data?')) {
                                                                        purgeMutation.mutate(project._id);
                                                                    }
                                                                }}
                                                                leftIcon={Trash2}
                                                                isLoading={purgeMutation.isPending}
                                                                className="w-10 h-10 p-0 flex items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border-rose-500/20"
                                                            />
                                                            <Button
                                                                size="md"
                                                                variant="secondary"
                                                                onClick={() => restoreMutation.mutate(project._id)}
                                                                leftIcon={RefreshCw}
                                                                isLoading={restoreMutation.isPending}
                                                                className="rounded-xl"
                                                            >
                                                                Restore
                                                            </Button>
                                                        </>
                                                    )}
                                                    {!isOwner && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-tertiary/50 italic px-4 py-2 bg-glass rounded-lg border border-glass">
                                                            Archived (ReadOnly)
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="md"
                                                        as={Link}
                                                        to={`/projects/${project._id}/settings`}
                                                        className="w-10 sm:w-12 h-10 sm:h-12 p-0 flex items-center justify-center rounded-xl"
                                                    >
                                                        <Settings className="w-5 h-5" />
                                                    </Button>
                                                    <Button
                                                        size="md"
                                                        as={Link}
                                                        to={`/tasks?project=${project._id}`}
                                                        rightIcon={ChevronRight}
                                                        className="px-6 rounded-xl"
                                                    >
                                                        Enter
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );})}

                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 sm:py-60 text-center glass-2 border-dashed border-glass rounded-[5rem] sm:rounded-[8rem] px-8">
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
