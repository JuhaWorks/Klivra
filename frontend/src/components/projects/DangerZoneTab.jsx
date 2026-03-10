import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../api/projectApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const DangerZoneTab = ({ project }) => {
    const [confirmName, setConfirmName] = useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const archiveMutation = useMutation({
        mutationFn: () => projectService.deleteProject(project._id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
            toast.success('Project archived successfully');
            navigate('/projects');
        }
    });

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Danger Zone</h2>
                <p className="text-zinc-500 text-sm mt-1">Irreversible actions and project lifecycle management.</p>
            </div>

            <section className="bg-red-500/5 border border-red-500/20 rounded-[40px] p-8 space-y-8 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <AlertTriangle className="w-32 h-32 text-red-500" />
                </div>

                <div className="max-w-xl space-y-6 relative z-10">
                    <div className="flex items-center gap-3 text-red-400">
                        <ShieldAlert className="w-6 h-6" />
                        <h3 className="font-black uppercase tracking-[0.1em] text-sm">Archival Confirmation</h3>
                    </div>

                    <p className="text-sm text-red-400/70 leading-relaxed font-medium">
                        Archiving this project will move it to the Trash. It will become <span className="text-red-400 font-bold underline decoration-red-400/30">Read-Only</span> for all members. This action can be reversed from the Project Trash view.
                    </p>

                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-red-500/50 uppercase ml-1 tracking-widest">Type project name to proceed</label>
                        <input
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder={project.name}
                            className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl px-6 py-4 text-red-100 placeholder:text-red-900 focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all font-bold tracking-tight"
                        />

                        <button
                            onClick={() => archiveMutation.mutate()}
                            disabled={confirmName !== project.name || archiveMutation.isPending}
                            className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_20px_40px_rgba(220,38,38,0.2)] active:scale-95"
                        >
                            {archiveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                            ARCHIVE "{project.name.toUpperCase()}"
                        </button>
                    </div>
                </div>
            </section>

            <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-zinc-600" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-zinc-300">Need to delete permanently?</h4>
                    <p className="text-xs text-zinc-500 mt-1">Permanent deletion is only available for Archived projects in the Trash view.</p>
                </div>
            </div>
        </div>
    );
};

export default DangerZoneTab;
