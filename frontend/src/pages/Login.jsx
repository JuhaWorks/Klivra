import React, { useEffect, useState, useRef, useOptimistic } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Mail, Lock, User, UserPlus, Eye, EyeOff, LogIn, AlertCircle, ArrowRight, Github, Chrome, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import AuthLayout, { API_BASE } from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import DecryptedText from '../components/ui/DecryptedText';
import BorderGlow from '../components/ui/BorderGlow';
import GlassSurface from '../components/ui/GlassSurface';

// Validation Schemas
const loginSchema = z.object({
    email: z.string().min(1, 'Required').email('Invalid email'),
    password: z.string().min(8, 'Min 8 characters'),
    remember: z.boolean().optional(),
});

const registerSchema = z.object({
    name: z.string().min(2, 'At least 2 characters'),
    email: z.string().min(1, 'Required').email('Invalid email'),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
}).refine(d => d.password === d.confirmPassword, { 
    message: 'Passwords do not match', 
    path: ['confirmPassword'] 
});

const Login = () => {
    const navigate = useNavigate();
    const { login, register: registerAction, isLoading, error, clearError, user } = useAuthStore();
    const [isLogin, setIsLogin] = useState(true);
    const specularRef = useRef(null);

    const [showPw, setShowPw] = useState(false);
    const [animatePw, setAnimatePw] = useState(false);

    // Form Hooks
    const loginForm = useForm({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
        defaultValues: { remember: false }
    });

    const registerForm = useForm({
        resolver: zodResolver(registerSchema),
        mode: 'onChange'
    });

    const loginRemember = loginForm.watch('remember');
    const loginPasswordValue = loginForm.watch('password');
    const registerPasswordValue = registerForm.watch('password');
    const registerConfirmPasswordValue = registerForm.watch('confirmPassword');

    useEffect(() => {
        if (user) navigate('/', { replace: true });
    }, [user, navigate]);

    useEffect(() => {
        clearError();
    }, [isLogin, clearError]);

    // Interactive Mouse Effect
    const handleMouseMove = (e) => {
        if (!specularRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        specularRef.current.style.background = `radial-gradient(
            circle at ${x}px ${y}px,
            rgba(255,255,255,0.15) 0%,
            rgba(255,255,255,0.05) 30%,
            rgba(255,255,255,0) 60%
        )`;
    };

    const handleMouseLeave = () => {
        if (specularRef.current) {
            specularRef.current.style.background = 'none';
        }
    };

    const onLoginSubmit = async (data) => {
        clearError();
        try {
            await login(data.email, data.password, data.remember);
            navigate('/');
        } catch (err) {
            console.error('Login failed:', err);
        }
    };

    const onRegisterSubmit = async (data) => {
        clearError();
        try {
            await registerAction({ 
                name: data.name, 
                email: data.email, 
                password: data.password, 
                role: 'Developer' 
            });
            setIsLogin(true); // Switch to login after successful registration
        } catch (err) {
            console.error('Registration failed:', err);
        }
    };

    return (
        <AuthLayout reverse={!isLogin}>
            <div className="w-full flex flex-col items-center justify-center max-w-[480px] mx-auto pt-10">
                <BorderGlow
                    edgeSensitivity={30}
                    glowColor="40 140 100"
                    backgroundColor="transparent"
                    borderRadius={40}
                    glowRadius={40}
                    glowIntensity={0.6}
                    coneSpread={25}
                    animated={false}
                    colors={['var(--accent-500)', 'var(--accent-400)', 'var(--accent-600)']}
                    fillOpacity={0}
                    className="w-full"
                >
                    <div className="absolute inset-0 z-0">
                        <GlassSurface 
                            width="100%" 
                            height="100%" 
                            borderRadius={40} 
                            className="w-full h-full"
                            displace={0.5} 
                            distortionScale={-60} 
                            backgroundOpacity={0.06}
                            opacity={0.93} 
                        />
                    </div>
                    
                    <div className="relative z-10 p-10 md:p-14 w-full">
                    <AnimatePresence mode="wait">
                        {isLogin ? (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="form-container login active overflow-hidden"
                            >
                                <h3 className="text-4xl font-black tracking-tighter text-primary mb-2">Login</h3>
                                <p className="text-secondary text-sm mb-10 font-medium tracking-tight">Access your workspace and continue building.</p>
                                
                                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                                    <Input
                                        id="login-email"
                                        type="email"
                                        placeholder="Email Address"
                                        leftIcon={Mail}
                                        error={loginForm.formState.errors.email?.message}
                                        {...loginForm.register('email')}
                                    />
                                    
                                    <Input
                                        id="login-password"
                                        type={showPw ? 'text' : 'password'}
                                        placeholder="Password"
                                        leftIcon={Lock}
                                        error={loginForm.formState.errors.password?.message}
                                        {...loginForm.register('password')}
                                        overlay={showPw && loginPasswordValue ? (
                                            <DecryptedText
                                                text={loginPasswordValue}
                                                animateOn="none"
                                                trigger={animatePw}
                                                speed={80}
                                                sequential={true}
                                                useOriginalCharsOnly={false}
                                                className="font-mono text-primary"
                                                parentClassName="font-mono"
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
                                                className="p-2 hover:bg-surface rounded-lg transition-all text-tertiary hover:text-primary"
                                            >
                                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        }
                                    />

                                    <div className="flex items-center justify-between mt-2 mb-4">
                                        <label className="flex items-center gap-3 group cursor-pointer">
                                            <div className="relative w-5 h-5">
                                                <input 
                                                    type="checkbox" 
                                                    className="peer sr-only"
                                                    {...loginForm.register('remember')}
                                                />
                                                <div className={twMerge(clsx(
                                                    "absolute inset-0 rounded-md border transition-all duration-300",
                                                    "border-default bg-sunken peer-checked:bg-theme peer-checked:border-theme",
                                                ))} />
                                                <Check className="absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">
                                                Remember me
                                            </span>
                                        </label>
                                        <button type="button" className="text-sm font-medium text-tertiary hover:text-primary transition-colors">
                                            Reset Password
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-xs font-medium">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <Button 
                                        type="submit" 
                                        fullWidth 
                                        isLoading={isLoading} 
                                        rightIcon={ArrowRight}
                                        className="mt-6"
                                    >
                                        Sign In
                                    </Button>
                                </form>
                                <p className="form-switch mt-10 text-center text-tertiary text-sm font-medium">
                                    Don't have an account?{' '}
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setIsLogin(false); }}
                                        className="text-primary hover:underline transition-all font-bold"
                                    >
                                        Register
                                    </button>
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="register"
                                initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                className="form-container register active overflow-hidden"
                            >
                                <h3 className="text-4xl font-black tracking-tighter text-primary mb-2">Register</h3>
                                <p className="text-secondary text-sm mb-10 font-medium tracking-tight">Join our workspace and start managing projects like a pro.</p>
                                
                                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                                    <Input
                                        id="register-name"
                                        type="text"
                                        placeholder="Full Name"
                                        leftIcon={User}
                                        error={registerForm.formState.errors.name?.message}
                                        {...registerForm.register('name')}
                                    />
                                    
                                    <Input
                                        id="register-email"
                                        type="email"
                                        placeholder="Email Address"
                                        leftIcon={Mail}
                                        error={registerForm.formState.errors.email?.message}
                                        {...registerForm.register('email')}
                                    />
                                    
                                    <Input
                                        id="register-password"
                                        type={showPw ? 'text' : 'password'}
                                        placeholder="Password"
                                        leftIcon={Lock}
                                        error={registerForm.formState.errors.password?.message}
                                        {...registerForm.register('password')}
                                        overlay={showPw && registerPasswordValue ? (
                                            <DecryptedText
                                                text={registerPasswordValue}
                                                animateOn="none"
                                                trigger={animatePw}
                                                speed={80}
                                                sequential={true}
                                                useOriginalCharsOnly={false}
                                                className="font-mono text-primary"
                                                parentClassName="font-mono"
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
                                                className="p-2 hover:bg-surface rounded-lg transition-all text-tertiary hover:text-primary"
                                            >
                                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        }
                                    />
                                    
                                    <Input
                                        id="register-confirmPassword"
                                        type={showPw ? 'text' : 'password'}
                                        placeholder="Confirm Password"
                                        leftIcon={Lock}
                                        error={registerForm.formState.errors.confirmPassword?.message}
                                        {...registerForm.register('confirmPassword')}
                                        overlay={showPw && registerConfirmPasswordValue ? (
                                            <DecryptedText
                                                text={registerConfirmPasswordValue}
                                                animateOn="none"
                                                trigger={animatePw}
                                                speed={80}
                                                sequential={true}
                                                useOriginalCharsOnly={false}
                                                className="font-mono text-white"
                                                parentClassName="font-mono"
                                                encryptedClassName="font-mono opacity-70"
                                            />
                                        ) : null}
                                    />

                                    {error && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-xs font-medium">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <Button 
                                        type="submit" 
                                        fullWidth 
                                        isLoading={isLoading} 
                                        rightIcon={UserPlus}
                                        className="mt-6"
                                    >
                                        Create Account
                                    </Button>
                                </form>
                                <p className="form-switch mt-10 text-center text-tertiary text-sm font-medium">
                                    Already have an account?{' '}
                                    <button 
                                        onClick={(e) => { e.preventDefault(); setIsLogin(true); }}
                                        className="text-primary hover:underline transition-all font-bold"
                                    >
                                        Login
                                    </button>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </BorderGlow>

            {/* Original Social Auth Buttons block */}
            <div className="mt-8 relative z-20 w-full max-w-[480px]">
                <div className="relative flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-default" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">
                        or continue with
                    </span>
                    <div className="flex-1 h-px bg-default" />
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
            
            <footer className="mt-8 text-center pb-8 p-4 z-20">
                <p className="text-xs font-medium text-tertiary">
                    Secure Access Provided by Klivra<br />
                    © 2026 Klivra Technologies
                </p>
            </footer>
            </div>
        </AuthLayout>
    );
};

export default Login;