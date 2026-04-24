import { useAuthStore } from '../../store/useAuthStore';
import { Mail, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../store/useAuthStore';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card } from '../ui/BaseUI';
;

/**
 * Modern 2026 RequireVerification Middleware
 * Glassmorphism 2.0, Agentic Ready, Framer Motion
 */

const RequireVerification = ({ children }) => {
    const { user, logout } = useAuthStore();
    const [isResending, setIsResending] = useState(false);

    if (!user) return children;

    if (user && !user.isEmailVerified && user.role !== 'Admin') {
        const handleResend = async () => {
            setIsResending(true);
            try {
                await api.post('/auth/resend-verification', { email: user.email });
                toast.success('Verification email sent. Please check your inbox.');
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Failed to send email. Please try again.');
            } finally {
                setIsResending(false);
            }
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-[#09090b] p-6 relative overflow-hidden">
                {/* 2026 Ambient Light */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="fixed inset-0 pointer-events-none opacity-[0.02] grayscale bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50" />

                <Card className="max-w-md w-full text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 rounded-[2.5rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-8 mx-auto"
                    >
                        <Mail className="w-10 h-10 text-cyan-400" />
                    </motion.div>

                    <motion.h2 
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-3xl font-black tracking-tighter text-white mb-4"
                    >
                        Verify Identity
                    </motion.h2>

                    <motion.p 
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 font-medium mb-10 leading-relaxed"
                    >
                        Email verification is required for <span className="text-white font-bold">{user.email}</span>. 
                        Please verify your account to gain full access to Klivra.
                    </motion.p>

                    <div className="space-y-4">
                        <Button
                            onClick={handleResend}
                            isLoading={isResending}
                            fullWidth
                            rightIcon={ArrowRight}
                        >
                            Resend Email
                        </Button>

                        <button
                            onClick={() => logout()}
                            className="flex items-center justify-center gap-2 mx-auto text-sm font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors py-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
                            Security: End-to-End Encrypted
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return children;
};

export default RequireVerification;
