import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, Loader2, Zap, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../api/projectApi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

/**
 * Modern 2026 DangerZoneTab
 * High-vibrance risk management with Glassmorphism 2.0
 */
const DangerZoneTab = ({ project }) => {
    const [confirmName, setConfirmName] = useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const archiveMutation = useMutation({
        mutationFn: () => projectService.deleteProject(project._id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['projects', 'archived'] });
            toast.success('Segment de-initialized to Trash.');
            navigate('/projects');
        },
        onError: () => toast.error('Archival protocol failed.')
    });

    return (
        <div className="space-y-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-red-500 font-black text-[10px] uppercase tracking-[0.4em]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>High-Risk Directive</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Lifecycle De-init.</h2>
                    <p className="text-gray-500 font-medium text-sm max-w-lg">
                        Executing irreversible operational shifts and terminal project transitions. Clear authorization required.
                    </p>
                </div>
            </header>

            <motion.section 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/5 border border-red-500/20 rounded-[3rem] p-12 space-y-10 backdrop-blur-xl relative overflow-hidden shadow-2xl"
            >
                {/* Cinematic Warning Overlay */}
                <div className="absolute top-[-20%] right-[-10%] p-8 opacity-5 pointer-events-none">
                    <AlertTriangle className="w-96 h-96 text-red-500" />
                </div>

                <div className="max-w-2xl space-y-8 relative z-10">
                    <div className="flex items-center gap-4 text-red-400">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tighter">Segment Archival Protocol</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60">Authorization Level: Manager+</p>
                        </div>
                    </div>

                    <p className="text-sm text-red-400/80 leading-relaxed font-medium">
                        De-initializing this project will transmit it to the <span className="text-red-400 font-black">Segment Trash</span>. 
                        The domain will switch to <span className="underline decoration-red-500/40">Read-Only</span> state for all authorized agents. 
                        Historical records remain intact for cryptographic recovery.
                    </p>

                    <div className="space-y-6 bg-black/20 p-8 rounded-[2rem] border border-red-500/10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-red-500/40 uppercase ml-1 tracking-[0.2em]">Confirm Project Identifier</label>
                            <input
                                value={confirmName}
                                onChange={(e) => setConfirmName(e.target.value)}
                                placeholder={`Type "${project.name}" to verify`}
                                className="w-full bg-red-500/5 border border-red-500/10 rounded-2xl px-6 py-5 text-red-100 placeholder:text-red-900 focus:outline-none focus:border-red-500/40 focus:ring-8 focus:ring-red-500/5 transition-all font-black text-base tracking-tight"
                            />
                        </div>

                        <Button
                            variant="primary"
                            onClick={() => archiveMutation.mutate()}
                            disabled={confirmName !== project.name || archiveMutation.isPending}
                            isLoading={archiveMutation.isPending}
                            leftIcon={Trash2}
                            className="w-full py-6 bg-red-600 hover:bg-red-500 border-red-500/20 shadow-[0_20px_50px_rgba(220,38,38,0.3)] text-base tracking-tighter"
                        >
                            Execute Terminal Archive
                        </Button>
                    </div>
                </div>
            </motion.section>

            <div className="glass-2 bg-white/5 border border-white/5 rounded-3xl p-8 flex items-center gap-6">
                <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shrink-0">
                    <AlertCircle className="w-7 h-7 text-gray-700" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Permanent Deletion Requirement</h4>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed max-w-lg">
                        Terminal deletion of project nodes is only accessible via the <span className="text-red-400/80">Segment Trash</span> interface. Once executed, all neural links and asset references will be permanently purged.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DangerZoneTab;
