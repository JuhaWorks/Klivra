import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, api } from '../store/useAuthStore';
import { Plus, Search, Folder, Calendar, Users, Settings, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProjectCreationModal from '../components/projects/ProjectCreationModal';
import ProjectImage from '../components/projects/ProjectImage';
import { toast } from 'react-hot-toast';

const Projects = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState('active');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Active projects (not deleted)
    const { data: activeRes, isLoading: loadingActive } = useQuery({
        queryKey: ['projects', 'active'],
        queryFn: async () => {
            const res = await api.get('/projects');
            return res.data;
        }
    });

    // Archived / Trash projects (soft-deleted)
    const { data: archivedRes, isLoading: loadingArchived } = useQuery({
        queryKey: ['projects', 'archived'],
        queryFn: async () => {
            const res = await api.get('/projects?archived=true');
            return res.data;
        }
    });

    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            await api.post(`/projects/${id}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
            toast.success('Project restored 🚀');
        },
        onError: () => toast.error('Failed to restore project.')
    });

    const activeProjects = activeRes?.data || [];
    const archivedProjects = archivedRes?.data || [];

    // The current list shown depends on the active tab
    const currentList = view === 'active' ? activeProjects : archivedProjects;
    const isLoading = view === 'active' ? loadingActive : loadingArchived;

    const filteredProjects = currentList.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'Paused': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'Completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'Archived': return 'text-[var(--text-muted)] bg-[var(--border-subtle)] border-[var(--border-subtle)]';
            default: return 'text-[var(--text-muted)] bg-[var(--border-subtle)] border-[var(--border-subtle)]';
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-10 pb-32">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Folder className="w-8 h-8 text-emerald-500" />
                        <h1 className="text-5xl font-black text-[var(--text-main)] tracking-tighter">Workspace</h1>
                    </div>
                    <p className="text-[var(--text-muted)] font-bold ml-1 tracking-tight">Manage and track your collective intellectual property.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Segmented Control */}
                    <div className="flex p-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl">
                        {[
                            { id: 'active', label: 'Active', count: activeProjects.length },
                            { id: 'archived', label: 'Trash', count: archivedProjects.length, icon: Trash2 }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setView(tab.id)}
                                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${view === tab.id
                                    ? 'bg-[var(--text-main)]/10 text-[var(--text-main)] shadow-xl'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                }`}
                            >
                                {tab.label}
                                <span className={`px-2 py-0.5 rounded-md text-[9px] ${view === tab.id
                                    ? 'bg-[var(--text-main)]/15 text-[var(--text-main)]'
                                    : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
                                }`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    {user?.role !== 'Admin' && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_10px_30px_rgba(45,179,138,0.25)]"
                        >
                            <Plus className="w-5 h-5" />
                            New Project
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="relative w-full md:w-[400px] group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search workspace index..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl pl-14 pr-6 py-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--theme-500),0.3)] focus:border-[rgba(var(--theme-500),0.4)] transition-all font-bold"
                    />
                </div>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-72 rounded-[40px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] animate-pulse" />
                    ))}
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredProjects.map((project, index) => (
                            <motion.div
                                key={project._id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                                className="group relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[40px] p-8 hover:border-emerald-500/30 transition-all hover:shadow-lg shadow-sm overflow-hidden"
                            >
                                <div className="relative -mx-8 -mt-8 mb-8">
                                    <ProjectImage
                                        project={project}
                                        className="rounded-t-[40px] border-b border-[var(--border-subtle)]"
                                    />
                                    <div className="absolute top-6 right-6">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${getStatusColor(project.status)}`}>
                                            {project.status || 'Active'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-8">
                                    <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tighter group-hover:text-emerald-500 transition-colors line-clamp-1">{project.name}</h3>
                                    <p className="text-[var(--text-muted)] text-sm font-medium line-clamp-2 leading-relaxed h-10">{project.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Deadline</span>
                                        <div className="flex items-center gap-2 text-[var(--text-main)]">
                                            <Calendar className="w-4 h-4 text-emerald-500/60" />
                                            <span className="text-xs font-bold">{new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Team</span>
                                        <div className="flex items-center gap-2 text-[var(--text-main)]">
                                            <Users className="w-4 h-4 text-emerald-500/60" />
                                            <span className="text-xs font-bold">{project.members?.length || 0} members</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-8 border-t border-[var(--border-subtle)]">
                                    <div className="flex -space-x-3">
                                        {project.members?.slice(0, 3).map((m, i) => (
                                            <div key={i} className="w-9 h-9 rounded-2xl border-2 border-[var(--bg-surface)] bg-[var(--bg-base)] flex items-center justify-center overflow-hidden">
                                                {m.userId?.avatar ? (
                                                    <img src={m.userId.avatar} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-[var(--text-muted)]">{m.userId?.name?.charAt(0)}</span>
                                                )}
                                            </div>
                                        ))}
                                        {project.members?.length > 3 && (
                                            <div className="w-9 h-9 rounded-2xl border-2 border-[var(--bg-surface)] bg-[var(--bg-base)] flex items-center justify-center text-[10px] font-black text-[var(--text-muted)]">
                                                +{project.members.length - 3}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {project.status === 'Archived' ? (
                                            <button
                                                onClick={() => restoreMutation.mutate(project._id)}
                                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-400 transition-all active:scale-90"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Restore
                                            </button>
                                        ) : (
                                            <>
                                                <Link
                                                    to={`/projects/${project._id}/settings`}
                                                    className="p-3 bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] transition-all active:scale-90"
                                                >
                                                    <Settings className="w-5 h-5" />
                                                </Link>
                                                <Link
                                                    to={`/tasks?project=${project._id}`}
                                                    className="p-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-2xl border border-emerald-500/20 transition-all active:scale-90"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-subtle)] rounded-[60px]">
                    <div className="w-24 h-24 rounded-[40px] bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center mb-8">
                        <Folder className="w-10 h-10 text-[var(--text-muted)]" />
                    </div>
                    <h2 className="text-3xl font-black text-[var(--text-main)] mb-3">Workspace Empty</h2>
                    <p className="text-[var(--text-muted)] font-medium max-w-sm mb-10 leading-relaxed">No projects found. Create your first project to get started.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-10 py-4 rounded-2xl bg-emerald-500 text-white font-black hover:bg-emerald-400 transition-all shadow-[0_10px_30px_rgba(45,179,138,0.2)]"
                    >
                        Create New Project
                    </button>
                </div>
            )}

            <ProjectCreationModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </div>
    );
};

export default Projects;
