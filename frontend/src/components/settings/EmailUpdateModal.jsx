import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Mail, ShieldCheck, X, CheckCircle2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GlassSurface from '../ui/GlassSurface';

const STEPS = ['Verify identity', 'New email', 'Done'];

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar({ current }) {
    return (
        <div className="flex items-center gap-2 mb-7">
            {STEPS.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <React.Fragment key={i}>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className={twMerge(clsx(
                                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300',
                                done ? 'bg-theme text-primary shadow-lg shadow-theme/20' :
                                    active ? 'bg-theme/10 text-theme ring-1 ring-theme/30' :
                                        'bg-sunken text-tertiary'
                            ))}>
                                {done ? '✓' : i + 1}
                            </div>
                            <span className={twMerge(clsx(
                                'text-[10px] uppercase tracking-widest font-black transition-colors',
                                active ? 'text-primary' : 'text-tertiary'
                            ))}>
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className="flex-1 h-[2px] bg-default relative overflow-hidden rounded-full">
                                <div
                                    className="absolute inset-y-0 left-0 bg-theme transition-all duration-500"
                                    style={{ width: done ? '100%' : '0%' }}
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── OTP input group ──────────────────────────────────────────────────────────

function OtpInput({ otp, setOtp, inputRefs }) {
    const handleChange = (e, index) => {
        const val = e.target.value;
        if (!/^\d*$/.test(val)) return;
        const next = [...otp];
        next[index] = val.slice(-1);
        setOtp(next);
        if (val && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0)
            inputRefs.current[index - 1]?.focus();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
        if (!digits.length) return;
        const next = [...otp];
        digits.forEach((d, i) => { if (i < 6) next[i] = d; });
        setOtp(next);
        inputRefs.current[Math.min(digits.length, 5)]?.focus();
    };

    return (
        <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
            {otp.map((digit, i) => (
                <input
                    key={i}
                    ref={el => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={i === 0}
                    onChange={e => handleChange(e, i)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    className={twMerge(clsx(
                        'w-12 h-14 text-center text-xl font-black rounded-2xl border transition-all outline-none',
                        'bg-sunken border-default',
                        digit
                            ? 'border-theme text-primary ring-4 ring-theme/10'
                            : 'text-primary',
                        'focus:border-theme focus:ring-4 focus:ring-theme/15',
                    ))}
                />
            ))}
        </div>
    );
}

// ─── Slide variants ───────────────────────────────────────────────────────────

const slide = (dir) => ({
    initial: { opacity: 0, x: dir * 18 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, x: dir * -12, transition: { duration: 0.18, ease: 'easeIn' } },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmailUpdateModal({ isOpen, onClose }) {
    const { user } = useAuthStore();

    const [step, setStep] = useState(0);
    const [otp, setOtp] = useState(Array(6).fill(''));
    const [newEmail, setNewEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [direction, setDirection] = useState(1);

    const inputRefs = useRef([]);

    // Request OTP on open
    useEffect(() => {
        if (!isOpen) return;
        setStep(0); setOtp(Array(6).fill('')); setNewEmail(''); setDirection(1);

        api.post('/users/email/request-otp')
            .then(() => setStep(1))
            .catch(err => {
                toast.error(err.response?.data?.message || 'Could not send verification code.');
                onClose();
            });
    }, [isOpen, onClose]);

    const advance = () => { setDirection(1); };
    const back = () => { setDirection(-1); };

    const handleOtpSubmit = (e) => {
        e?.preventDefault();
        if (otp.join('').length !== 6) return;
        advance();
        setStep(2);
    };

    const handleFinalSubmit = async (e) => {
        e?.preventDefault();
        if (!newEmail || !newEmail.includes('@')) {
            toast.error('Please enter a valid email address.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/users/email/verify-otp', { otp: otp.join(''), newEmail });
            advance();
            setStep(3);
        } catch (err) {
            const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
            toast.error(msg);
            if (msg.toLowerCase().includes('otp')) {
                back(); setStep(1);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const canClose = step !== 0 && step !== 3 && !submitting;
    const stepBarIndex = step === 0 ? 0 : step === 1 ? 0 : step === 2 ? 1 : 2;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => canClose && onClose()}>

                {/* Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="duration-200 ease-out" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="duration-150 ease-in" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        enterFrom="opacity-0 scale-95 translate-y-4"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="duration-200 ease-in"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-default shadow-2xl">
                            
                            {/* Glass Background */}
                            <div className="absolute inset-0 z-0">
                                <GlassSurface width="100%" height="100%" borderRadius="2.5rem" backgroundOpacity={0.05} opacity={1} blur={30} />
                            </div>

                            {/* Emerald top accent */}
                            <div className="h-1 bg-theme w-full relative z-10" />

                            <div className="px-8 py-8 relative z-10">

                                {/* Header row */}
                                <div className="flex items-start justify-between mb-8">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <div className="p-1 rounded-md bg-theme/10">
                                                <ShieldCheck className="w-3.5 h-3.5 text-theme" />
                                            </div>
                                            <span className="text-[10px] font-black text-theme uppercase tracking-[0.2em]">
                                                Secure
                                            </span>
                                        </div>
                                        <Dialog.Title className="text-xl font-black text-primary tracking-tight">
                                            Update email address
                                        </Dialog.Title>
                                    </div>
                                    {canClose && (
                                        <button
                                            onClick={onClose}
                                            className="p-2 rounded-xl text-tertiary hover:text-primary bg-sunken hover:bg-default transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Step bar (steps 1–2) */}
                                {step >= 1 && step < 3 && (
                                    <StepBar current={stepBarIndex} />
                                )}

                                {/* Step panels */}
                                <div className="overflow-hidden">
                                    <AnimatePresence mode="wait" custom={direction}>

                                        {/* Step 0 — Loading */}
                                        {step === 0 && (
                                            <motion.div key="init" {...slide(1)} className="flex flex-col items-center py-12 gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-theme/10 border border-theme/20 flex items-center justify-center">
                                                    <Loader2 className="w-6 h-6 text-theme animate-spin" />
                                                </div>
                                                <p className="text-sm font-medium text-tertiary">
                                                    Sending verification code…
                                                </p>
                                            </motion.div>
                                        )}

                                        {/* Step 1 — OTP */}
                                        {step === 1 && (
                                            <motion.div key="otp" {...slide(direction)} className="space-y-6">
                                                <div className="bg-sunken border border-default rounded-2xl px-5 py-4">
                                                    <p className="text-sm text-secondary font-medium leading-relaxed">
                                                        We sent a 6-digit code to{' '}
                                                        <span className="font-black text-primary">{user?.email}</span>.
                                                        Enter it below to continue.
                                                    </p>
                                                </div>
 
                                                <OtpInput otp={otp} setOtp={setOtp} inputRefs={inputRefs} />
 
                                                <button
                                                    onClick={handleOtpSubmit}
                                                    disabled={otp.join('').length !== 6}
                                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-black bg-theme text-primary hover:bg-theme/90 shadow-lg shadow-theme/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                                                >
                                                    Continue
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
 
                                                <p className="text-center text-[11px] text-tertiary font-bold uppercase tracking-widest">
                                                    Didn't receive it?{' '}
                                                    <button
                                                        className="text-theme hover:underline"
                                                        onClick={() => api.post('/users/email/request-otp').catch(() => { })}
                                                    >
                                                        Resend code
                                                    </button>
                                                </p>
                                            </motion.div>
                                        )}

                                        {/* Step 2 — New email */}
                                        {step === 2 && (
                                            <motion.form key="email" {...slide(direction)} onSubmit={handleFinalSubmit} className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-tertiary uppercase tracking-[0.2em] ml-1">
                                                        New email address
                                                    </label>
                                                    <div className={twMerge(clsx(
                                                        'flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all',
                                                        'bg-sunken border-default focus-within:border-theme focus-within:ring-4 focus-within:ring-theme/15',
                                                    ))}>
                                                        <Mail className="w-4 h-4 text-tertiary shrink-0" />
                                                        <input
                                                            type="email"
                                                            autoFocus
                                                            required
                                                            value={newEmail}
                                                            onChange={e => setNewEmail(e.target.value)}
                                                            placeholder="you@example.com"
                                                            className="w-full bg-transparent text-sm font-bold text-primary placeholder-tertiary outline-none"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-tertiary font-medium ml-1">
                                                        A confirmation link will be sent to this address.
                                                    </p>
                                                </div>

                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => { back(); setStep(1); }}
                                                        className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-sm font-bold text-secondary border border-default bg-sunken hover:bg-default active:scale-[0.98] transition-all"
                                                    >
                                                        <ArrowLeft className="w-3.5 h-3.5" />
                                                        Back
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={submitting || !newEmail}
                                                        className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-sm font-black bg-theme text-primary hover:bg-theme/90 shadow-lg shadow-theme/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                                                    >
                                                        {submitting
                                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                                                            : <>Update email <ArrowRight className="w-4 h-4" /></>
                                                        }
                                                    </button>
                                                </div>
                                            </motion.form>
                                        )}

                                        {/* Step 3 — Success */}
                                        {step === 3 && (
                                            <motion.div
                                                key="success"
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
                                                className="flex flex-col items-center text-center py-10 gap-6"
                                            >
                                                <motion.div
                                                    initial={{ scale: 0.4, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.05 }}
                                                    className="w-16 h-16 rounded-[2rem] bg-theme/10 border border-theme/20 shadow-xl shadow-theme/10 flex items-center justify-center"
                                                >
                                                    <CheckCircle2 className="w-8 h-8 text-theme" />
                                                </motion.div>
 
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-black text-primary tracking-tight">
                                                        Check your inbox
                                                    </h3>
                                                    <p className="text-sm text-secondary font-medium leading-relaxed max-w-[280px]">
                                                        A confirmation link has been sent to{' '}
                                                        <span className="font-black text-primary">{newEmail}</span>.
                                                        Click it to complete the change.
                                                    </p>
                                                </div>
 
                                                <button
                                                    onClick={onClose}
                                                    className="mt-2 w-full py-4 px-6 rounded-2xl text-sm font-black text-secondary border border-default bg-sunken hover:bg-default active:scale-[0.98] transition-all shadow-sm"
                                                >
                                                    Done
                                                </button>
                                            </motion.div>
                                        )}

                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Footer */}
                            {step < 3 && (
                                <div className="px-7 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                        Secured with end-to-end encryption
                                    </span>
                                </div>
                            )}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}