import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Calendar, FolderPlus, ArrowRight, ArrowLeft, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../store/useAuthStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
});

const ProjectCreationModal = ({ open, onOpenChange }) => {
    const [step, setStep] = useState(1);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = React.useRef(null);
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset,
        watch,
        setValue,
        trigger,
    } = useForm({
        resolver: zodResolver(projectSchema),
        mode: 'onChange',
        defaultValues: {
            startDate: new Date().toISOString().split('T')[0],
            category: '',
        }
    });

    const createProjectMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/projects', data);
            const project = res.data.data;

            // If a file was selected, upload it now
            if (selectedFile) {
                const formData = new FormData();
                formData.append('coverImage', selectedFile);
                await api.post(`/projects/${project._id}/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            return project;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Project created successfully! 🚀');
            handleClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create project');
        }
    });

    const handleClose = () => {
        reset();
        setStep(1);
        setSelectedFile(null);
        setPreviewUrl(null);
        onOpenChange(false);
    };

    const onSubmit = (data) => {
        createProjectMutation.mutate(data);
    };

    const nextStep = async () => {
        let fieldsToValidate = [];
        if (step === 1) fieldsToValidate = ['name', 'description'];
        if (step === 2) fieldsToValidate = ['category'];

        const isStepValid = await trigger(fieldsToValidate);
        if (isStepValid) setStep(s => s + 1);
        else toast.error('Please fill all required fields correctly');
    };
    const prevStep = () => setStep(s => s - 1);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-3xl shadow-2xl z-[70] overflow-hidden focus:outline-none animate-in zoom-in-95 duration-200">

                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-[var(--border-subtle)]">
                        <motion.div
                            className="h-full bg-emerald-500"
                            initial={{ width: '33.33%' }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <Dialog.Title className="text-xl font-bold text-[var(--text-main)] tracking-tight">
                                    {step === 1 && "Start a New Journey"}
                                    {step === 2 && "The Finer Details"}
                                    {step === 3 && "Timeline & Goal"}
                                </Dialog.Title>
                                <Dialog.Description className="text-sm text-[var(--text-muted)] mt-1">
                                    Step {step} of 3 • {step === 1 ? "Basic Info" : step === 2 ? "Category" : "Timeline"}
                                </Dialog.Description>
                            </div>
                            <Dialog.Close className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] rounded-full transition-all text-white">
                                <X className="w-5 h-5" />
                            </Dialog.Close>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-5"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-semibold text-[var(--text-muted)] ml-1">Project Name</label>
                                            <input
                                                {...register('name')}
                                                placeholder="e.g. Project Orion"
                                                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all"
                                            />
                                            {errors.name && <p className="text-xs text-red-400 ml-1">{errors.name.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-semibold text-[var(--text-muted)] ml-1">Description</label>
                                            <textarea
                                                {...register('description')}
                                                rows={3}
                                                placeholder="What are we building today?"
                                                className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all resize-none"
                                            />
                                            {errors.description && <p className="text-xs text-red-400 ml-1">{errors.description.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-semibold text-[var(--text-muted)] ml-1">Cover Image (Optional)</label>

                                            <div className="flex gap-4">
                                                <div
                                                    onClick={() => fileInputRef.current.click()}
                                                    className="w-24 h-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--border-subtle)] transition-all overflow-hidden relative group"
                                                >
                                                    {previewUrl ? (
                                                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                                    ) : (
                                                        <>
                                                            <Upload className="w-5 h-5 text-[var(--text-muted)] mb-1" />
                                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">File</span>
                                                        </>
                                                    )}
                                                    {previewUrl && (
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Upload className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        {...register('coverImageUrl')}
                                                        placeholder="...or paste image URL"
                                                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-medium text-sm"
                                                    />
                                                    <p className="text-[10px] text-zinc-500 italic ml-1 leading-relaxed">
                                                        Heads up: Files take priority over URLs!
                                                    </p>
                                                </div>
                                            </div>

                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setSelectedFile(file);
                                                        setPreviewUrl(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                            {errors.coverImageUrl && <p className="text-xs text-red-400 ml-1">{errors.coverImageUrl.message}</p>}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-5"
                                    >
                                        <div className="space-y-2">
                                            <label className="text-[13px] font-semibold text-[var(--text-muted)] ml-1">Category</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['Development', 'Design', 'Marketing', 'Research', 'Internal', 'Client'].map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setValue('category', cat, { shouldValidate: true })}
                                                        className={`px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${watch('category') === cat
                                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                                            : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-main)]'
                                                            }`}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                            <input type="hidden" {...register('category')} />
                                            {errors.category && <p className="text-xs text-red-400 ml-1">{errors.category.message}</p>}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-5"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[13px] font-semibold text-[var(--text-muted)] ml-1">Start Date</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                                    <input
                                                        type="date"
                                                        {...register('startDate')}
                                                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl pl-11 pr-4 py-3 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-bold"
                                                    />
                                                </div>
                                                {errors.startDate && <p className="text-xs text-red-400 ml-1">{errors.startDate.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[13px] font-semibold text-[var(--text-muted)] ml-1">End Date</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                                    <input
                                                        type="date"
                                                        {...register('endDate')}
                                                        className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl pl-11 pr-4 py-3 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all font-bold"
                                                    />
                                                </div>
                                                {errors.endDate && <p className="text-xs text-red-400 ml-1">{errors.endDate.message}</p>}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center gap-3 pt-4">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-main)] font-semibold hover:bg-[var(--border-subtle)] transition-all outline-none"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                )}

                                {step < 3 ? (
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--text-main)] text-[var(--bg-base)] font-bold hover:opacity-90 transition-all outline-none shadow-lg"
                                    >
                                        Continue
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={createProjectMutation.isPending || !isValid}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 text-zinc-50 font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none shadow-lg shadow-emerald-500/20"
                                    >
                                        {createProjectMutation.isPending ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Launch Project
                                                <FolderPlus className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root >
    );
};

export default ProjectCreationModal;
