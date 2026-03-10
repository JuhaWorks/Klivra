import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { api, useAuthStore } from '../../store/useAuthStore';

const MaintenanceNotice = () => {
    const { user } = useAuthStore();
    const location = useLocation();
    const { data: statusRes } = useQuery({
        queryKey: ['systemStatus'],
        queryFn: async () => (await api.get('/admin/system/status')).data,
        refetchInterval: 60000, // Check every minute
    });

    const status = statusRes?.data;

    if (!status?.isMaintenance && !status?.endTime) return null;

    const isNow = status?.isMaintenance;
    const endTime = status?.endTime ? new Date(status.endTime) : null;
    const isPast = endTime && endTime < new Date();
    const isAdmin = user?.role === 'Admin';

    if (isPast) return null;

    // Do not show full-page maintenance if on login or verification routes
    const isPublicAuthRoute = ['/login', '/register', '/verify-email', '/oauth/callback'].some(path => location.pathname.startsWith(path));
    if (isPublicAuthRoute) return null;

    // Full page overlay for non-admins when maintenance is effectively active
    if (isNow && !isPast && !isAdmin) {
        return (
            <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent)]" />

                <div className="relative space-y-8 max-w-lg">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-pulse">
                            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-black text-white tracking-tight">System Maintenance</h1>
                        <p className="text-gray-400 text-lg">We're performing scheduled upgrades to improve your experience.</p>
                    </div>

                    {endTime && (
                        <div className="inline-block px-6 py-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-sm">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Expected Completion</p>
                            <p className="text-xl font-bold text-emerald-500">{endTime.toLocaleString()}</p>
                        </div>
                    )}

                    <div className="pt-8 flex flex-col items-center gap-4">
                        <div className="w-12 h-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                        <p className="text-xs text-gray-600 font-medium">Thank you for your patience as we build something better.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Top banner for scheduled maintenance or for admins to see current status
    return (
        <div className={`w-full py-2.5 px-4 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all z-[90] ${isNow ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-emerald-600/10 text-emerald-400 border-b border-emerald-500/20 backdrop-blur-md'
            }`}>
            <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
                {isNow
                    ? `SYSTEM UNDER MAINTENANCE ${endTime ? `UNTIL ${endTime.toLocaleString()}` : ''}`
                    : `SCHEDULED MAINTENANCE ${endTime ? `ESTIMATED: ${endTime.toLocaleString()}` : 'SOON'}`
                }
            </span>
            {isAdmin && isNow && (
                <span className="ml-2 px-2 py-0.5 bg-black/10 rounded-md text-[9px] font-bold">ADMIN VIEW</span>
            )}
        </div>
    );
};

export default MaintenanceNotice;
