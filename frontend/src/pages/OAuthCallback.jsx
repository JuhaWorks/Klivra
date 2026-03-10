import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';

const OAuthCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAccessToken, checkAuth } = useAuthStore();
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Extract token from URL parameters
                const params = new URLSearchParams(location.search);
                const token = params.get('token');

                if (!token) {
                    throw new Error('Authentication failed: No token received from provider.');
                }

                // 1. Save the short-lived access token directly to the Zustand store
                // The HttpOnly refresh token is already safely stored in cookies by the backend redirect
                setAccessToken(token);

                // 2. Fetch the user profile from the backend to populate the UI
                await checkAuth(true);

                // 3. Navigate instantly to the dashboard
                navigate('/');
            } catch (err) {
                console.error("OAuth Callback Error:", err);
                setError(err.message || "An unexpected error occurred during authentication.");
                setTimeout(() => navigate('/login'), 4000);
            }
        };

        handleOAuthCallback();
    }, [location, navigate, setAccessToken, checkAuth]);

    // Error State
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#05050a] text-white">
                <div className="text-center max-w-sm px-6">
                    <div className="mb-6 w-16 h-16 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Authentication Failed</h2>
                    <p className="text-gray-400 text-[13px] mb-8 leading-relaxed">{error}</p>
                    <p className="text-gray-500 text-[11px]">Redirecting back to login...</p>
                </div>
            </div>
        );
    }

    // Success / Loading State (Sleek Pulsing Skeleton)
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#05050a]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
            >
                <div className="relative">
                    {/* Outer pulse */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 bg-emerald-500 rounded-full"
                    />
                    {/* Inner glowing core */}
                    <div className="relative w-16 h-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center shadow-emerald-500/20 box-border pointer-events-none">
                        <svg className="w-6 h-6 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                <h2 className="mt-8 text-white font-semibold tracking-tight">Securing your session</h2>
                <div className="mt-3 flex gap-1">
                    <motion.div className="w-1 h-1 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                    <motion.div className="w-1 h-1 rounded-full bg-emerald-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
                    <motion.div className="w-1 h-1 rounded-full bg-emerald-300" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
                </div>
            </motion.div>
        </div>
    );
};

export default OAuthCallback;
