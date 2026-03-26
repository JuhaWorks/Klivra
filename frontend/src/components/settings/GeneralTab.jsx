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
    customMessage: z.string().max(250, 'Bio cannot exceed 250 characters').optional(),
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
            customMessage: user?.customMessage || '',
        },
    });

    const bioValue = watch('customMessage') || '';

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

                    {/* Form Card with reduced frosting */}
                    <Card padding="p-0" className="relative overflow-hidden border-default group shadow-2xl">
                        <div className="absolute inset-0 z-0">
                            <GlassSurface 
                                width="100%" 
                                height="100%" 
                                borderRadius={24} 
                                displace={0.3} 
                                distortionScale={-40} 
                                backgroundOpacity={0.04} 
                                opacity={0.85} 
                            />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="px-10 py-6 border-b border-default bg-sunken/10 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-tertiary" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Account Details</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Name Field */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-tertiary uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary group-focus-within:text-theme transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Enter your name"
                                                {...register('name')}
                                                className="w-full bg-sunken border border-default rounded-2xl pl-14 pr-6 py-4 text-primary focus:outline-none focus:border-theme/30 transition-all font-medium text-sm placeholder:text-tertiary/50"
                                            />
                                        </div>
                                        {errors.name && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">{errors.name.message}</p>}
                                    </div>

                                    {/* Bio Field */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-tertiary uppercase tracking-widest">Bio</label>
                                            <span className={twMerge(clsx(
                                                "text-[9px] font-black uppercase tracking-widest",
                                                bioValue.length >= 250 ? 'text-rose-500' : 'text-tertiary'
                                            ))}>
                                                {bioValue.length} / 250
                                            </span>
                                        </div>
                                        <div className="relative group">
                                            <FileText className="absolute top-5 left-5 w-4 h-4 text-tertiary group-focus-within:text-theme transition-colors" />
                                            <textarea
                                                rows={1}
                                                placeholder="Tell us about yourself..."
                                                {...register('customMessage')}
                                                className="w-full bg-sunken border border-default rounded-2xl pl-14 pr-6 py-4 text-primary focus:outline-none focus:border-theme/30 transition-all font-medium text-sm resize-none h-[54px] pt-4 placeholder:text-tertiary/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-between border-t border-default">
                                    <div className="flex items-center gap-3">
                                        <Info className="w-4 h-4 text-tertiary" />
                                        <p className="text-[9px] font-black text-tertiary uppercase tracking-widest max-w-[300px] leading-relaxed">
                                            Updates will be reflected globally across the platform.
                                        </p>
                                    </div>
                                    <Button
                                        type="submit"
                                        isLoading={updateMutation.isPending}
                                        disabled={updateMutation.isPending}
                                        className="px-12 py-5 rounded-2xl bg-primary text-elevated font-black uppercase tracking-widest hover:bg-theme hover:text-white transition-all shadow-xl shadow-primary/5"
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>

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
