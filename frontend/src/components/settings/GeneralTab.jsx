import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, FileText, BadgeCheck, Zap, Info } from 'lucide-react';
import { useAuthStore, api } from '../../store/useAuthStore';
import ThemeSelector from './ThemeSelector';
import ModeSelector from './ModeSelector';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GlassSurface from '../ui/GlassSurface';

const generalSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
});

export default function GeneralTab({ showOnlyAppearance = false }) {
    const { user } = useAuthStore();
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(generalSchema),
        defaultValues: {
            name: user?.name || '',
        },
    });



    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.put('/auth/profile', data);
            return response.data;
        },
        onSuccess: (data) => {
            useAuthStore.setState((state) => ({ user: { ...state.user, ...data.data } }));
            toast.success('Profile updated successfully.');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Update failed.');
        }
    });

    const onSubmit = (data) => {
        updateMutation.mutate(data);
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {showOnlyAppearance && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-2">
                    <ModeSelector />
                    <ThemeSelector />
                </div>
            )}

            {!showOnlyAppearance && (
                <>
                    {/* Header with improved contrast */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-default">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-primary tracking-tighter uppercase">Profile <span className="text-theme">Info.</span></h2>
                            <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.3em]">Manage your public profile</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <BadgeCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Verified Account</span>
                        </div>
                    </div>

                    {/* Profile Section */}
                    <div className="relative overflow-hidden border border-default rounded-xl group">
                        <div className="absolute inset-0 z-0">
                            <GlassSurface 
                                width="100%" 
                                height="100%" 
                                borderRadius={12} 
                                displace={0.5} 
                                distortionScale={-60} 
                                backgroundOpacity={0.06} 
                                opacity={0.93} 
                            />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 px-8 py-5">
                                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-surface border border-default">
                                    <User size={13} className="text-tertiary" />
                                </div>
                                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-secondary font-semibold">
                                    Account Details
                                </span>
                            </div>
                            <div className="relative h-px bg-surface" />

                            <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Name Field */}
                                    <div className="space-y-2">
                                        <label className="block font-mono text-[9px] tracking-[0.16em] uppercase text-tertiary font-semibold mb-2">Full Name</label>
                                        <div className="relative group">
                                            <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-disabled pointer-events-none group-focus-within:text-theme transition-colors transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Enter your name"
                                                {...register('name')}
                                                className="w-full bg-surface border border-default rounded-lg pl-9 pr-4 py-2.5 text-primary text-sm font-medium placeholder:text-disabled outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40"
                                            />
                                        </div>
                                        {errors.name && <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-rose-500 font-semibold mt-1.5">{errors.name.message}</p>}
                                    </div>


                                </div>

                                <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-default gap-6">
                                    <div className="flex items-center gap-2">
                                        <Info size={12} className="text-disabled shrink-0" />
                                        <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-disabled max-w-[300px] leading-relaxed">
                                            Updates will be reflected globally across the platform.
                                        </p>
                                    </div>
                                    <Button
                                        type="submit"
                                        isLoading={updateMutation.isPending}
                                        disabled={updateMutation.isPending}
                                        className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary text-elevated text-xs font-semibold tracking-wide hover:bg-theme hover:text-white transition-all shadow-xl shadow-primary/5"
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>


                    {/* Feedback Loops with better visibility */}
                    <div className="relative flex items-center gap-4 p-8 overflow-hidden rounded-[2.5rem] mt-20 border border-theme/20">
                        <div className="absolute inset-0 z-0">
                            <GlassSurface 
                                width="100%" 
                                height="100%" 
                                borderRadius={40} 
                                displace={0.3} 
                                distortionScale={-40} 
                                backgroundOpacity={0.08} 
                                opacity={0.85} 
                            />
                        </div>
                        <div className="relative z-10 flex items-center gap-4 w-full">
                            <div className="w-12 h-12 rounded-2xl bg-theme/20 flex items-center justify-center border border-theme/30">
                                <Zap className="w-6 h-6 text-theme" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">Profile Synced</span>
                                <span className="text-[10px] text-secondary font-medium tracking-wide">All profile updates are globally broadcasted and active.</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
