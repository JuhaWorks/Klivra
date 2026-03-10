import { useAuthStore } from '../../store/useAuthStore';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../store/useAuthStore'; // Assumes api instance is exported or available
import { useState } from 'react';

const RequireVerification = ({ children }) => {
    const { user } = useAuthStore();
    const [isResending, setIsResending] = useState(false);

    if (!user) return children;

    if (user && !user.isEmailVerified && user.role !== 'Admin') {
        const handleResend = async () => {
            setIsResending(true);
            try {
                await api.post('/auth/resend-verification', { email: user.email });
                toast.success('Verification email sent! Check your inbox.');
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Failed to resend email');
            } finally {
                setIsResending(false);
            }
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-[#060612] p-4 font-sans text-[#eeeeff]">
                <div className="bg-[#08081e] border border-[rgba(255,255,255,0.06)] shadow-2xl rounded-2xl p-8 max-w-md w-full text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-[rgba(123,82,255,0.1)] border border-[rgba(123,82,255,0.2)] flex items-center justify-center mb-6">
                        <Mail className="w-8 h-8 text-[#7B52FF]" />
                    </div>

                    <h2 className="text-2xl font-bold mb-3 tracking-tight text-white">Verify your email</h2>

                    <p className="text-[#8888aa] text-sm leading-relaxed mb-8">
                        We sent a verification link to <span className="font-semibold text-[#eeeeff]">{user.email}</span>.
                        Please verify your address to access your workspace.
                    </p>

                    <button
                        onClick={handleResend}
                        disabled={isResending}
                        className="w-full py-3 px-4 bg-gradient-to-r from-[#7B52FF] to-[#2563EB] text-white font-bold rounded-xl shadow-[0_8px_30px_rgba(123,82,255,0.32)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isResending ? (
                            <>
                                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                                Sending...
                            </>
                        ) : (
                            'Resend Verification Email'
                        )}
                    </button>

                    <button
                        onClick={() => useAuthStore.getState().logout()}
                        className="mt-6 text-sm text-[#8888aa] hover:text-[#eeeeff] transition-colors"
                    >
                        Sign out and continue later
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default RequireVerification;
