import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const Login = () => {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError, user } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const [reactivationData, setReactivationData] = useState(null);

    const { register, handleSubmit, formState: { errors, isValid } } = useForm({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
    });

    // Derive the correct cross-environment API URL for OAuth redirects
    const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://klivra-backend.onrender.com' : 'http://localhost:5000');

    useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
    useEffect(() => { clearError(); }, [clearError]);

    const onSubmit = async (data) => {
        clearError();
        try {
            await login(data.email, data.password);
            navigate('/');
        } catch (err) {
            if (err.requiresReactivation) {
                setReactivationData(data);
                setShowReactivateModal(true);
            }
        }
    };

    const handleReactivate = async () => {
        try {
            await login(reactivationData.email, reactivationData.password, true);
            setShowReactivateModal(false);
            navigate('/');
        } catch (err) {
            setShowReactivateModal(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#05050a] text-white font-sans selection:bg-violet-500/30">
            {/* Reactivation Modal */}
            {showReactivateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-[#0a0a12]/80 backdrop-blur-sm transition-opacity" onClick={() => setShowReactivateModal(false)}></div>
                    <div className="relative w-full max-w-md bg-[#12121a]/90 backdrop-blur-md ring-1 ring-white/[0.06] shadow-2xl rounded-2xl p-6 m-4 transform transition-all">
                        <h3 className="text-lg font-bold text-white tracking-tight">Account Deactivated</h3>
                        <p className="text-[13px] text-gray-400 mt-2">
                            Your account is currently deactivated. Would you like to reactivate it and log in immediately?
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setShowReactivateModal(false)} disabled={isLoading} className="px-4 py-2.5 text-[13px] font-semibold text-gray-300 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all disabled:opacity-50">
                                Cancel
                            </button>
                            <button onClick={handleReactivate} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2.5 text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/20 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50">
                                {isLoading ? 'Reactivating...' : 'Reactivate & Log In'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Brand Panel */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#111128] to-[#05050a]">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-violet-600 rounded-full opacity-[0.08] blur-[150px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500 rounded-full opacity-[0.06] blur-[120px]" />

                <div className="relative z-10 text-center px-14 max-w-md">
                    <div className="mx-auto mb-8 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                        <span className="text-white font-bold text-3xl leading-none">K</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">
                        Klivra
                    </h1>
                    <p className="text-gray-500 text-[15px] leading-relaxed mt-4 mb-10">
                        Real-time collaboration platform for teams building extraordinary products.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {['Real-time Sync', 'Kanban', 'Whiteboards', 'Secure'].map(f => (
                            <span key={f} className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] text-gray-400 border border-white/[0.06]">{f}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Form */}
            <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 lg:p-20 relative">
                <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-600 rounded-full opacity-[0.03] blur-[100px] pointer-events-none" />
                <div className="w-full max-w-[420px]">
                    <div className="lg:hidden text-center mb-10">
                        <h1 className="text-3xl font-black tracking-tight">Klivra</h1>
                    </div>
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold tracking-tight mb-1.5">Welcome back</h2>
                        <p className="text-gray-500 text-sm">Don't have an account? <Link to="/register" className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">Sign up</Link></p>
                    </div>

                    <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-7 shadow-2xl shadow-black/20">
                        {error && (
                            <div className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/15 text-red-400" role="alert">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-sm font-medium flex-1">{error}</span>
                                <button onClick={clearError} className="p-1 hover:bg-red-500/20 rounded-lg transition-colors" aria-label="Dismiss"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        )}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                            <div>
                                <label htmlFor="login-email" className="block text-[13px] font-semibold mb-2 text-gray-400">Email</label>
                                <input id="login-email" type="email" autoComplete="email" {...register('email')} aria-invalid={errors.email ? 'true' : 'false'}
                                    className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border text-white placeholder-gray-600 outline-none transition-all text-sm ${errors.email ? 'border-red-500/40 focus:ring-2 focus:ring-red-500/10' : 'border-white/[0.06] hover:border-white/[0.12] focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10'}`}
                                    placeholder="you@company.com" />
                                {errors.email && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="login-pass" className="block text-[13px] font-semibold text-gray-400">Password</label>
                                    <button type="button" className="text-[11px] font-medium text-gray-500 hover:text-violet-400 transition-colors" tabIndex={-1}>Forgot?</button>
                                </div>
                                <div className="relative">
                                    <input id="login-pass" type={showPassword ? 'text' : 'password'} autoComplete="current-password" {...register('password')}
                                        className={`w-full pl-4 pr-12 py-3 rounded-xl bg-white/[0.03] border text-white placeholder-gray-600 outline-none transition-all text-sm ${errors.password ? 'border-red-500/40 focus:ring-2 focus:ring-red-500/10' : 'border-white/[0.06] hover:border-white/[0.12] focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10'}`}
                                        placeholder="••••••••" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-600 hover:text-gray-300 rounded transition-colors" tabIndex={-1} aria-label={showPassword ? 'Hide' : 'Show'}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
                            </div>
                            <button type="submit" disabled={isLoading || !isValid}
                                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex justify-center items-center gap-2 ${isLoading || !isValid ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-violet-500/20 active:scale-[0.98]'}`}>
                                {isLoading && !showReactivateModal ? (<><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Signing in...</>) : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-6">
                            <div className="flex items-center gap-2 text-zinc-400 text-[13px] font-medium before:flex-1 before:border-t before:border-white/[0.06] after:flex-1 after:border-t after:border-white/[0.06] mb-5">
                                Or continue with
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Google Button */}
                                <a href={`${API_URL}/api/auth/google`} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-zinc-700 hover:bg-zinc-50 ring-1 ring-zinc-200 rounded-xl font-semibold text-[13px] shadow-sm transition-all active:scale-[0.98]">
                                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <title>Google</title>
                                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                        </g>
                                    </svg>
                                    Google
                                </a>

                                {/* GitHub Button */}
                                <a href={`${API_URL}/api/auth/github`} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#24292e] text-white hover:bg-black rounded-xl font-semibold text-[13px] shadow-sm transition-all active:scale-[0.98]">
                                    <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <title>GitHub</title>
                                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                    </svg>
                                    GitHub
                                </a>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-[11px] text-gray-600 mt-6">By continuing, you agree to our <a href="#" className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors">Terms</a> & <a href="#" className="text-gray-500 hover:text-white underline underline-offset-2 transition-colors">Privacy</a>.</p>
                </div>
            </div>
        </div>
    );
};
export default Login;
