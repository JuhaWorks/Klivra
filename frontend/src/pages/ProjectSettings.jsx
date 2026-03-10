import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, useAuthStore } from '../store/useAuthStore';
import {
    Settings,
    Trash2,
    AlertTriangle,
    History,
    User as UserIcon,
    Calendar,
    ArrowLeft,
    Loader2,
    Save,
    Layout
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const projectSchema = z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters').max(100),
    description: z.string().min(10, 'Description must be at least 10 characters').max(500),
    category: z.string().min(2, 'Please select or enter a category'),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid start date' }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid end date' }),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
});

const ProjectSettings = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    const [confirmName, setConfirmName] = useState('');

    // Fetch Project Details
    const { data: projectResponse, isLoading: projectLoading } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const res = await api.get(`/projects/${id}`);
            return res.data;
        }
    });

    const project = projectResponse?.data;

    // React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors, isDirty, isValid },
        reset
    } = useForm({
        resolver: zodResolver(projectSchema),
        mode: 'onChange'
    });

    useEffect(() => {
        if (project) {
            reset({
                name: project.name,
                description: project.description,
                category: project.category,
                startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
                endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''
            });
        }
    }, [project, reset]);

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.put(`/projects/${id}`, data);
            return res.data;
        },
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['project', id] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['projectActivity', id] });
            toast.success('Project details updated 🛠️');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to update project');
        }
    });

    // Fetch Activity Logs
    const { data: activityResponse, isLoading: activityLoading } = useQuery({
        queryKey: ['projectActivity', id],
        queryFn: async () => {
            const res = await api.get(`/projects/${id}/activity`);
            return res.data;
        }
    });

    const activities = activityResponse?.data || [];

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/projects/${id}`);
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['projects'] });
            const previousProjects = queryClient.getQueryData(['projects']);
            queryClient.setQueryData(['projects'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    data: old.data.filter(p => p._id !== id)
                };
            });
            return { previousProjects };
        },
        onSuccess: () => {
            toast.success('Project soft-deleted successfully');
            navigate('/projects');
        },
        onError: (err, variables, context) => {
            if (context?.previousProjects) {
                queryClient.setQueryData(['projects'], context.previousProjects);
            }
            toast.error(err.response?.data?.message || 'Failed to delete project');
        }
    });

    const isAuthorizedToEdit = project?.members.some(
        m => m.userId?._id === currentUser?._id && (m.role === 'Manager' || m.role === 'Editor')
    ) || currentUser?.role === 'Admin';

    const isManager = project?.members.some(
        m => m.userId?._id === currentUser?._id && m.role === 'Manager'
    ) || currentUser?.role === 'Admin';

    if (projectLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
    );

    if (!project) return (
        <div className="p-8 text-center bg-zinc-950 border border-white/5 rounded-3xl mx-8">
            <p className="text-zinc-400">Project not found or you don't have access.</p>
        </div>
    );

    const onSubmit = (data) => {
        updateMutation.mutate(data);
    };

    return (
        <div className="p-5 sm:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/projects')}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Settings className="w-6 h-6 text-emerald-500" />
                        Project Settings
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Manage {project.name}’s configuration and audit trail.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">

                    {/* General Settings Form */}
                    <section className="bg-zinc-950 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layout className="w-5 h-5 text-emerald-400" />
                                <h2 className="font-bold text-white">General Information</h2>
                            </div>
                            {!isAuthorizedToEdit && (
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">Read Only</span>
                            )}
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-500 uppercase ml-1">Project Name</label>
                                        <input
                                            {...register('name')}
                                            disabled={!isAuthorizedToEdit || updateMutation.isPending}
                                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-all font-medium"
                                        />
                                        {errors.name && <p className="text-xs text-red-400 ml-1">{errors.name.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-zinc-500 uppercase ml-1">Description</label>
                                        <textarea
                                            {...register('description')}
                                            rows={3}
                                            disabled={!isAuthorizedToEdit || updateMutation.isPending}
                                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-all resize-none font-medium text-sm leading-relaxed"
                                        />
                                        {errors.description && <p className="text-xs text-red-400 ml-1">{errors.description.message}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-zinc-500 uppercase ml-1">Category</label>
                                            <select
                                                {...register('category')}
                                                disabled={!isAuthorizedToEdit || updateMutation.isPending}
                                                className="w-full bg-[#0c0c16] border border-white/[0.08] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-all appearance-none cursor-pointer"
                                            >
                                                {['Development', 'Design', 'Marketing', 'Research', 'Internal', 'Client'].map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            {errors.category && <p className="text-xs text-red-400 ml-1">{errors.category.message}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-zinc-500 uppercase ml-1">Start Date</label>
                                            <input
                                                type="date"
                                                {...register('startDate')}
                                                disabled={!isAuthorizedToEdit || updateMutation.isPending}
                                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-all [color-scheme:dark]"
                                            />
                                            {errors.startDate && <p className="text-xs text-red-400 ml-1">{errors.startDate.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-zinc-500 uppercase ml-1">End Date</label>
                                            <input
                                                type="date"
                                                {...register('endDate')}
                                                disabled={!isAuthorizedToEdit || updateMutation.isPending}
                                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50 transition-all [color-scheme:dark]"
                                            />
                                            {errors.endDate && <p className="text-xs text-red-400 ml-1">{errors.endDate.message}</p>}
                                        </div>
                                    </div>
                                </div>

                                {isAuthorizedToEdit && (
                                    <div className="pt-4 border-t border-white/5 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={!isDirty || !isValid || updateMutation.isPending}
                                            className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                                        >
                                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Changes
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    </section>

                    {/* Activity Timeline */}
                    <section className="bg-zinc-950 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex items-center gap-2">
                            <History className="w-5 h-5 text-emerald-400" />
                            <h2 className="font-bold text-white">Activity Timeline</h2>
                        </div>
                        <div className="p-6 relative">
                            {/* Line */}
                            <div className="absolute left-10 top-8 bottom-8 w-px bg-zinc-800" />

                            <div className="space-y-8 relative">
                                {activityLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-zinc-600" /></div>
                                ) : activities.length === 0 ? (
                                    <p className="text-zinc-500 text-center py-8 text-sm italic">No activity recorded yet.</p>
                                ) : (
                                    activities.map((a, i) => (
                                        <div key={a._id} className="flex gap-4 group">
                                            <div className="relative z-10">
                                                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                                                    {a.actorId?.avatar ? (
                                                        <img src={a.actorId.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-4 h-4 text-zinc-500" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm text-zinc-300">
                                                    <span className="font-bold text-white">{a.actorId?.name || 'Unknown'}</span>
                                                    {' '}
                                                    <span className="text-zinc-500">{a.action.replace(/_/g, ' ').toLowerCase()}</span>
                                                </p>
                                                {/* Meta Preview */}
                                                {a.metadata?.name && <p className="text-xs text-zinc-500 italic">"{a.metadata.name}"</p>}
                                                <p className="text-[11px] text-zinc-600 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(a.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-8">
                    {/* Info Card */}
                    <div className="bg-zinc-950 border border-white/5 rounded-3xl p-6 space-y-4 shadow-2xl">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Workspace Insight</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Category</span>
                                <span className="text-zinc-200 bg-white/5 px-3 py-1 rounded-full text-xs border border-white/5">{project.category}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Members</span>
                                <span className="text-zinc-200 font-medium">{project.members.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Starts</span>
                                <span className="text-zinc-200">{new Date(project.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-500">Ends</span>
                                <span className="text-zinc-200">{new Date(project.endDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    {isManager && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-2 text-red-400">
                                <AlertTriangle className="w-5 h-5" />
                                <h3 className="font-bold">Danger Zone</h3>
                            </div>
                            <p className="text-xs text-red-500/70 leading-relaxed">
                                Soft-deleting this project will hide it from everyone. This action can be undone by an administrator.
                            </p>

                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-red-500/50 uppercase ml-1">Type project name to confirm</label>
                                <input
                                    value={confirmName}
                                    onChange={(e) => setConfirmName(e.target.value)}
                                    placeholder={project.name}
                                    className="w-full bg-red-500/5 border border-red-500/20 rounded-2xl px-4 py-2.5 text-sm text-red-200 placeholder:text-red-900 focus:outline-none focus:ring-1 focus:ring-red-500/40 transition-all"
                                />
                                <button
                                    onClick={() => deleteMutation.mutate()}
                                    disabled={confirmName !== project.name || deleteMutation.isPending}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
                                >
                                    {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Archive Project
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectSettings;
