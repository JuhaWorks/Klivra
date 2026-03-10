import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Mail, ShieldCheck, ArrowRight, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, useAuthStore } from '../../store/useAuthStore';

export default function EmailUpdateModal({ isOpen, onClose }) {
    const { user } = useAuthStore();
    const [step, setStep] = useState(0); // 0: Loading OTP, 1: OTP Entry, 2: New Email, 3: Success
    const [otp, setOtp] = useState(Array(6).fill(''));
    const [newEmail, setNewEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const inputRefs = useRef([]);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setOtp(Array(6).fill(''));
            setNewEmail('');

            // Request OTP when modal opens
            api.post('/users/email/request-otp')
                .then(() => setStep(1))
                .catch(err => {
                    toast.error(err.response?.data?.message || 'Failed to send OTP. Try again later.');
                    onClose();
                });
        }
    }, [isOpen, onClose]);

    const handleOtpChange = (e, index) => {
        const value = e.target.value;
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
        if (!pastedData.length) return;

        const newOtp = [...otp];
        pastedData.forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setOtp(newOtp);
        const focusIndex = Math.min(pastedData.length, 5);
        inputRefs.current[focusIndex].focus();
    };

    const handleOtpSubmit = (e) => {
        e.preventDefault();
        if (otp.join('').length === 6) {
            setStep(2);
        }
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        if (!newEmail || !newEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users/email/verify-otp', {
                otp: otp.join(''),
                newEmail
            });
            setStep(3);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Verification failed');
            if (error.response?.data?.message?.toLowerCase().includes('otp')) {
                setStep(1); // Go back to OTP if it was wrong
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50 font-sans" onClose={() => { if (step !== 0 && !isSubmitting) onClose(); }}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#08081e] border border-white/[0.08] p-8 text-left align-middle shadow-[0_32px_100px_rgba(0,0,0,0.6)] shadow-emerald-500/10 transition-all text-[#eeeeff]">
                                {step !== 0 && step !== 3 && (
                                    <button
                                        onClick={onClose}
                                        className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}

                                {/* Step 0: Loading */}
                                {step === 0 && (
                                    <div className="flex flex-col items-center justify-center py-6">
                                        <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mb-4"></div>
                                        <p className="text-gray-400 font-medium">Sending verification code...</p>
                                    </div>
                                )}

                                {/* Step 1: OTP Entry */}
                                {step === 1 && (
                                    <form onSubmit={handleOtpSubmit} className="flex flex-col items-center animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                                            <ShieldCheck className="w-7 h-7 text-emerald-400" />
                                        </div>
                                        <Dialog.Title as="h3" className="text-xl font-bold text-white mb-2">
                                            Verify Identity
                                        </Dialog.Title>
                                        <p className="text-sm text-gray-400 mb-8 text-center px-4">
                                            We sent a 6-digit code to <span className="text-white font-medium">{user?.email}</span>
                                        </p>

                                        <div className="flex justify-center gap-3 w-full mb-8" onPaste={handlePaste}>
                                            {otp.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={(el) => (inputRefs.current[index] = el)}
                                                    type="text"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(e, index)}
                                                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                                    className="w-12 h-14 text-center text-xl font-bold bg-white/[0.03] border border-white/[0.1] rounded-xl text-white focus:bg-white/[0.05] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-inner shadow-black/20"
                                                />
                                            ))}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={otp.join('').length !== 6}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_rgba(123,82,255,0.25)] active:scale-[0.98]"
                                        >
                                            Continue <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </form>
                                )}

                                {/* Step 2: New Email Entry */}
                                {step === 2 && (
                                    <form onSubmit={handleFinalSubmit} className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                                            <Mail className="w-7 h-7 text-emerald-400" />
                                        </div>
                                        <Dialog.Title as="h3" className="text-xl font-bold text-white mb-2 text-center">
                                            New Email Address
                                        </Dialog.Title>
                                        <p className="text-sm text-gray-400 mb-8 text-center">
                                            Enter the new email address you'd like to use.
                                        </p>

                                        <div className="space-y-2 mb-8">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Email</label>
                                            <input
                                                type="email"
                                                autoFocus
                                                required
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                placeholder="new@example.com"
                                                className="w-full pl-4 pr-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl text-white focus:bg-white/[0.05] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !newEmail}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_rgba(123,82,255,0.25)] active:scale-[0.98]"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            ) : (
                                                'Send Confirmation Link'
                                            )}
                                        </button>
                                    </form>
                                )}

                                {/* Step 3: Success */}
                                {step === 3 && (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-400 py-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <Dialog.Title as="h3" className="text-xl font-bold text-white mb-3 text-center">
                                            Check your inbox
                                        </Dialog.Title>
                                        <p className="text-sm text-gray-400 mb-8 text-center max-w-[260px]">
                                            We sent a confirmation link to <span className="text-white font-medium">{newEmail}</span>. Please click it to finalize the change.
                                        </p>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 px-4 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white font-bold rounded-xl transition-all"
                                        >
                                            Done
                                        </button>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
