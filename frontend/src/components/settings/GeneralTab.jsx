import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, BadgeCheck, Zap, Info, Palette } from 'lucide-react';
import { useAuthStore, api } from '../../store/useAuthStore';
import ThemeSelector from './ThemeSelector';
import ModeSelector from './ModeSelector';
import Button from '../ui/Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GlassSurface from '../ui/GlassSurface';

const cn = (...inputs) => twMerge(clsx(inputs));

const generalSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    interfacePrefs: z.object({
        showTeamClock: z.boolean().default(true),
        showWeather: z.boolean().default(true),
        showQuote: z.boolean().default(true),
        showChatBubbles: z.boolean().default(true),
        showIntelligence: z.boolean().default(true)
    }).optional()
});

export default function GeneralTab({ showOnlyAppearance = false }) {
    const { user } = useAuthStore();
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(generalSchema),
        defaultValues: {
            name: user?.name || '',
            interfacePrefs: {
                showTeamClock: user?.interfacePrefs?.showTeamClock ?? true,
                showWeather: user?.interfacePrefs?.showWeather ?? true,
                showApod: user?.interfacePrefs?.showApod ?? true,
                showQuote: user?.interfacePrefs?.showQuote ?? true,
                showChatBubbles: user?.interfacePrefs?.showChatBubbles ?? true,
                showIntelligence: user?.interfacePrefs?.showIntelligence ?? true
            }
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
            {showOnlyAppearance ? (
                <div className="space-y-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-2">
                        <ModeSelector />
                        <ThemeSelector />
                    </div>

                    <div className="pt-8 border-t border-default space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Palette size={14} className="text-theme" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Dashboard Display</span>
                        </div>
                        
                        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Team Clock Toggle */}
                            {user?.role !== 'Admin' && (
                                <div className="flex items-center justify-between p-4 rounded-xl bg-sunken/[0.3] border border-white/5 group hover:border-theme/30 transition-all">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black text-primary uppercase tracking-widest">Team Clocks</p>
                                        <p className="text-[9px] text-tertiary font-medium">Display teammate locations</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const newVal = !watch('interfacePrefs.showTeamClock');
                                            setValue('interfacePrefs.showTeamClock', newVal, { shouldDirty: true });
                                            onSubmit({ ...watch(), interfacePrefs: { ...watch('interfacePrefs'), showTeamClock: newVal } });
                                        }}
                                        className={cn(
                                            "w-10 h-5 rounded-full relative transition-all duration-300",
                                            watch('interfacePrefs.showTeamClock') ? "bg-theme" : "bg-sunken border border-glass"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                                            watch('interfacePrefs.showTeamClock') ? "right-1 bg-primary" : "left-1 bg-tertiary"
                                        )} />
                                    </button>
                                </div>
                            )}

                            {/* Weather Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-sunken/[0.3] border border-white/5 group hover:border-theme/30 transition-all">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">Weather</p>
                                    <p className="text-[9px] text-tertiary font-medium">Current weather insights</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const newVal = !watch('interfacePrefs.showWeather');
                                        setValue('interfacePrefs.showWeather', newVal, { shouldDirty: true });
                                        onSubmit({ ...watch(), interfacePrefs: { ...watch('interfacePrefs'), showWeather: newVal } });
                                    }}
                                    className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        watch('interfacePrefs.showWeather') ? "bg-theme" : "bg-sunken border border-glass"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                                        watch('interfacePrefs.showWeather') ? "right-1 bg-primary" : "left-1 bg-tertiary"
                                    )} />
                                </button>
                            </div>

                            {/* NASA APOD Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-sunken/[0.3] border border-white/5 group hover:border-theme/30 transition-all">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">NASA APOD</p>
                                    <p className="text-[9px] text-tertiary font-medium">NASA Astronomy Picture Feed</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const newVal = !watch('interfacePrefs.showApod');
                                        setValue('interfacePrefs.showApod', newVal, { shouldDirty: true });
                                        onSubmit({ ...watch(), interfacePrefs: { ...watch('interfacePrefs'), showApod: newVal } });
                                    }}
                                    className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        watch('interfacePrefs.showApod') ? "bg-theme" : "bg-sunken border border-glass"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                                        watch('interfacePrefs.showApod') ? "right-1 bg-primary" : "left-1 bg-tertiary"
                                    )} />
                                </button>
                            </div>

                            {/* Daily Quote Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-sunken/[0.3] border border-white/5 group hover:border-theme/30 transition-all">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">Inspiration</p>
                                    <p className="text-[9px] text-tertiary font-medium">Daily quote of the day</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const newVal = !watch('interfacePrefs.showQuote');
                                        setValue('interfacePrefs.showQuote', newVal, { shouldDirty: true });
                                        onSubmit({ ...watch(), interfacePrefs: { ...watch('interfacePrefs'), showQuote: newVal } });
                                    }}
                                    className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        watch('interfacePrefs.showQuote') ? "bg-theme" : "bg-sunken border border-glass"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                                        watch('interfacePrefs.showQuote') ? "right-1 bg-primary" : "left-1 bg-tertiary"
                                    )} />
                                </button>
                            </div>

                            {/* Global Chat Bubbles Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-sunken/[0.3] border border-white/5 group hover:border-theme/30 transition-all">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">Chat Bubbles</p>
                                    <p className="text-[9px] text-tertiary font-medium">Enables floating chat circles</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const newVal = !watch('interfacePrefs.showChatBubbles');
                                        setValue('interfacePrefs.showChatBubbles', newVal, { shouldDirty: true });
                                        onSubmit({ ...watch(), interfacePrefs: { ...watch('interfacePrefs'), showChatBubbles: newVal } });
                                    }}
                                    className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        watch('interfacePrefs.showChatBubbles') ? "right-1 bg-primary" : "left-1 bg-tertiary"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                                        watch('interfacePrefs.showChatBubbles') ? "right-1 bg-primary" : "left-1 bg-tertiary"
                                    )} />
                                </button>
                            </div>

                            {/* Intelligence Monitor Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-sunken/[0.3] border border-white/5 group hover:border-theme/30 transition-all">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">Signals Feed</p>
                                    <p className="text-[9px] text-tertiary font-medium">Real-time intelligence feed</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const newVal = !watch('interfacePrefs.showIntelligence');
                                        setValue('interfacePrefs.showIntelligence', newVal, { shouldDirty: true });
                                        onSubmit({ ...watch(), interfacePrefs: { ...watch('interfacePrefs'), showIntelligence: newVal } });
                                    }}
                                    className={cn(
                                        "w-10 h-5 rounded-full relative transition-all duration-300",
                                        watch('interfacePrefs.showIntelligence') ? "bg-theme" : "bg-sunken border border-glass"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                                        watch('interfacePrefs.showIntelligence') ? "right-1 bg-primary" : "left-1 bg-tertiary"
                                    )} />
                                </button>
                            </div>

                            {/* Individual Bubble Management - Moved inside form or separate container */}
                            {watch('interfacePrefs.showChatBubbles') && user?.interfacePrefs?.bubbledChats?.length > 0 && (
                                <div className="col-span-1 md:col-span-2 mt-4 pt-8 border-t border-glass space-y-4">
                                    <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.2em]">Currently Bubbled Conversations</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {user.interfacePrefs.bubbledChats.map((chatId) => (
                                            <BubbledChatCard key={chatId} chatId={chatId} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            ) : (
                <>
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

                    <div className="relative overflow-hidden border border-default rounded-xl group">
                        <div className="absolute inset-0 z-0">
                            <GlassSurface width="100%" height="100%" borderRadius={12} displace={0.5} distortionScale={-60} backgroundOpacity={0.06} opacity={0.93} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 px-8 py-5">
                                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-surface border border-default">
                                    <User size={13} className="text-tertiary" />
                                </div>
                                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-secondary font-semibold">Account Details</span>
                            </div>
                            <div className="relative h-px bg-surface" />

                            <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="block font-mono text-[9px] tracking-[0.16em] uppercase text-tertiary font-semibold mb-2">Full Name</label>
                                        <div className="relative group">
                                            <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-disabled pointer-events-none group-focus-within:text-theme transition-colors" />
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
                                        <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-disabled max-w-[300px] leading-relaxed">Updates will be reflected globally.</p>
                                    </div>
                                    <Button type="submit" isLoading={updateMutation.isPending} disabled={updateMutation.isPending} className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary text-elevated text-xs font-semibold tracking-wide hover:bg-theme hover:text-white transition-all shadow-xl shadow-primary/5">
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

import { useChatStore } from '../../store/useChatStore';
import { X } from 'lucide-react';

const BubbledChatCard = ({ chatId }) => {
    const { chats, toggleBubble } = useChatStore();
    const chat = chats.find(c => c._id === chatId);
    const { user } = useAuthStore();

    if (!chat) return null;

    const other = chat.type === 'private' ? chat.participants.find(p => p._id !== user?._id) : null;
    const name = chat.type === 'group' ? chat.name : other?.name;

    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-base border border-glass">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-glass">
                    <img
                        src={chat.type === 'group' ? (chat.avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100') : other?.avatar}
                        className="w-full h-full object-cover"
                        alt=""
                    />
                </div>
                <span className="text-[11px] font-bold text-primary truncate max-w-[120px]">{name}</span>
            </div>
            <button
                onClick={() => toggleBubble(chatId)}
                className="p-1.5 hover:bg-glass rounded-lg text-tertiary hover:text-danger transition-all"
            >
                <X size={14} />
            </button>
        </div>
    );
};
