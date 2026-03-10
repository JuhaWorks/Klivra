import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout, API_BASE, useCursor, Ico, EyeIco, GoogleSVG, GithubSVG, Logo, Field, StrBars } from '../components/auth/AuthLayout';

// ─── Config ──────────────────────────────────────────────────────────────────

const schema = z.object({
    name: z.string().min(2, 'At least 2 characters'),
    email: z.string().min(1, 'Required').email('Invalid email'),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

// ─── Success Screen ───────────────────────────────────────────────────────────

const SuccessScreen = () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center au" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(52,211,153,.07)', border: '1px solid rgba(52,211,153,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <div>
                <h2 className="serif text-[20px] tracking-tight" style={{ color: 'var(--t1)', marginBottom: 6 }}>Account created!</h2>
                <p style={{ fontSize: 13, color: 'var(--t2)' }}>Redirecting you to sign in…</p>
            </div>
            <div className="prog-track"><div className="prog-bar" /></div>
        </div>
    </div>
);

// ─── Form Panel ───────────────────────────────────────────────────────────────

function FormPanel({ onSubmit, loading, error, clearError }) {
    const [showPw, setShowPw] = useState(false);
    const { register, handleSubmit, watch, formState: { errors, isValid, isSubmitting } } = useForm({
        resolver: zodResolver(schema), mode: 'onChange',
    });
    const pw = watch('password');

    return (
        <main className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            <div style={{ position: 'absolute', top: '8%', left: '4%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,110,247,.036),transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

            <div className="w-full max-w-[390px] relative z-10">

                {/* mobile logo */}
                <div className="flex items-center gap-3 mb-9 lg:hidden as">
                    <Logo size={32} />
                    <span className="serif text-[15px] tracking-tight" style={{ color: 'var(--t1)' }}>Klivra</span>
                </div>

                <div className="mb-7">
                    <h1 className="au serif leading-none mb-2"
                        style={{ fontSize: 'clamp(22px,2.8vw,27px)', color: 'var(--t1)', letterSpacing: '-.02em' }}>
                        Create your account
                    </h1>
                    <p className="au d1 text-[13px]" style={{ color: 'var(--t2)' }}>
                        Already have access? <Link to="/login" className="lnk">Sign in</Link>
                    </p>
                </div>

                <div className="cb au d1 mb-3.5">
                    <div className="rounded-[15px] p-7" style={{ background: 'var(--card)', backdropFilter: 'blur(28px)' }}>
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

                            {error && (
                                <div className="ebanner">
                                    <Ico d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" size={13} />
                                    <span className="flex-1 text-[12.5px] font-medium">{error}</span>
                                    <button className="ib p-1" onClick={clearError}><Ico d="M18 6L6 18M6 6l12 12" size={11} sw={2.5} /></button>
                                </div>
                            )}

                            <Field id="r-name" label="Full name" type="text" placeholder="Jane Smith"
                                autoComplete="name" reg={register('name')} error={errors.name} delay="d2" />

                            <Field id="r-email" label="Email" type="email" placeholder="name@company.com"
                                autoComplete="email" reg={register('email')} error={errors.email} delay="d3" />

                            <div className="flex flex-col gap-1.5 au d4">
                                <label htmlFor="r-pass" className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t2)' }}>Password</label>
                                <div className="relative">
                                    <input id="r-pass" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                                        placeholder="••••••••" aria-invalid={!!errors.password} {...register('password')}
                                        className={`inp r${errors.password ? ' e' : ''}`} />
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                        <button type="button" className="ib" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                                            <EyeIco open={showPw} />
                                        </button>
                                    </div>
                                </div>
                                {pw && <StrBars value={pw} />}
                                {errors.password && <p className="ferr"><Ico d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" size={11} />{errors.password.message}</p>}
                            </div>

                            <Field id="r-confirm" label="Confirm password" type="password" placeholder="••••••••"
                                autoComplete="new-password" reg={register('confirmPassword')} error={errors.confirmPassword} delay="d5" />

                            <div className="au d6">
                                <button type="submit" disabled={loading || isSubmitting || !isValid} className="sbtn">
                                    {loading || isSubmitting
                                        ? <><div className="sp" />Creating account…</>
                                        : <><span>Create account</span><Ico d="M5 12h14M12 5l7 7-7 7" size={13} sw={2.2} /></>}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 flex flex-col gap-3.5 au d7">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px" style={{ background: 'var(--b)' }} />
                                <span className="text-[9.5px] uppercase tracking-[.14em] font-semibold" style={{ color: 'var(--t3)' }}>or continue with</span>
                                <div className="flex-1 h-px" style={{ background: 'var(--b)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <a href={`${API_BASE}/api/auth/google`} className="obtn og"><GoogleSVG />Google</a>
                                <a href={`${API_BASE}/api/auth/github`} className="obtn gh"><GithubSVG />GitHub</a>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="au d7 text-center text-[11px] leading-[1.8]" style={{ color: 'var(--t3)' }}>
                    By creating an account you agree to our{' '}
                    <a href="#" className="underline underline-offset-[3px] transition-colors duration-[120ms] hover:text-[#7080a8]">Terms</a>
                    {' '}and{' '}
                    <a href="#" className="underline underline-offset-[3px] transition-colors duration-[120ms] hover:text-[#7080a8]">Privacy Policy</a>.
                </p>
            </div>
        </main>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Register() {
    const navigate = useNavigate();
    const { register: registerAction, isLoading, error, clearError, user } = useAuthStore();
    const [success, setSuccess] = useState(false);

    useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
    useEffect(() => { clearError(); }, [clearError]);

    const onSubmit = useCallback(async d => {
        clearError();
        try {
            await registerAction({ name: d.name, email: d.email, password: d.password, role: 'Developer' });
            setSuccess(true);
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch (e) {
            console.error('Registration failed:', e?.response?.data?.message || e?.message);
        }
    }, [clearError, registerAction]);

    if (success) return <SuccessScreen />;

    return (
        <AuthLayout reverse={true}>
            <FormPanel onSubmit={onSubmit} loading={isLoading} error={error} clearError={clearError} />
        </AuthLayout>
    );
}