import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, FileText } from 'lucide-react';
import { useAuthStore, api } from '../../store/useAuthStore';
import ThemeSelector from './ThemeSelector';
import ModeSelector from './ModeSelector';

const generalSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    customMessage: z.string().max(250, 'Bio cannot exceed 250 characters').optional(),
});

export default function GeneralTab() {
    const { user, updateProfile } = useAuthStore();

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
            const response = await api.put('/settings/profile', data);
            return response.data;
        },
        onSuccess: (data) => {
            useAuthStore.setState((state) => ({ user: { ...state.user, ...data.data } }));
            toast.success('Profile updated successfully!');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        }
    });

    const onSubmit = (data) => {
        updateMutation.mutate(data);
    };

    return (
        <div>
            <div className="mb-6 pb-6 border-b border-white/[0.06]">
                <h2 className="text-[17px] font-bold text-white tracking-tight">General Information</h2>
                <p className="text-[13px] text-gray-500 mt-1">Update your personal details here.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Field */}
                <div className="space-y-1.5">
                    <label htmlFor="name" className="block text-[13px] font-semibold text-gray-300">
                        Full Name
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                            id="name"
                            type="text"
                            placeholder="Juhayer"
                            {...register('name')}
                            className="block w-full pl-10 px-3.5 py-2.5 border border-white/[0.06] rounded-xl text-[13px] bg-white/[0.02] text-gray-200 placeholder-gray-600 focus:bg-white/[0.04] focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all duration-200 shadow-inner shadow-black/20"
                        />
                    </div>
                    {errors.name && <p className="text-xs text-red-400 mt-1.5">{errors.name.message}</p>}
                </div>

                {/* About/Bio Field */}
                <div className="space-y-1.5">
                    <label htmlFor="customMessage" className="block text-[13px] font-semibold text-gray-300">
                        About You
                    </label>
                    <div className="relative">
                        <div className="absolute top-3.5 left-3.5 pointer-events-none">
                            <FileText className="h-4 w-4 text-gray-500" />
                        </div>
                        <textarea
                            id="customMessage"
                            rows={4}
                            placeholder="Tell us a little about yourself..."
                            {...register('customMessage')}
                            className="block w-full pl-10 px-3.5 py-2.5 border border-white/[0.06] rounded-xl text-[13px] bg-white/[0.02] text-gray-200 placeholder-gray-600 focus:bg-white/[0.04] focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all duration-200 shadow-inner shadow-black/20 resize-none"
                        />
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                        {errors.customMessage ? (
                            <p className="text-xs text-red-400">{errors.customMessage.message}</p>
                        ) : (<span />)}
                        <p className={`text-[11px] font-medium ${bioValue.length >= 250 ? 'text-red-400' : 'text-gray-500'}`}>
                            {bioValue.length} / 250
                        </p>
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center justify-center px-4 py-2.5 text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            <div className="my-10 border-t border-white/[0.06]"></div>

            <ModeSelector />

            <div className="my-10 border-t border-white/[0.06]"></div>

            <ThemeSelector />
        </div>
    );
}
