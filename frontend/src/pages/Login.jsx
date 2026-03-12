import React, { useEffect, useState, useOptimistic, useTransition, useActionState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, Github, Chrome, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import AuthLayout, { API_BASE } from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const schema = z.object({
    email: z.string().min(1, 'Required').email('Invalid email'),
    password: z.string().min(8, 'Min 8 characters'),
    remember: z.boolean().optional(),
});

/**
 * Modern 2026 Login Page
 * React 19 standards, Glassmorphism 2.0, Agentic Ready
 */

const Login = () => {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError, user } = useAuthStore();
    const [showPw, setShowPw] = useState(false);
    
    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
        mode: 'onChange',
        defaultValues: { remember: false },
    });

    const remember = watch('remember');
    const [optimisticRemember, setOptimisticRemember] = useOptimistic(remember);

    useEffect(() => {
        if (user) navigate('/', { replace: true });
    }, [user, navigate]);

    useEffect(() => {
        clearError();
    }, [clearError]);

    const onSubmit = async (data) => {
        clearError();
        try {
            await login(data.email, data.password, data.remember);
            navigate('/');
        } catch (err) {
            // Handle specific errors (e.g. reactivation handled in parent or store)
            console.error('Login failed:', err);
        }
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-[400px]">
                <header className="mb-10 lg:text-left text-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:hidden flex justify-center mb-6"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">K</span>
                        </div>
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold tracking-tighter text-white mb-2"
                    >
                        Welcome Back
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-500 font-medium"
                    >
                        Don't have an account?{' '}
                        <Link to="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                            Create Workspace
                        </Link>
                    </motion.p>
                </header>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-2 p-7 border-white/5 bg-white/[0.03]"
                >
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                            id="email"
                            label="Email Address"
                            type="email"
                            placeholder="name@company.com"
                            leftIcon={Mail}
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <Input
                            id="password"
                            label="Password"
                            type={showPw ? 'text' : 'password'}
                            placeholder="Enter your password"
                            leftIcon={Lock}
                            error={errors.password?.message}
                            {...register('password')}
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 group cursor-pointer">
                                <div className="relative w-5 h-5">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        {...register('remember')}
                                    />
                                    <div className={twMerge(clsx(
                                        "absolute inset-0 rounded-lg border transition-all duration-300",
                                        "border-white/10 bg-white/5 peer-checked:bg-cyan-500 peer-checked:border-cyan-500",
                                        "group-hover:border-cyan-500/50"
                                    ))} />
                                    <Check className="absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-sm font-semibold text-gray-400 group-hover:text-gray-300 transition-colors">
                                    Remember me
                                </span>
                            </label>
                            
                            <button type="button" className="text-sm font-semibold text-gray-500 hover:text-cyan-400 transition-colors">
                                Reset Password
                            </button>
                        </div>

                        <Button 
                            type="submit" 
                            fullWidth 
                            isLoading={isLoading} 
                            rightIcon={ArrowRight}
                        >
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                                or continue with
                            </span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="secondary"
                                className="rounded-2xl"
                                leftIcon={Chrome}
                                onClick={() => window.location.href = `${API_BASE}/api/auth/google`}
                            >
                                Google
                            </Button>
                            <Button
                                variant="secondary"
                                className="rounded-2xl"
                                leftIcon={Github}
                                onClick={() => window.location.href = `${API_BASE}/api/auth/github`}
                            >
                                GitHub
                            </Button>
                        </div>
                    </div>
                </motion.div>

                <footer className="mt-8 text-center">
                    <p className="text-xs font-medium text-gray-600">
                        Secure Access Provided by Klivra<br />
                        © 2026 Klivra Technologies
                    </p>
                </footer>
            </div>
        </AuthLayout>
    );
};

export default Login;