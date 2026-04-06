import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../api/projectApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Button from '../ui/Button';

const DangerZoneTab = ({ project }) => {
    const [confirmName, setConfirmName] = useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const archiveMutation = useMutation({
        mutationFn: () => projectService.deleteProject(project._id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
            toast.success('Project moved to Trash.');
            navigate('/projects');
        },
        onError: () => toast.error('Failed to archive project. Please try again.')
    });

    return (
        <div className="space-y-10">
            {/* Header */}
            <header className="pb-2">
                <div className="flex items-center gap-2 text-red-500 font-semibold text-[10px] uppercase tracking-[0.35em] mb-3">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Critical Operations</span>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tighter">Project Deletion</h2>
                <p className="text-gray-500 text-sm mt-2 max-w-lg leading-relaxed">
                    The following actions are permanent and cannot be undone. Please proceed with caution.
                </p>
            </header>

            {/* Archive Card */}
            <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl"
            >
                {/* Background icon */}
                <div className="absolute top-[-15%] right-[-8%] opacity-[0.04] pointer-events-none">
                    <AlertTriangle className="w-80 h-80 text-red-500" />
                </div>

                <div className="relative z-10 max-w-2xl space-y-8">
                    {/* Title row */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Archive Project</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/50 mt-0.5">
                                Requires Manager permission or above
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-red-400/80 leading-relaxed">
                        Archiving this project moves it to the{' '}
                        <span className="text-red-400 font-semibold">Trash</span>. The project will become{' '}
                        <span className="underline decoration-red-500/40">read-only</span> for all members.
                        All data and history will be preserved and can be recovered from Trash.
                    </p>

                    {/* Confirmation input */}
                    <div className="bg-black/20 border border-red-500/10 rounded-[1.75rem] p-8 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-red-500/40 uppercase tracking-[0.2em] ml-1 block">
                                Type the project name to confirm
                            </label>
                            <input
                                value={confirmName}
                                onChange={(e) => setConfirmName(e.target.value)}
                                placeholder={`"${project.name}"`}
                                className="w-full bg-red-500/5 border border-red-500/10 rounded-2xl px-6 py-4 text-red-100 placeholder:text-red-900/60 focus:outline-none focus:border-red-500/40 focus:ring-4 focus:ring-red-500/5 transition-all font-semibold text-sm"
                            />
                        </div>

                        <Button
                            variant="primary"
                            onClick={() => archiveMutation.mutate()}
                            disabled={confirmName !== project.name || archiveMutation.isPending}
                            isLoading={archiveMutation.isPending}
                            leftIcon={Trash2}
                            className="w-full py-5 bg-red-600 hover:bg-red-500 border-red-500/20 shadow-[0_16px_40px_rgba(220,38,38,0.25)] text-sm font-bold tracking-wide"
                        >
                            Archive Project
                        </Button>
                    </div>
                </div>
            </motion.section>

            {/* Permanent deletion note */}
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-7 flex items-start gap-5">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-6 h-6 text-gray-600" />
                </div>
                <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-white tracking-wide">Permanent Deletion</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-lg">
                        Permanent deletion is only available through the{' '}
                        <span className="text-red-400/70 font-medium">Trash</span> interface. Once permanently
                        deleted, all project data, files, and member associations will be irreversibly removed.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DangerZoneTab;