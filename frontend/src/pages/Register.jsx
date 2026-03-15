import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import AuthLayout, { API_BASE } from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import DecryptedText from '../components/ui/DecryptedText';

const schema = z.object({
    name: z.string().min(2, 'At least 2 characters'),
    email: z.string().min(1, 'Required').email('Invalid email'),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
}).refine(d => d.password === d.confirmPassword, { 
    message: 'Passwords do not match', 
    path: ['confirmPassword'] 
});

/**
 * Modern 2026 Register Page
 * React 19 standards, Glassmorphism 2.0, Agentic Ready
 */

const SuccessScreen = () => (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-3xl bg-success/10 border border-success/20 flex items-center justify-center mb-8"
        >
            <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>
        
        <motion.h2 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-black tracking-tighter text-primary mb-4"
        >
            Account Created
        </motion.h2>
        <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-secondary font-medium mb-12"
        >
            Redirecting you to the login page…
        </motion.p>
        
        <div className="w-48 h-1 bg-border-default rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full bg-theme"
            />
        </div>
    </div>
);

const Register = () => {
    const navigate = useNavigate();
    const { register: registerAction, isLoading, error, clearError, user } = useAuthStore();
    const [success, setSuccess] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [animatePw, setAnimatePw] = useState(false);
    
    const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm({
        resolver: zodResolver(schema),
        mode: 'onChange',
    });

    const pw = watch('password');
    const cpw = watch('confirmPassword');

    useEffect(() => {
        if (user) navigate('/', { replace: true });
    }, [user, navigate]);

    useEffect(() => {
        clearError();
    }, [clearError]);

    const onSubmit = async (data) => {
        clearError();
        try {
            await registerAction({ 
                name: data.name, 
                email: data.email, 
                password: data.password, 
                role: 'Developer' 
            });
            setSuccess(true);
            setTimeout(() => { window.location.href = '/login'; }, 1800);
        } catch (err) {
            console.error('Registration failed:', err);
        }
    };

    if (success) return <SuccessScreen />;

    return (
        <AuthLayout reverse={true}>
            <div className="w-full max-w-[420px]">
                <header className="mb-10 lg:text-left text-center">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:hidden flex justify-center mb-6"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-theme flex items-center justify-center">
                            <span className="text-white font-black text-2xl">K</span>
                        </div>
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black tracking-tighter text-primary mb-2"
                    >
                        Create Workspace
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-secondary font-medium"
                    >
                        Already registered?{' '}
                        <Link to="/login" className="text-theme hover:text-theme-lt transition-colors">
                            Sign In
                        </Link>
                    </motion.p>
                </header>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-2 p-8 border-default bg-surface"
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-sm font-medium"
                                >
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Input
                            id="r-name"
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            leftIcon={User}
                            error={errors.name?.message}
                            {...register('name')}
                        />

                        <Input
                            id="r-email"
                            label="Email Address"
                            type="email"
                            placeholder="name@company.com"
                            leftIcon={Mail}
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                id="r-pass"
                                label="Password"
                                type={showPw ? 'text' : 'password'}
                                placeholder="Min 8 characters"
                                leftIcon={Lock}
                                error={errors.password?.message}
                                {...register('password')}
                                overlay={showPw && pw ? (
                                    <DecryptedText
                                        text={pw}
                                        animateOn="none"
                                        trigger={animatePw}
                                        speed={80}
                                        sequential={true}
                                        useOriginalCharsOnly={false}
                                        className="font-mono"
                                        encryptedClassName="font-mono opacity-70"
                                    />
                                ) : null}
                                rightIcon={
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!showPw) {
                                                setAnimatePw(true);
                                                setTimeout(() => setAnimatePw(false), 100);
                                            }
                                            setShowPw(!showPw);
                                        }}
                                        className="p-2 hover:bg-sunken rounded-lg transition-colors text-tertiary hover:text-primary"
                                    >
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                }
                            />

                            <Input
                                id="r-confirm"
                                label="Confirm Password"
                                type={showPw ? 'text' : 'password'}
                                placeholder="••••••••"
                                leftIcon={Lock}
                                error={errors.confirmPassword?.message}
                                {...register('confirmPassword')}
                                overlay={showPw && cpw ? (
                                    <DecryptedText
                                        text={cpw}
                                        animateOn="none"
                                        trigger={animatePw}
                                        speed={80}
                                        sequential={true}
                                        useOriginalCharsOnly={false}
                                        className="font-mono"
                                        encryptedClassName="font-mono opacity-70"
                                    />
                                ) : null}
                            />
                        </div>

                        {/* Password Strength Indicator */}
                        {pw && pw.length > 0 && (
                            <div className="px-1 space-y-2">
                                <div className="flex gap-1.5 h-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div 
                                            key={i} 
                                            className={twMerge(clsx(
                                                "flex-1 rounded-full transition-all duration-500",
                                                i <= (pw.length / 3) ? "bg-theme shadow-theme" : "bg-border-default"
                                            ))}
                                        />
                                    ))}
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">
                                    Strength: <span className="text-theme">{pw.length < 8 ? 'Weak' : 'Strong'}</span>
                                </p>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            fullWidth 
                            isLoading={isLoading} 
                            rightIcon={UserPlus}
                            disabled={!isValid}
                        >
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-border-default" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tertiary">
                                or continue with
                            </span>
                            <div className="flex-1 h-px bg-border-default" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="secondary"
                                leftIcon={Chrome}
                                onClick={() => window.location.href = `${API_BASE}/api/auth/google`}
                            >
                                Google
                            </Button>
                            <Button
                                variant="secondary"
                                leftIcon={Github}
                                onClick={() => window.location.href = `${API_BASE}/api/auth/github`}
                            >
                                GitHub
                            </Button>
                        </div>
                    </div>
                </motion.div>

                <footer className="mt-8 text-center px-4">
                    <p className="text-xs font-medium text-tertiary">
                        Secure Registration Provided by Klivra<br />
                        © 2026 Klivra Technologies
                    </p>
                </footer>
            </div>
        </AuthLayout>
    );
};

export default Register;