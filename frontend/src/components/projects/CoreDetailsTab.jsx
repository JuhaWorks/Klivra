import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUpdateProject, useUploadProjectImage } from '../../hooks/projects/useProjectQueries';
import { Save, Loader2, Layout, Upload, Image as ImageIcon, X, Trash2, Calendar, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import LockedInput from './LockedInput';
import { useSocketStore } from '../../store/useSocketStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

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

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Data volume limit exceeded (max 10MB)');
            return;
        }

        const tempUrl = URL.createObjectURL(file);
        setPreviewUrl(tempUrl);

        try {
            await uploadMutation.mutateAsync({ id: project._id, file });
            toast.success('Project image uploaded successfully.');
        } catch (err) {
            setPreviewUrl(project.coverImageUrl || '');
        }
    };

    const onSubmit = (data) => {
        updateMutation.mutate({
            id: project._id,
            data,
            version: project.__v
        });
    };

    return (
        <Card className="overflow-hidden" padding="p-0">
            <header className="px-10 py-8 border-b border-default flex items-center justify-between bg-surface">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                        <Layout className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-primary tracking-tighter">Configure Project Details</h2>
                    </div>
                </div>
                {!isAuthorized && (
                    <div className="flex items-center gap-2 px-4 py-1.5 glass-2 bg-sunken border-default rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        <span className="text-[9px] font-black text-tertiary uppercase tracking-widest">Read-only Mode</span>
                    </div>
                )}
            </header>

            <div className="p-10">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                    <div className="space-y-10">
                        {/* Project Name & Description */}
                        <div className="grid grid-cols-1 gap-10">
                            <LockedInput
                                projectId={project._id}
                                fieldId="name"
                                label="Project Name"
                                register={register}
                                error={errors.name}
                                disabled={!isAuthorized || updateMutation.isPending}
                                placeholder="Enter project name..."
                            />

                            <LockedInput
                                projectId={project._id}
                                fieldId="description"
                                label="Project Description"
                                as="textarea"
                                register={register}
                                error={errors.description}
                                disabled={!isAuthorized || updateMutation.isPending}
                                placeholder="Describe the project objective..."
                            />
                        </div>

                        {/* Visual Asset Section */}
                        <div className="space-y-6">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Upload</label>

                            <div className="flex flex-col lg:flex-row gap-8 items-start">
                                <div className="relative group w-32 h-32 lg:w-40 lg:h-40 rounded-3xl overflow-hidden border border-default bg-elevated flex-shrink-0 flex items-center justify-center shadow-2xl">
                                    <AnimatePresence mode="wait">
                                        {previewUrl || coverImageUrl ? (
                                            <motion.img
                                                key="preview"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                src={previewUrl || coverImageUrl}
                                                className="w-full h-full object-cover"
                                                alt="Asset Preview"
                                            />
                                        ) : (
                                            <motion.div
                                                key="empty"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-gray-800"
                                            >
                                                <ImageIcon className="w-12 h-12" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {isAuthorized && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current.click()}
                                                disabled={uploadMutation.isPending}
                                                className="p-4 bg-white text-black rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl"
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
                                                    className="p-4 bg-red-600/20 border border-red-500/20 text-red-500 rounded-2xl hover:scale-110 active:scale-95 transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
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
                                    {/* Shimmer overlay for loading */}
                                    <AnimatePresence>
                                        {uploadMutation.isPending && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-white/5 animate-pulse"
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block ml-1">External Image URL</label>
                                        <input
                                            {...register('coverImageUrl')}
                                            disabled={!isAuthorized || updateMutation.isPending}
                                            placeholder="https://images.unsplash.com/..."
                                            className="w-full bg-surface border border-default rounded-2xl px-5 py-4 text-primary placeholder:text-tertiary focus:outline-none focus:border-cyan-500/30 focus:ring-4 focus:ring-cyan-500/5 disabled:opacity-50 transition-all font-medium text-sm"
                                        />
                                        {errors.coverImageUrl && <p className="text-[10px] text-red-400 ml-1 font-black uppercase tracking-widest mt-1">{errors.coverImageUrl.message}</p>}
                                    </div>
                                    <div className="p-5 glass-2 bg-emerald-500/5 border border-emerald-500/10 rounded-[1.5rem] flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                        <p className="text-[10px] text-emerald-400/80 font-black uppercase tracking-widest leading-relaxed">
                                            Asset Guideline: Recommended ratio 16:9 for optimal display quality.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Project Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Project Category</label>
                                <div className="relative">
                                    <select
                                        {...register('category')}
                                        disabled={!isAuthorized || updateMutation.isPending}
                                        className="w-full bg-surface border border-default rounded-2xl px-5 py-4 text-primary focus:outline-none focus:border-cyan-500/30 focus:ring-4 focus:ring-cyan-500/5 disabled:opacity-50 transition-all appearance-none cursor-pointer font-black text-xs uppercase tracking-widest"
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {['Development', 'Design', 'Marketing', 'Research', 'Internal', 'Client'].map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600 transition-colors group-hover:text-white">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                                {errors.category && <p className="text-[10px] text-red-400 ml-1 font-black uppercase tracking-widest mt-1">{errors.category.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">Start Date </label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="date"
                                        {...register('startDate')}
                                        disabled={!isAuthorized || updateMutation.isPending}
                                        className="w-full bg-surface border border-default rounded-2xl pl-12 pr-5 py-4 text-primary focus:outline-none focus:border-cyan-500/30 focus:ring-4 focus:ring-cyan-500/5 disabled:opacity-50 transition-all font-black text-xs [color-scheme:dark]"
                                    />
                                </div>
                                {errors.startDate && <p className="text-[10px] text-red-400 ml-1 font-black uppercase tracking-widest mt-1">{errors.startDate.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ml-1">End Date</label>
                                <div className="relative">
                                    <Target className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="date"
                                        {...register('endDate')}
                                        disabled={!isAuthorized || updateMutation.isPending}
                                        className="w-full bg-surface border border-default rounded-2xl pl-12 pr-5 py-4 text-primary focus:outline-none focus:border-cyan-500/30 focus:ring-4 focus:ring-cyan-500/5 disabled:opacity-50 transition-all font-black text-xs [color-scheme:light]"
                                    />
                                </div>
                                {errors.endDate && <p className="text-[10px] text-red-400 ml-1 font-black uppercase tracking-widest mt-1">{errors.endDate.message}</p>}
                            </div>
                        </div>
                    </div>

                    {isAuthorized && (
                        <footer className="pt-10 border-t border-white/5 flex justify-end">
                            <Button
                                type="submit"
                                disabled={!isDirty || !isValid || updateMutation.isPending}
                                isLoading={updateMutation.isPending}
                                leftIcon={Save}
                                size="lg"
                                className="px-12"
                            >
                                Save Changes
                            </Button>
                        </footer>
                    )}
                </form>
            </div >
        </Card >
    );
};

export default CoreDetailsTab;
