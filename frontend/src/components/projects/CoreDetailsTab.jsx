import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUpdateProject, useUploadProjectImage } from '../../hooks/projects/useProjectQueries';
import { Save, Loader2, Layout, Upload, Image as ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useRef, useEffect } from 'react';
import LockedInput from './LockedInput';
import { useSocketStore } from '../../store/useSocketStore';

const projectSchema = z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters').max(100),
    description: z.string().min(10, 'Description must be at least 10 characters').max(500),
    category: z.string().min(2, 'Please select or enter a category'),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid start date' }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid end date' }),
    coverImageUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
});

const CoreDetailsTab = ({ project, isAuthorized }) => {
    const updateMutation = useUpdateProject();

    const uploadMutation = useUploadProjectImage();
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(project.coverImageUrl || '');

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isDirty, isValid },
    } = useForm({
        resolver: zodResolver(projectSchema),
        mode: 'onChange',
        defaultValues: {
            name: project.name,
            description: project.description,
            category: project.category,
            startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
            endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
            coverImageUrl: project.coverImageUrl || ''
        }
    });

    const coverImageUrl = watch('coverImageUrl');

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File too large (max 10MB)');
            return;
        }

        const tempUrl = URL.createObjectURL(file);
        setPreviewUrl(tempUrl);

        try {
            await uploadMutation.mutateAsync({ id: project._id, file });
            // After successful upload, the server returns the new URL
            // and the hook updates the query data automatically.
        } catch (err) {
            // Error handled by mutation
            setPreviewUrl(project.coverImageUrl || '');
        }
    };

    const onSubmit = (data) => {
        updateMutation.mutate({
            id: project._id,
            data,
            version: project.__v // Send version for OCC
        });
    };

    return (
        <section className="bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <Layout className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-bold text-white tracking-tight">General Information</h2>
                </div>
                {!isAuthorized && (
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">Read Only</span>
                )}
            </div>

            <div className="p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 gap-8">
                        {/* Project Name */}
                        <LockedInput
                            projectId={project._id}
                            fieldId="name"
                            label="Project Name"
                            register={register}
                            error={errors.name}
                            disabled={!isAuthorized || updateMutation.isPending}
                            placeholder="Enter project name..."
                        />

                        {/* Description */}
                        <LockedInput
                            projectId={project._id}
                            fieldId="description"
                            label="Description"
                            as="textarea"
                            rows={4}
                            register={register}
                            error={errors.description}
                            disabled={!isAuthorized || updateMutation.isPending}
                            placeholder="What is this project about?"
                        />

                        {/* Cover Image Section */}
                        <div className="space-y-4">
                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Project Cover</label>

                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Preview & Upload Area */}
                                <div className="relative group w-full lg:w-1/3 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center">
                                    {previewUrl || coverImageUrl ? (
                                        <img src={previewUrl || coverImageUrl} className="w-full h-full object-cover" alt="Cover Preview" />
                                    ) : (
                                        <ImageIcon className="w-10 h-10 text-zinc-800" />
                                    )}

                                    {isAuthorized && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current.click()}
                                                disabled={uploadMutation.isPending}
                                                className="p-3 bg-white text-zinc-950 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
                                            >
                                                {uploadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                            </button>
                                            {(previewUrl || coverImageUrl) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setValue('coverImageUrl', '', { shouldDirty: true });
                                                        setPreviewUrl('');
                                                    }}
                                                    className="p-3 bg-red-500 text-white rounded-xl hover:scale-105 transition-transform"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Option 1: Paste Image URL</p>
                                        <input
                                            {...register('coverImageUrl')}
                                            disabled={!isAuthorized || updateMutation.isPending}
                                            placeholder="https://images.unsplash.com/..."
                                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50 transition-all font-medium text-sm"
                                        />
                                        {errors.coverImageUrl && <p className="text-xs text-red-400 ml-1 font-medium">{errors.coverImageUrl.message}</p>}
                                    </div>
                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-relaxed">
                                            Tip: You can either paste a direct link to an image or upload one from your device. Recommended ratio is 16:9.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Category */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Category</label>
                            <div className="relative">
                                <select
                                    {...register('category')}
                                    disabled={!isAuthorized || updateMutation.isPending}
                                    className="w-full bg-[#0c0c16] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50 transition-all appearance-none cursor-pointer font-medium text-sm"
                                >
                                    <option value="" disabled>Select category</option>
                                    {['Development', 'Design', 'Marketing', 'Research', 'Internal', 'Client'].map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                            {errors.category && <p className="text-xs text-red-400 ml-1 font-medium">{errors.category.message}</p>}
                        </div>

                        {/* Dates */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Start Date</label>
                            <input
                                type="date"
                                {...register('startDate')}
                                disabled={!isAuthorized || updateMutation.isPending}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50 transition-all font-medium text-sm [color-scheme:dark]"
                            />
                            {errors.startDate && <p className="text-xs text-red-400 ml-1 font-medium">{errors.startDate.message}</p>}
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">End Date</label>
                            <input
                                type="date"
                                {...register('endDate')}
                                disabled={!isAuthorized || updateMutation.isPending}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50 transition-all font-medium text-sm [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    {isAuthorized && (
                        <div className="pt-8 border-t border-white/5 flex justify-end">
                            <button
                                type="submit"
                                disabled={!isDirty || !isValid || updateMutation.isPending}
                                className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-200 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_20px_40px_rgba(255,255,255,0.05)] active:scale-95"
                            >
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    )}
                </form>
            </div >
        </section >
    );
};

export default CoreDetailsTab;
