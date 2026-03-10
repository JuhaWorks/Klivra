import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthLayout, API_BASE, useCursor, Ico, EyeIco, GoogleSVG, GithubSVG, Logo, Field } from '../components/auth/AuthLayout';

// ─── Config ──────────────────────────────────────────────────────────────────

const schema = z.object({
    email: z.string().min(1, 'Required').email('Invalid email'),
    password: z.string().min(8, 'Min 8 characters'),
    remember: z.boolean().optional(),
});

// ─── Modal ────────────────────────────────────────────────────────────────────

const Modal = ({ open, loading, onConfirm, onClose }) => !open ? null : (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="mbg" onClick={onClose} />
        <div className="mbox">
            <div className="flex items-center justify-center w-9 h-9 rounded-[10px] mb-4"
                style={{ background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.15)' }}>
                <Ico d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" size={16} stroke="#fbbf24" />
            </div>
            <h3 className="serif text-[15px] tracking-tight mb-2" style={{ color: 'var(--t1)' }}>Account Deactivated</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>Reactivate to restore full access to your workspace and projects.</p>
            <div className="flex gap-2.5 mt-5">
                <button onClick={onClose} disabled={loading}
                    className="flex-1 py-2.5 text-[12.5px] font-medium rounded-[8px] transition-all duration-[120ms]"
                    style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--b)', color: 'var(--t2)' }}
                    onMouseEnter={e => Object.assign(e.currentTarget.style, { color: 'var(--t1)', background: 'rgba(255,255,255,.07)' })}
                    onMouseLeave={e => Object.assign(e.currentTarget.style, { color: 'var(--t2)', background: 'rgba(255,255,255,.04)' })}>
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={loading} className="sbtn flex-1 py-2.5 text-[12.5px]">
                    {loading ? <><div className="sp" />Reactivating…</> : 'Reactivate & Sign In'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Form Panel ───────────────────────────────────────────────────────────────

function FormPanel({ onSubmit, loading, error, clearError, modalOpen }) {
    const [showPw, setShowPw] = useState(false);
    const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm({
        resolver: zodResolver(schema), mode: 'onChange', defaultValues: { remember: false },
    });
    const remember = watch('remember'), pw = watch('password');

    return (
        <main className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden">
            {/* soft bg glow */}
            <div style={{ position: 'absolute', top: '8%', right: '4%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,110,247,.08),transparent 60%)', pointerEvents: 'none' }} />

            <div className="w-full max-w-[385px] relative z-10">

                {/* mobile logo */}
                <div className="flex items-center gap-3 mb-9 lg:hidden as">
                    <Logo size={32} />
                    <span className="serif text-[15px] tracking-tight" style={{ color: 'var(--t1)' }}>Klivra</span>
                </div>

                {/* heading */}
                <div className="mb-7">
                    <h1 className="au serif leading-none mb-2"
                        style={{ fontSize: 'clamp(22px,2.8vw,27px)', color: 'var(--t1)', letterSpacing: '-.02em' }}>
                        Welcome back
                    </h1>
                    <p className="au d1 text-[13px]" style={{ color: 'var(--t2)' }}>
                        New to Klivra? <Link to="/register" className="lnk">Create account</Link>
                    </p>
                </div>

                {/* card */}
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

                            <Field id="email" label="Email" type="email" placeholder="name@company.com"
                                autoComplete="email" reg={register('email')} error={errors.email} delay="d2" />

                            <Field id="password" label="Password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                                autoComplete="current-password" reg={register('password')} error={errors.password} delay="d3"
                                right={<button type="button" className="ib" onClick={() => setShowPw(v => !v)} tabIndex={-1}><EyeIco open={showPw} /></button>}
                                showStr strVal={pw} />

                            <div className="flex items-center justify-between au d4">
                                <label className="flex items-center gap-2" style={{ cursor: 'none' }}>
                                    <div className={`cbox${remember ? ' on' : ''}`} style={{ position: 'relative' }}>
                                        <input type="checkbox" {...register('remember')} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', inset: 0 }} />
                                        {remember && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                    </div>
                                    <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>Remember me</span>
                                </label>
                                <button type="button"
                                    className="text-[12px] font-medium bg-transparent border-none transition-colors duration-[120ms]"
                                    style={{ color: 'var(--t3)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--a2)' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)' }}>
                                    Forgot password?
                                </button>
                            </div>

                            <div className="au d5">
                                <button type="submit" disabled={loading || !isValid} className="sbtn">
                                    {loading && !modalOpen
                                        ? <><div className="sp" />Authenticating…</>
                                        : <><span>Sign in to Klivra</span><Ico d="M5 12h14M12 5l7 7-7 7" size={13} sw={2.2} /></>}
                                </button>
                            </div>
                        </form>

                        {/* oauth */}
                        <div className="mt-6 flex flex-col gap-3.5 au d6">
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

                <p className="au d6 text-center text-[11px] leading-[1.8]" style={{ color: 'var(--t3)' }}>
                    By signing in you agree to our{' '}
                    <a href="#" className="underline underline-offset-[3px] transition-colors duration-[120ms] hover:text-[#7080a8]">Terms</a>
                    {' '}and{' '}
                    <a href="#" className="underline underline-offset-[3px] transition-colors duration-[120ms] hover:text-[#7080a8]">Privacy Policy</a>.
                </p>
            </div>
        </main>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Login() {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError, user } = useAuthStore();
    const [modal, setModal] = useState(false);
    const [rxData, setRxData] = useState(null);

    useEffect(() => { if (user) navigate('/'); }, [user, navigate]);
    useEffect(() => { clearError(); }, [clearError]);

    const onSubmit = useCallback(async d => {
        clearError();
        try { await login(d.email, d.password, d.remember); navigate('/'); }
        catch (e) { if (e?.requiresReactivation) { setRxData(d); setModal(true); } }
    }, [clearError, login, navigate]);

    const onReactivate = useCallback(async () => {
        try { await login(rxData.email, rxData.password, rxData.remember, true); setModal(false); navigate('/'); }
        catch { setModal(false); }
    }, [login, navigate, rxData]);

    return (
        <AuthLayout reverse={false}>
            <Modal open={modal} loading={isLoading} onConfirm={onReactivate} onClose={() => setModal(false)} />
            <FormPanel onSubmit={onSubmit} loading={isLoading} error={error} clearError={clearError} modalOpen={modal} />
        </AuthLayout>
    );
}