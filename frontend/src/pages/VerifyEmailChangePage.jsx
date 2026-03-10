import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../store/useAuthStore';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const VerifyEmailChangePage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { syncEmail, setAccessToken } = useAuthStore();

    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyChange = async () => {
            try {
                // Wait a bit for UI smoothness
                await new Promise(r => setTimeout(r, 1200));

                const response = await api.get(`/settings/email/confirm/${token}`);

                if (response.data.status === 'success') {
                    const { accessToken, data } = response.data;

                    // Sync Zustand state instantly
                    syncEmail(data.email);
                    if (accessToken) {
                        setAccessToken(accessToken);
                    }

                    setStatus('success');
                    setMessage(response.data.message);
                    toast.success('Email updated successfully!');

                    // Redirect after a brief delay so they see the success state
                    setTimeout(() => {
                        navigate('/settings');
                    }, 2500);
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. The link may be expired or invalid.');
                toast.error('Email change failed.');
            }
        };

        if (token) {
            verifyChange();
        }
    }, [token, navigate, syncEmail, setAccessToken]);

    return (
        <div className="min-h-screen bg-[#060612] flex items-center justify-center p-6 font-sans antialiased text-[#eeeeff]">
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
            </div>

            <main className="relative z-10 w-full max-w-md">
                <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/[0.06] rounded-3xl p-10 shadow-2xl overflow-hidden">
                    {/* Inner Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />

                    <div className="relative text-center space-y-8">
                        {/* Dynamic Icon */}
                        <div className="flex justify-center">
                            {status === 'loading' && (
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                    <div className="relative w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.1] flex items-center justify-center">
                                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                    </div>
                                </div>
                            )}
                            {status === 'success' && (
                                <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
                                    <div className="relative w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-in zoom-in-75 duration-500">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </div>
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="relative">
                                    <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full" />
                                    <div className="relative w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center animate-in zoom-in-75 duration-500">
                                        <XCircle className="w-10 h-10 text-rose-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="space-y-4">
                            <h1 className="text-3xl font-black tracking-tight text-white">
                                {status === 'loading' ? 'Verifying Email' : status === 'success' ? 'Email Confirmed' : 'Verification Failed'}
                            </h1>
                            <p className="text-[#8888aa] text-lg leading-relaxed px-4">
                                {status === 'loading' ? (
                                    <>Finalizing your security update<span className="animate-pulse">...</span></>
                                ) : (
                                    message || 'Redirecting you to settings...'
                                )}
                            </p>
                        </div>

                        {/* CTA / Footer */}
                        <div className="pt-4">
                            {status === 'error' && (
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="w-full h-14 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] rounded-2xl font-bold flex items-center justify-center gap-2 transition-all group"
                                >
                                    Return to Settings
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                            {status === 'success' && (
                                <div className="flex items-center justify-center gap-3 py-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-emerald-500/80 uppercase tracking-widest">Automatic Redirect</span>
                                </div>
                            )}
                            {status === 'loading' && (
                                <div className="flex gap-1 justify-center">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="w-1.5 h-1.5 bg-emerald-500/30 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-[#44445a] text-sm">
                    Antigravity Secure Infrastructure &copy; 2026
                </p>
            </main>
        </div>
    );
};

export default VerifyEmailChangePage;
