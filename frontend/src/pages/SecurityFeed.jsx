import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, api } from '../store/useAuthStore';
import { Navigate, Link } from 'react-router-dom';
import IPBlacklistModal from '../components/layout/IPBlacklistModal';

const SecurityFeed = () => {
    const { user } = useAuthStore();
    const [page, setPage] = useState(1);
    const [isFirewallOpen, setIsFirewallOpen] = useState(false);

    if (user?.role !== 'Admin') {
        return <Navigate to="/" replace />;
    }

    const { data: logsData, isLoading } = useQuery({
        queryKey: ['securityLogs', page],
        queryFn: async () => {
            const res = await api.get(`/audit?limit=20&page=${page}&type=Security`);
            return res.data;
        },
        keepPreviousData: true,
    });

    const logs = logsData?.data || [];
    const pagination = logsData?.pagination || { page: 1, pages: 1, total: 0 };

    const renderActionNarrative = (log) => {
        const actor = log.user?.name || 'System';
        const details = log.details || {};
        const action = log.action;

        switch (action) {
            case 'PROJECT_DELETED':
                return (
                    <>
                        <span className="text-emerald-400 font-bold">{actor}</span> deleted project
                        <span className="text-white font-bold ml-1.5 px-2 py-0.5 bg-white/5 rounded-lg border border-white/5">{details.name || 'Unknown'}</span>
                    </>
                );
            case 'ROLE_UPDATED':
                return (
                    <>
                        <span className="text-emerald-400 font-bold">{actor}</span> changed role of
                        <span className="text-white font-bold mx-1.5">{details.targetUserName || 'User'}</span> to
                        <span className="text-amber-400 font-bold ml-1.5 px-2 py-0.5 bg-amber-400/10 rounded-lg border border-amber-400/20">{details.newRole}</span>
                    </>
                );
            case 'USER_BANNED':
                return (
                    <>
                        <span className="text-emerald-400 font-bold">{actor}</span> blacklisted
                        <span className="text-rose-500 font-bold mx-1.5">{details.targetUserName || 'User'}</span> from the platform
                    </>
                );
            case 'USER_UNBANNED':
                return (
                    <>
                        <span className="text-emerald-400 font-bold">{actor}</span> restored access for
                        <span className="text-emerald-400 font-bold mx-1.5">{details.targetUserName || 'User'}</span>
                    </>
                );
            case 'MEMBER_ADDED':
                return (
                    <>
                        <span className="text-emerald-400 font-bold">{actor}</span> added
                        <span className="text-white font-bold mx-1.5">{details.memberName || 'Member'}</span> as
                        <span className="text-emerald-400 font-bold mx-1.5">{details.role}</span> to
                        <span className="text-white font-bold ml-1.5 px-2 py-0.5 bg-white/5 rounded-lg border border-white/5">{details.projectName || 'Project'}</span>
                    </>
                );
            case 'MEMBER_REMOVED':
                return (
                    <>
                        <span className="text-emerald-400 font-bold">{actor}</span> removed
                        <span className="text-white font-bold mx-1.5">{details.targetUserName || 'Member'}</span> from
                        <span className="text-white font-bold ml-1.5 px-2 py-0.5 bg-white/5 rounded-lg border border-white/5">{details.projectName || 'Project'}</span>
                    </>
                );
            case 'FAILED_LOGIN':
                return (
                    <>
                        Failed login attempt detected for
                        <span className="text-rose-400 font-bold mx-1.5">{details.email}</span>
                        <span className="text-gray-500 text-[10px] ml-1 uppercase tracking-tighter">({details.reason})</span>
                    </>
                );
            default:
                return (
                    <>
                        <span className="text-emerald-400 font-bold">{actor}</span> performed
                        <span className="text-white font-bold mx-1.5">{action.replace(/_/g, ' ')}</span>
                    </>
                );
        }
    };

    return (
        <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-4 mb-2">
                        <Link to="/admin" className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-500 hover:text-white transition-all border border-white/5 shadow-inner">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>
                        <h1 className="serif text-4xl tracking-tight text-white italic">Security Feed</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsFirewallOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Manage Firewall
                    </button>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-700 bg-white/[0.02] px-3 py-1.5 rounded-full border border-white/[0.05]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                </div>
            </div>

            {/* Feed */}
            <div className="space-y-6">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-28 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] animate-pulse" />
                    ))
                ) : logs.length === 0 ? (
                    <div className="py-24 text-center space-y-6 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem] glass">
                        <div className="inline-flex p-5 bg-white/5 rounded-full text-gray-700">
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <div>
                            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[11px]">Empty</p>
                            <p className="text-gray-600 text-xs mt-2 uppercase tracking-widest leading-loose">No security anomalies detected in the current cycle</p>
                        </div>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log._id} className="k-card k-card-hover group relative p-6 overflow-hidden transition-all duration-500">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <code className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{log._id.slice(-6)}</code>
                            </div>

                            <div className="flex items-start gap-6">
                                <div className="flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xl transition-transform duration-500 group-hover:scale-110 ${['USER_BANNED', 'FAILED_LOGIN'].includes(log.action) ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                        ['PROJECT_DELETED', 'MEMBER_REMOVED'].includes(log.action) ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                            log.action.includes('ROLE') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                        }`}>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            {log.action.includes('BAN') && <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />}
                                            {log.action.includes('ROLE') && <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />}
                                            {log.action === 'FAILED_LOGIN' && <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />}
                                            {log.action.includes('PROJECT') && <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />}
                                            {log.action.includes('MEMBER') && <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />}
                                            {(!log.action.includes('BAN') && !log.action.includes('ROLE') && !log.action.includes('FAILED') && !log.action.includes('PROJECT') && !log.action.includes('MEMBER')) && <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 py-1">
                                    <h4 className="text-[15px] font-medium text-gray-300 leading-relaxed">
                                        {renderActionNarrative(log)}
                                    </h4>

                                    <div className="mt-4 flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                                                {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600/30" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">Origin Protocol: </span>
                                            <code className="text-[10px] font-black text-emerald-400/90">{log.ipAddress}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && pagination.pages > 1 && (
                <div className="flex justify-center gap-3 pt-4">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="k-button-secondary px-8 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-20 translate-y-0 active:scale-95 transition-all"
                    >
                        Previous Sequence
                    </button>
                    <button
                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                        disabled={page === pagination.pages}
                        className="k-button-secondary px-8 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-20 translate-y-0 active:scale-95 transition-all"
                    >
                        Next Sequence
                    </button>
                </div>
            )}

            <IPBlacklistModal 
                isOpen={isFirewallOpen} 
                onClose={() => setIsFirewallOpen(false)} 
            />
        </div>
    );
};

export default SecurityFeed;
