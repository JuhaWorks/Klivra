import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Mail, Lock, ShieldCheck, ShieldAlert,
    Key, Zap, Info, ChevronRight, Eye, EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, api } from '../../store/useAuthStore';
import EmailUpdateModal from './EmailUpdateModal';
import Button from '../ui/Button';
import Card from '../ui/Card';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const securitySchema = z
    .object({
        currentPassword: z.string().optional(),
        newPassword: z.string().optional(),
        confirmNewPassword: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (!data.newPassword) return;

        if (data.newPassword.length < 8)
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Minimum 8 characters', path: ['newPassword'] });

        if (!/[0-9]/.test(data.newPassword))
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one number required', path: ['newPassword'] });

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(data.newPassword))
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one special character required', path: ['newPassword'] });

        if (!data.currentPassword)
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current password required', path: ['currentPassword'] });

        if (data.newPassword !== data.confirmNewPassword)
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords do not match', path: ['confirmNewPassword'] });
    });

// ---------------------------------------------------------------------------
// Micro-components
// ---------------------------------------------------------------------------

function SectionDivider({ accent = false }) {
    return (
        <div className="relative h-px bg-white/5">
            {accent && <div className="absolute left-0 top-0 w-10 h-px bg-indigo-500" />}
        </div>
    );
}

function SectionHead({ icon: Icon, label, action }) {
    return (
        <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/[0.03] border border-white/5">
                    <Icon size={13} className="text-white/30" />
                </div>
                <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/40 font-semibold">
                    {label}
                </span>
            </div>
            {action}
        </div>
    );
}

function FieldLabel({ children }) {
    return (
        <label className="block font-mono text-[9px] tracking-[0.16em] uppercase text-white/30 font-semibold mb-2">
            {children}
        </label>
    );
}

function FieldError({ message }) {
    return (
        <AnimatePresence>
            {message && (
                <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="font-mono text-[9px] tracking-[0.12em] uppercase text-rose-500 font-semibold mt-1.5"
                >
                    {message}
                </motion.p>
            )}
        </AnimatePresence>
    );
}

function PasswordInput({ error, iconActive = false, ...props }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative group">
            <Lock
                size={13}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors
          ${iconActive ? 'text-emerald-400' : 'text-white/15'}`}
            />
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                placeholder="••••••••"
                className={`w-full bg-white/[0.03] border rounded-lg pl-9 pr-9 py-2.5 text-white text-sm font-medium
          placeholder:text-white/15 outline-none transition-all
          focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40
          ${error ? 'border-rose-500/50' : 'border-white/5 hover:border-white/10'}`}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
            >
                {visible ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
        </div>
    );
}

function StrengthBar({ password = '' }) {
    const score = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    ].filter(Boolean).length;

    const colors = ['', 'bg-rose-500', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const textColors = ['', 'text-rose-500', 'text-amber-400', 'text-lime-400', 'text-emerald-400'];

    if (!password) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
        >
            <div className="flex gap-1 mb-1.5">
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        className={`flex-1 h-0.5 rounded-full transition-all duration-300
              ${i <= score ? colors[score] : 'bg-white/8'}`}
                    />
                ))}
            </div>
            <span className={`font-mono text-[9px] tracking-[0.12em] uppercase font-semibold ${textColors[score]}`}>
                {labels[score]}
            </span>
        </motion.div>
    );
}

// ---------------------------------------------------------------------------
// SecurityTab
// ---------------------------------------------------------------------------

export default function SecurityTab() {
    const { user } = useAuthStore();
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(securitySchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
        },
    });

    const newPasswordValue = watch('newPassword');

    const securityMutation = useMutation({
        mutationFn: async (data) => {
            const res = await api.put('/settings/security', {
                currentPassword: data.currentPassword || undefined,
                newPassword: data.newPassword || undefined,
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.message) {
                toast.success('Security settings updated.');
                reset(v => ({ ...v, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
                useAuthStore.setState(s => ({
                    user: { ...s.user, email: data.email || s.user.email },
                }));
            }
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Update failed.'),
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-2"
        >

            {/* ── Page header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pb-7 mb-1 border-b border-white/5">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Security</h2>
                    <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/30 mt-1">
                        Password &amp; Access Management
                    </p>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-emerald-400 font-semibold">
                        Protected
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit(d => securityMutation.mutate(d))} className="flex flex-col gap-2">

                {/* ── Email ───────────────────────────────────────────────────────── */}
                <div className="bg-white/[0.025] border border-white/5 rounded-xl overflow-hidden">
                    <SectionHead
                        icon={Mail}
                        label="Email Address"
                        action={
                            <button
                                type="button"
                                onClick={() => setIsEmailModalOpen(true)}
                                className="font-mono text-[9px] tracking-[0.14em] uppercase font-semibold text-indigo-400
                  bg-indigo-500/10 border border-indigo-500/20 rounded-md px-2.5 py-1.5
                  hover:bg-indigo-500/20 transition-colors cursor-pointer"
                            >
                                Change
                            </button>
                        }
                    />
                    <SectionDivider />

                    <div className="px-8 py-6 space-y-3">
                        <div className="relative">
                            <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/15 pointer-events-none" />
                            <input
                                type="email"
                                disabled
                                value={user?.email || ''}
                                className="w-full bg-white/[0.02] border border-white/5 rounded-lg pl-9 pr-4 py-2.5
                  text-white/40 text-sm cursor-not-allowed"
                            />
                        </div>

                        <AnimatePresence>
                            {user?.pendingNewEmail && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-3 px-3.5 py-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg"
                                >
                                    <Zap size={13} className="text-amber-400 shrink-0" />
                                    <div>
                                        <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-amber-400 font-semibold">
                                            Verification pending
                                        </p>
                                        <p className="text-[11px] text-white/30 mt-0.5">
                                            Check {user.pendingNewEmail}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Password ────────────────────────────────────────────────────── */}
                <div className="bg-white/[0.025] border border-white/5 rounded-xl overflow-hidden">
                    <SectionHead icon={Key} label="Change Password" />
                    <SectionDivider accent />

                    <div className="px-8 py-6 space-y-5">

                        {/* Current */}
                        <div>
                            <FieldLabel>Current Password</FieldLabel>
                            <PasswordInput {...register('currentPassword')} error={errors.currentPassword?.message} />
                            <FieldError message={errors.currentPassword?.message} />
                        </div>

                        {/* New + Confirm grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <FieldLabel>New Password</FieldLabel>
                                <PasswordInput
                                    {...register('newPassword')}
                                    error={errors.newPassword?.message}
                                    iconActive={!!newPasswordValue}
                                />
                                <AnimatePresence>
                                    {newPasswordValue && <StrengthBar password={newPasswordValue} />}
                                </AnimatePresence>
                                <FieldError message={errors.newPassword?.message} />
                            </div>

                            <div>
                                <FieldLabel>Confirm Password</FieldLabel>
                                <PasswordInput
                                    {...register('confirmNewPassword')}
                                    error={errors.confirmNewPassword?.message}
                                />
                                <FieldError message={errors.confirmNewPassword?.message} />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <SectionDivider />
                    <div className="flex items-center justify-between px-8 py-4 bg-black/10 gap-4">
                        <div className="flex items-center gap-2">
                            <Info size={12} className="text-white/10 shrink-0" />
                            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-white/15">
                                Current password required to update credentials
                            </span>
                        </div>

                        <Button
                            type="submit"
                            isLoading={securityMutation.isPending}
                            disabled={securityMutation.isPending}
                            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold tracking-wide shrink-0"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>

            {/* ── MFA row ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-5 bg-white/[0.025] border border-white/5 rounded-xl
        cursor-pointer hover:border-white/10 transition-colors group">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/5
            group-hover:bg-white/[0.07] transition-colors shrink-0">
                        <ShieldAlert size={15} className="text-white/25 group-hover:text-amber-400/60 transition-colors" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">Multi-Factor Authentication</p>
                        <p className="text-[11px] text-white/30 mt-0.5">Add an extra layer of protection to your account</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-white/25 group-hover:text-white/50 transition-colors">
                        Configure
                    </span>
                    <ChevronRight size={13} className="text-white/25 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>

            <EmailUpdateModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} />
        </motion.div>
    );
}