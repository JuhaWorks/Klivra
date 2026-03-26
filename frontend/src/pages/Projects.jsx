import React, { useState, useTransition, useMemo, memo } from 'react';
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
import { Link } from 'react-router-dom';
import ProjectCreationModal from '../components/projects/ProjectCreationModal';
import ProjectImage from '../components/projects/ProjectImage';
import DeadlinePopup from '../components/projects/DeadlinePopup';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import GlassSurface from '../components/ui/GlassSurface';
import { Skeleton } from '../components/ui/Loading';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


const Projects = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState('active');
    const [isPending, startTransition] = useTransition();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: activeRes, isLoading: loadingActive } = useQuery({
        queryKey: ['projects', 'active'],
        queryFn: async () => (await api.get('/projects')).data
    });

    const { data: archivedRes, isLoading: loadingArchived } = useQuery({
        queryKey: ['projects', 'archived'],
        queryFn: async () => (await api.get('/projects?archived=true')).data
    });

    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            await api.post(`/projects/${id}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project restored to active list.');
        },
        onError: () => toast.error('Restoration failed.')
    });

    const activeProjects = activeRes?.data || [];
    const archivedProjects = archivedRes?.data || [];

    const currentList = view === 'active' ? activeProjects : archivedProjects;
    const isLoading = view === 'active' ? loadingActive : loadingArchived;

    const filteredProjects = currentList.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusStyles = (status) => {
        switch (status) {
            case 'Active': return 'text-accent bg-accent/10 border-accent';
            case 'Paused': return 'text-warning bg-warning/10 border-warning/20';
            case 'Completed': return 'text-success bg-success/10 border-success/20';
            case 'Archived': return 'text-tertiary bg-sunken border-default';
            default: return 'text-tertiary bg-sunken border-default';
        }
    };

    return (
        <div className="w-full space-y-12 pb-20">
            <DeadlinePopup projects={activeProjects} user={user} />
            {/* Header Area */}
            <header className="relative -mx-6 lg:-mx-12 px-6 lg:px-12 pt-4 pb-12 overflow-hidden border-b border-default mb-10">
                <div className="absolute inset-0 z-0">
                    <GlassSurface width="100%" height="100%" borderRadius={0} displace={0.5} distortionScale={-40} backgroundOpacity={0.06} opacity={0.93} />
                </div>
                
                <div className="absolute -top-10 left-0 w-64 h-64 bg-theme/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-theme font-black text-[10px] uppercase tracking-[0.4em]">
                            <LayoutGrid className="w-3 h-3" />
                            <span>Project Management</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-primary tracking-tighter">Projects</h1>
                        <p className="text-secondary font-medium text-lg max-w-xl leading-relaxed">
                            Manage and collaborate on team projects efficiently in a centralized workspace.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Segmented Control */}
                        <div className="flex p-1.5 glass-2 bg-sunken/50 border-subtle rounded-2xl">
                            {[
                                { id: 'active', label: 'Active', count: activeProjects.length, icon: Box },
                                { id: 'archived', label: 'Archived', count: archivedProjects.length, icon: Trash2 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => startTransition(() => setView(tab.id))}
                                    className={twMerge(clsx(
                                        "flex items-center gap-3 px-6 py-2.5 rounded-xl text-xs font-black transition-all relative overflow-hidden",
                                        view === tab.id ? "text-theme" : "text-tertiary hover:text-secondary"
                                    ))}
                                >
                                    {view === tab.id && (
                                        <motion.div 
                                            layoutId="project-tab"
                                            className="absolute inset-0 bg-surface border border-subtle rounded-xl"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <tab.icon className="w-3.5 h-3.5 relative z-10" />
                                    <span className="relative z-10">{tab.label}</span>
                                    <span className={twMerge(clsx(
                                        "relative z-10 px-1.5 py-0.5 rounded-md text-[9px]",
                                        view === tab.id ? "bg-theme-muted text-theme" : "bg-sunken text-tertiary"
                                    ))}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {user?.role !== 'Admin' && (
                            <Button
                                size="lg"
                                onClick={() => setIsCreateModalOpen(true)}
                                leftIcon={Plus}
                            >
                                New Project
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="w-full md:w-[450px]">
                    <Input
                        placeholder="Search projects..."
                        leftIcon={Search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-3xl"
                    />
                </div>
            </div>

            {/* Content Segment */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-80 w-full rounded-[3.15rem]" />
                    ))}
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project) => (
                            <Card 
                                key={project._id} 
                                className="group h-full flex flex-col"
                                padding="p-0"
                            >
                                <div className="p-4 flex flex-col h-full">
                                    <div className="relative mb-6">
                                        <ProjectImage
                                            project={project}
                                            className="rounded-3xl border border-subtle"
                                        />
                                        <div className="absolute top-4 right-4">
                                            <div className={twMerge(clsx(
                                                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border backdrop-blur-md shadow-xl transition-all group-hover:scale-105",
                                                getStatusStyles(project.status)
                                            ))}>
                                                {project.status || 'Active'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-4 space-y-4 mb-8">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-primary tracking-tighter group-hover:text-theme transition-colors line-clamp-1">
                                                {project.name}
                                            </h3>
                                            <p className="text-tertiary text-xs font-medium line-clamp-2 leading-relaxed min-h-[32px]">
                                                {project.description}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 pt-2">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-tertiary uppercase tracking-widest block">Deadline</span>
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Calendar className="w-3.5 h-3.5 text-theme-lt" />
                                                    <span className="text-xs font-bold">
                                                        {new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-tertiary uppercase tracking-widest block">Team Members</span>
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Users className="w-3.5 h-3.5 text-theme-lt" />
                                                    <span className="text-xs font-bold">{project.members?.length || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto px-4 py-6 border-t border-subtle flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            {project.members?.slice(0, 4).map((m, i) => (
                                                <div key={i} className="w-8 h-8 rounded-xl border-2 border-base bg-sunken flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                                                    {m.userId?.avatar ? (
                                                        <img src={m.userId.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-black text-gray-600">{m.userId?.name?.charAt(0)}</span>
                                                    )}
                                                </div>
                                            ))}
                                            {project.members?.length > 4 && (
                                                <div className="w-8 h-8 rounded-xl border-2 border-base bg-sunken flex items-center justify-center text-[9px] font-black text-tertiary">
                                                    +{project.members.length - 4}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {project.status === 'Archived' ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => restoreMutation.mutate(project._id)}
                                                    leftIcon={RefreshCw}
                                                >
                                                    Restore
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        as={Link}
                                                        to={`/projects/${project._id}/settings`}
                                                        className="px-3"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        as={Link}
                                                        to={`/tasks?project=${project._id}`}
                                                        rightIcon={ChevronRight}
                                                    >
                                                        Enter
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-40 text-center glass-2 border-dashed border-subtle rounded-[5rem]">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-sunken border border-subtle flex items-center justify-center mb-8">
                        <SearchX className="w-10 h-10 text-tertiary" />
                    </div>
                    <h2 className="text-4xl font-black text-primary tracking-tighter mb-3">No Projects Found</h2>
                    <p className="text-gray-500 font-medium max-w-sm mb-12 leading-relaxed">
                        This view is currently empty. Create a new project to get started.
                    </p>
                    <Button
                        size="lg"
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={Plus}
                    >
                        New Project
                    </Button>
                </div>
            )}

            <ProjectCreationModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </div>
    );
};

export default Projects;
