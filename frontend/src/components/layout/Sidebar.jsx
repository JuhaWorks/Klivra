import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, MODES } from '../../store/useTheme';

const navItems = [
    { label: 'Dashboard', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Projects', path: '/projects', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
    { label: 'Tasks', path: '/tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { label: 'Whiteboard', path: '/whiteboard/team-alpha', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

const bottomItems = [
    { label: 'Admin', path: '/admin', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', adminOnly: true },
    { label: 'Settings', path: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const SidebarComponent = ({ isOpen, onClose }) => {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { mode, setMode } = useTheme();

    // Intent-Driven Prefetching logic based on navigation path targets
    const handlePrefetch = (path) => {
        if (path === '/projects') {
            queryClient.prefetchQuery({
                queryKey: ['projects'],
                queryFn: async () => {
                    const res = await api.get('/projects');
                    return res.data;
                },
                staleTime: 1000 * 60 * 5 // Cache prefetch for 5 min
            });
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
            )}

            <aside className={`
                fixed top-0 left-0 h-full z-50 w-[260px] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]
                flex flex-col transition-transform duration-300 ease-in-out
                lg:relative lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand */}
                <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06] flex-shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgb(var(--theme-600))] to-[rgb(var(--theme-500))] flex items-center justify-center shadow-lg shadow-[rgba(var(--theme-500),0.25)]">
                        <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[15px] font-bold tracking-tight text-[var(--text-main)] leading-none">Klivra</span>
                    </div>
                    <button onClick={onClose} className="lg:hidden ml-auto p-1.5 text-gray-500 hover:text-white rounded-lg transition-colors" aria-label="Close sidebar">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
                    <p className="px-3 mb-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">Navigation</p>

                    {/* Prioritize Admin Link for Admins */}
                    {user?.role === 'Admin' && (
                        <NavLink
                            to="/admin"
                            onClick={onClose}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 mb-2
                                ${isActive
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(124,58,237,0.1)]'
                                    : 'text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/5 border border-emerald-500/10'
                                }
                            `}
                        >
                            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Platform Admin
                            <span className="ml-auto flex h-2 w-2 rounded-full bg-[rgb(var(--theme-500))] animate-pulse"></span>
                        </NavLink>
                    )}

                    {user?.role === 'Admin' && (
                        <NavLink
                            to="/admin/security"
                            onClick={onClose}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 mb-2
                                ${isActive
                                    ? 'bg-red-600/20 text-red-400 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                                    : 'text-red-400/70 hover:text-red-300 hover:bg-red-500/5 border border-red-500/10'
                                }
                            `}
                        >
                            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Security Feed
                        </NavLink>
                    )}

                    {navItems
                        .filter(item => user?.role !== 'Admin' || item.path === '/')
                        .map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                onClick={onClose}
                                onMouseEnter={() => handlePrefetch(item.path)}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                                    ${isActive
                                        ? 'bg-[rgba(var(--theme-500),0.1)] text-[rgb(var(--theme-400))] border border-[rgba(var(--theme-500),0.1)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] border border-transparent'
                                    }
                                `}
                            >
                                <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                                </svg>
                                {item.label}
                            </NavLink>
                        ))}
                </nav>

                {/* Bottom */}
                <div className="px-3 pb-4 space-y-0.5 border-t border-[var(--border-subtle)] pt-4">
                    {bottomItems.map((item) => {
                        if (item.adminOnly) return null; // Already handled at the top

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                                    ${isActive
                                        ? 'bg-[rgba(var(--theme-500),0.1)] text-[rgb(var(--theme-400))]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)]'
                                    }
                                `}
                            >
                                <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                                </svg>
                                {item.label}
                            </NavLink>
                        );
                    })}
                    {/* Mode Toggle */}
                    <button
                        onClick={() => setMode(mode === MODES.DARK ? MODES.LIGHT : MODES.DARK)}
                        title={mode === MODES.DARK ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:text-[rgb(var(--theme-400))] hover:bg-[rgba(var(--theme-500),0.06)] transition-all duration-200"
                    >
                        {mode === MODES.DARK ? (
                            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        ) : (
                            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        )}
                        {mode === MODES.DARK ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
                    >
                        <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log Out
                    </button>
                </div>
            </aside>
        </>
    );
};

export default SidebarComponent;
