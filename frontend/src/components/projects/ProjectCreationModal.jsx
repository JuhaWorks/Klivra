import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Calendar, FolderPlus, ArrowRight, ArrowLeft, Loader2, Upload, Activity, Target, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../store/useAuthStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Input } from '../ui/BaseUI';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


const projectSchema = z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
    description: z.string().min(5, 'Description must be at least 5 characters').max(500),
    category: z.string().min(2, 'Please select or enter a category'),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid start date' }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Invalid end date' }),
    coverImageUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
    isPinned: z.boolean().default(false),
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
            isPinned: false,
        }
    });

    const createProjectMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/projects', data);
            const project = res.data.data;

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
            toast.success('Project created successfully.');
            handleClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to create project. Please try again.');
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
        if (isStepValid) {
            setStep(s => s + 1);
        } else {
            toast.error('Please fix the errors before proceeding.');
        }
    };
    
    const prevStep = () => setStep(s => s - 1);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] animate-in fade-in duration-300" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto glass-2 border-white/10 bg-[#09090b]/98 rounded-[2.5rem] shadow-2xl focus:outline-none animate-in zoom-in-95 duration-200 scrollbar-thin z-[70]">
                    
                    {/* Header with Visual Indicator */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <motion.div
                            className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                            initial={{ width: '33.33%' }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    <div className="p-10">
                        <header className="flex items-center justify-between mb-10">
                            <div>
                                <Dialog.Title className="text-2xl font-black text-white tracking-tighter">
                                    {step === 1 && "Project Details"}
                                    {step === 2 && "Category Selection"}
                                    {step === 3 && "Timeline Planning"}
                                </Dialog.Title>
                                <Dialog.Description className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-1">
                                    New Project Setup • Step {step} of 3
                                </Dialog.Description>
                            </div>
                            <Dialog.Close asChild>
                                <button className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all outline-none">
                                    <X className="w-5 h-5" />
                                </button>
                            </Dialog.Close>
                        </header>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <Input
                                            label="Project Name"
                                            placeholder="e.g. Q3 Roadmap"
                                            error={errors.name?.message}
                                            {...register('name')}
                                        />
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Project Description</label>
                                            <textarea
                                                {...register('description')}
                                                rows={3}
                                                placeholder="Describe the project goals and scope..."
                                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500/30 transition-all resize-none font-medium text-sm"
                                            />
                                            {errors.description && <p className="text-xs text-red-400 ml-1 font-bold">{errors.description.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Project Cover Image</label>
                                            <div className="flex gap-4">
                                                <div
                                                    onClick={() => fileInputRef.current.click()}
                                                    className="w-24 h-24 rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-all overflow-hidden relative group shrink-0"
                                                >
                                                    {previewUrl ? (
                                                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-gray-500 mb-1" />
                                                            <span className="text-[9px] font-black text-gray-600 uppercase">Upload</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <Input
                                                        placeholder="...or image URL"
                                                        error={errors.coverImageUrl?.message}
                                                        {...register('coverImageUrl')}
                                                    />
                                                    <p className="text-[10px] text-gray-700 italic font-medium leading-relaxed">
                                                        Note: Local file uploads take precedence over URL links.
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
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Project Category</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {['Development', 'Design', 'Marketing', 'Research', 'Internal', 'Client'].map((cat) => (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => setValue('category', cat, { shouldValidate: true })}
                                                        className={twMerge(clsx(
                                                            "px-5 py-4 rounded-2xl border text-sm font-black transition-all",
                                                            watch('category') === cat
                                                                ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                                                                : "bg-white/5 border-white/5 text-gray-500 hover:border-white/10 hover:text-white"
                                                        ))}
                                                    >
                                                        {cat}
                                                    </button>
                                                ))}
                                            </div>
                                            <input type="hidden" {...register('category')} />
                                            {errors.category && <p className="text-xs text-red-400 ml-1 font-bold">{errors.category.message}</p>}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                id="startDate"
                                                label="Start Date"
                                                type="date"
                                                leftIcon={Calendar}
                                                error={errors.startDate?.message}
                                                {...register('startDate')}
                                            />
                                            <Input
                                                id="endDate"
                                                label="End Date"
                                                type="date"
                                                leftIcon={Target}
                                                error={errors.endDate?.message}
                                                {...register('endDate')}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <Pin className={twMerge("w-4 h-4", watch('isPinned') ? "text-theme fill-current" : "text-gray-500")} />
                                                <span className="text-sm font-bold text-gray-300">Pin to dashboard?</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('isPinned', true)}
                                                    className={twMerge(
                                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                        watch('isPinned') ? "bg-theme text-black" : "bg-white/5 text-tertiary hover:bg-white/10"
                                                    )}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('isPinned', false)}
                                                    className={twMerge(
                                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                        !watch('isPinned') ? "bg-white/20 text-white" : "bg-white/5 text-tertiary hover:bg-white/10"
                                                    )}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <footer className="flex items-center gap-4 pt-6">
                                {step > 1 && (
                                    <Button
                                        variant="secondary"
                                        onClick={prevStep}
                                        leftIcon={ArrowLeft}
                                        className="px-6"
                                    />
                                )}

                                <Button
                                    type={step === 3 ? "submit" : "button"}
                                    onClick={step < 3 ? nextStep : undefined}
                                    isLoading={createProjectMutation.isPending}
                                    fullWidth
                                    rightIcon={step < 3 ? ArrowRight : FolderPlus}
                                >
                                    {step === 3 ? "Create Project" : "Next Step"}
                                </Button>
                            </footer>
                        </form>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ProjectCreationModal;
