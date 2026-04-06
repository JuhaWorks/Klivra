import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShieldAlert, ChevronDown, X, Zap, AlertTriangle, Trash2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GlassSurface from '../ui/GlassSurface';


/**
 * Danger Zone View
 * Professional handles for high-risk account actions.
 */
const ConfirmModal = ({ isOpen, onClose, onConfirm, actionType, isLoading, deactivationDuration, setDeactivationDuration }) => {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;

    const isMatch = inputValue === 'CONFIRM';
    const isDeactivate = actionType === 'deactivate';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    className="relative w-full max-w-lg bg-[#09090b] border border-strong shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden"
                >
                    {/* High-Risk Header */}
                    <div className={twMerge(clsx(
                        "px-10 py-8 border-b border-default flex items-center justify-between",
                        isDeactivate ? "bg-amber-500/5" : "bg-rose-500/5"
                    ))}>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className={twMerge(clsx("w-5 h-5", isDeactivate ? "text-amber-500" : "text-rose-500"))} />
                                <h3 className="text-2xl font-black text-primary tracking-tighter uppercase">
                                    {isDeactivate ? 'Deactivate Account' : 'Delete Account'}
                                </h3>
                            </div>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Critical Action Required</p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-surface rounded-2xl text-gray-500 hover:text-primary transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-10 space-y-8">
                        {isDeactivate ? (
                            <div className="space-y-6">
                                <p className="text-[11px] text-gray-500 font-medium leading-relaxed uppercase tracking-widest bg-surface p-4 rounded-2xl">
                                    Your account will be temporarily disabled. All your data will remain safe and can be restored upon logging in again.
                                </p>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                                        Deactivation Period
                                    </label>
                                    <div className="relative group">
                                        <select
                                            className="w-full appearance-none px-6 py-4 border border-default rounded-2xl text-sm bg-surface text-primary focus:outline-none focus:border-amber-500/30 focus:ring-8 focus:ring-amber-500/5 transition-all font-medium cursor-pointer"
                                            value={deactivationDuration}
                                            onChange={(e) => setDeactivationDuration(e.target.value)}
                                        >
                                            <option value="null">Indefinite</option>
                                            <option value="7">7 Days</option>
                                            <option value="30">30 Days</option>
                                        </select>
                                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-focus-within:text-amber-400" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-2">
                                    <p className="text-[11px] text-rose-400 font-black uppercase tracking-widest">Permanent Data Deletion</p>
                                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                                        This action cannot be undone. All your projects, tasks, and account information will be permanently removed from our systems.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirmation Required</label>
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Type CONFIRM to proceed"
                                        className="w-full bg-surface border border-default rounded-2xl px-6 py-4 text-primary focus:outline-none focus:border-rose-500/30 focus:ring-8 focus:ring-rose-500/5 transition-all font-medium text-sm placeholder:text-gray-800"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 py-5 rounded-2xl">Cancel</Button>
                            <Button
                                onClick={onConfirm}
                                isLoading={isLoading}
                                disabled={(actionType === 'delete' && !isMatch) || isLoading}
                                className={twMerge(clsx(
                                    "flex-1 py-5 rounded-2xl shadow-2xl text-white",
                                    isDeactivate ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20" : "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
                                ))}
                            >
                                {isDeactivate ? 'Deactivate Account' : 'Delete Account'}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default function AccountStatusTab() {
    const navigate = useNavigate();
    const logout = useAuthStore(state => state.logout);

    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        actionType: null
    });
    const [deactivationDuration, setDeactivationDuration] = useState('null');

    const closeHandler = () => {
        setModalConfig({ isOpen: false, actionType: null });
        setDeactivationDuration('null');
    };

    const deactivateMutation = useMutation({
        mutationFn: async (duration) => {
            const body = duration !== 'null' ? { duration } : {};
            const response = await api.put('/settings/deactivate', body);
            return response.data;
        },
        onSuccess: async () => {
            toast.success('Account deactivated.');
            closeHandler();
            await logout();
            navigate('/auth/login', { replace: true });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Deactivation failed.');
            closeHandler();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const response = await api.delete('/settings/delete');
            return response.data;
        },
        onSuccess: async () => {
            toast.success('Account deleted successfully.');
            closeHandler();
            await logout();
            navigate('/auth/login', { replace: true });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Deletion failed.');
            closeHandler();
        }
    });

    const handleConfirm = () => {
        if (modalConfig.actionType === 'deactivate') {
            deactivateMutation.mutate(deactivationDuration);
        } else if (modalConfig.actionType === 'delete') {
            deleteMutation.mutate();
        }
    };

    const isLoading = deactivateMutation.isPending || deleteMutation.isPending;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={closeHandler}
                onConfirm={handleConfirm}
                actionType={modalConfig.actionType}
                isLoading={isLoading}
                deactivationDuration={deactivationDuration}
                setDeactivationDuration={setDeactivationDuration}
            />

            {/* Danger Zone Metadata */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-rose-500/10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-rose-500 tracking-tighter uppercase">Critical <span className="text-primary">Operations.</span></h2>
                    <p className="text-[10px] font-black text-rose-500/40 uppercase tracking-[0.3em]">Irreversible Account Actions</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-xl">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">High Risk Action</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Deactivate Option */}
                <Card padding="p-8" className="relative overflow-hidden border-amber-500/5 transition-all group">
                    <div className="absolute inset-0 z-0">
                        <GlassSurface width="100%" height="100%" borderRadius={24} displace={0.5} distortionScale={-60} backgroundOpacity={0.08} opacity={0.95} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center border border-amber-500/10 group-hover:scale-110 transition-transform">
                                <LogOut className="w-8 h-8 text-amber-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Deactivate Account</h3>
                                <p className="text-[11px] text-gray-500 font-medium max-w-lg leading-relaxed">
                                    Temporarily disable your account. Your data will be preserved for when you decide to return.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setModalConfig({ isOpen: true, actionType: 'deactivate' })}
                            className="bg-amber-600 hover:bg-amber-500 px-8 py-4 rounded-xl shadow-xl shadow-amber-500/10 text-white"
                        >
                            Deactivate Account
                        </Button>
                    </div>
                </Card>

                {/* Delete Option */}
                <Card padding="p-8" className="relative overflow-hidden border-rose-500/5 transition-all group">
                    <div className="absolute inset-0 z-0">
                        <GlassSurface width="100%" height="100%" borderRadius={24} displace={0.5} distortionScale={-60} backgroundOpacity={0.08} opacity={0.95} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 flex items-center justify-center border border-rose-500/10 group-hover:scale-110 transition-transform">
                                <Trash2 className="w-8 h-8 text-rose-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Delete Account</h3>
                                <p className="text-[11px] text-gray-500 font-medium max-w-lg leading-relaxed">
                                    Permanently delete your account and all associated data. This action is irreversible.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setModalConfig({ isOpen: true, actionType: 'delete' })}
                            className="bg-rose-600 hover:bg-rose-500 px-8 py-4 rounded-xl shadow-xl shadow-rose-500/10 text-white"
                        >
                            Delete Account
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Danger Zone Warning */}
            <div className="relative p-8 overflow-hidden rounded-[2.5rem] border border-default flex items-start gap-6 group opacity-50">
                <div className="absolute inset-0 z-0">
                    <GlassSurface width="100%" height="100%" borderRadius={40} displace={0.5} distortionScale={-60} backgroundOpacity={0.06} opacity={0.93} />
                </div>
                <div className="relative z-10 flex items-start gap-6 w-full">
                    <ShieldAlert className="w-6 h-6 text-gray-600 shrink-0 mt-1" />
                    <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Important Note</span>
                        <p className="text-[10px] text-gray-700 font-medium leading-relaxed uppercase tracking-widest">
                            Account actions primarily affect your personal profile. Some data in collaborative projects may remain visible to teammates.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
