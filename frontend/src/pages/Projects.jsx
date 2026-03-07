import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../store/useAuthStore';
import { Plus, Search, Filter, Folder, Calendar, Users, MoreVertical, Settings, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProjectCreationModal from '../components/ProjectCreationModal';

const Projects = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: projectsRes, isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const res = await api.get('/projects');
            return res.data;
        }
    });

    const projects = projectsRes?.data || [];
    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'Paused': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'Completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'Archived': return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
            default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Projects</h1>
                    <p className="text-zinc-500 mt-1">Manage and track your collective workspace.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-5 h-5" />
                    New Project
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl backdrop-blur-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search projects or categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/5 hover:text-white transition-all">
                        <Filter className="w-4 h-4" />
                        Status
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-sm font-medium hover:bg-white/5 hover:text-white transition-all">
                        Category
                    </button>
                </div>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-3xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
                    ))}
                </div>
            ) : filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredProjects.map((project, index) => (
                            <motion.div
                                key={project._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group relative bg-[#0c0c16]/80 border border-white/[0.06] rounded-3xl p-6 hover:border-violet-500/30 transition-all hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-violet-500/10 overflow-hidden"
                            >
                                {/* Background Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-violet-600/10 transition-colors" />

                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-violet-400 group-hover:bg-violet-500/10 group-hover:text-violet-300 transition-colors">
                                        <Folder className="w-6 h-6" />
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(project.status)}`}>
                                        {project.status || 'Active'}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <h3 className="text-lg font-bold text-white group-hover:text-violet-200 transition-colors line-clamp-1">{project.name}</h3>
                                    <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed h-10">{project.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs">{new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <Users className="w-4 h-4" />
                                        <span className="text-xs">{project.members?.length || 0} members</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-white/[0.04]">
                                    <div className="flex -space-x-2">
                                        {project.members?.slice(0, 3).map((m, i) => (
                                            <div key={i} className="w-7 h-7 rounded-full border-2 border-[#0c0c16] bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                {m.userId?.name?.charAt(0) || '?'}
                                            </div>
                                        ))}
                                        {project.members?.length > 3 && (
                                            <div className="w-7 h-7 rounded-full border-2 border-[#0c0c16] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                                +{project.members.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            to={`/projects/${project._id}/settings`}
                                            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            to={`/tasks?project=${project._id}`}
                                            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-6">
                        <Folder className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">No projects found</h2>
                    <p className="text-zinc-500 max-w-sm mb-8">It looks like you don't have any projects yet. Start by creating a new one to collaborate with your team.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-8 py-3 rounded-2xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all"
                    >
                        Create Your First Project
                    </button>
                </div>
            )}

            <ProjectCreationModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </div>
    );
};

export default Projects;
