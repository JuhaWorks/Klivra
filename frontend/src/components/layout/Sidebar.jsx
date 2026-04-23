import React, { memo, useEffect, useTransition, useCallback } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, Briefcase, Calendar, Compass, MessageSquare, Users,
    FolderKanban, CheckSquare, Presentation, ShieldAlert, 
    Activity, Settings, LogOut, X, ChevronRight, Sun, Moon, UserCircle, Users2
} from 'lucide-react';
import { useAuthStore, api } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, MODES } from '../../store/useTheme';
import { useUIStore } from '../../store/useUIStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../utils/cn';
import { useChatStore } from '../../store/useChatStore';
import { GlassSurface } from '../ui/Aesthetics';
import { getOptimizedAvatar } from '../../utils/avatar';
import { useSocketStore } from '../../store/useSocketStore';
import { toast } from 'react-hot-toast';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', labelDescription: 'Project Overview' },
    { icon: Briefcase, label: 'Projects', path: '/projects', labelDescription: 'Manage Projects' },
    { icon: Calendar, label: 'Planning', path: '/tasks', labelDescription: 'Project Roadmap' },
    { icon: Users, label: 'Network', path: '/networking', labelDescription: 'Member Directory' },
    { icon: MessageSquare, label: 'Messages', path: '/messaging', labelDescription: 'Strategic Communications' },
    { icon: Presentation, label: 'Whiteboard', path: '/whiteboard/main-workspace', labelDescription: 'Shared Workspace' },
];

const SidebarItem = memo(({ item, isActive, onClose, onPrefetch, isCollapsed, unreadTotal }) => {
    const Icon = item.icon;
    
    return (
        <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            onMouseEnter={() => onPrefetch(item.path)}
            className={({ isActive: linkActive }) => cn(
                "sidebar-nav-item group relative flex transition-all duration-200 select-none",
                isCollapsed 
                    ? "flex-col items-center justify-center py-3.5 w-16 mx-auto rounded-xl gap-1.5" 
                    : "items-center gap-3 px-3 py-2.5 rounded-xl w-full",
                linkActive 
                    ? "text-theme" 
                    : "text-tertiary hover:text-primary"
            )}
        >
            {/* Hover background only */}
            <span className={cn(
                "absolute inset-0 transition-opacity duration-150 rounded-xl bg-sunken",
                isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            )} />

            {/* Icon container */}
            <span className={cn(
                "relative z-10 flex flex-col items-center justify-center shrink-0 transition-all duration-200",
                isCollapsed ? "w-6 h-6" : "w-5 h-5",
                isActive ? "text-theme" : "group-hover:opacity-80"
            )}>
                <Icon strokeWidth={isActive ? (isCollapsed ? 1.75 : 2) : 1.5} className="w-full h-full" />
                {item.path === '/messaging' && unreadTotal > 0 && (
                    <div className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] p-0.5 bg-danger rounded-full border border-base text-[8px] font-black text-white flex items-center justify-center shadow-lg">
                        {unreadTotal > 9 ? '9+' : unreadTotal}
                    </div>
                )}
            </span>

            {isCollapsed ? (
                // Compact Text
                <span className={cn(
                    "relative z-10 text-[9px] leading-tight text-center truncate transition-colors duration-150 px-1 w-full",
                    isActive ? "font-bold text-theme" : "font-medium truncate opacity-70"
                )}>
                    {item.label}
                </span>
            ) : (
                // Desktop Text
                <span className="relative z-10 flex flex-col min-w-0 flex-1">
                    <span className={cn(
                        "text-sm leading-tight truncate transition-colors duration-150",
                        isActive ? "font-semibold text-theme" : "font-medium"
                    )}>
                        {item.label}
                    </span>
                </span>
            )}
        </NavLink>
    );
});

const SidebarComponent = () => {
    const { logout, user } = useAuthStore();
    const { isDrawerOpen, setDrawerOpen, unreadTotal } = useChatStore();
    const { isSidebarExpanded, isCollapsed, toggleSidebar, toggleCollapse, setSidebarExpanded, setCollapsed } = useUIStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { mode, setMode } = useTheme();
    const isDark = mode === MODES.DARK;
    
    // Responsive Detection
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const isTablet = useMediaQuery('(min-width: 1025px) and (max-width: 1280px)');

    const isAdminSection = location.pathname.startsWith('/admin');

    // Sync collapse state with tablet view
    useEffect(() => {
        if (isTablet && !isCollapsed) {
            setCollapsed(true);
        }
    }, [isTablet, isCollapsed, setCollapsed]);

    // Gamification Global Listener
    const { socket } = useSocketStore();
    useEffect(() => {
        if (!socket) return;
        const handleGamification = (data) => {
            if (data.type === 'xp_gained') {
                toast.success(`+${data.xpGained} XP Earned!`, { icon: '✨', duration: 3000 });
                queryClient.invalidateQueries({ queryKey: ['user-heatmap'] });
                // Surgically patch local state instead of hitting /auth/me again
                if (data.newXp !== undefined || data.xpGained !== undefined) {
                    useAuthStore.setState((state) => ({
                        user: state.user ? {
                            ...state.user,
                            gamification: {
                                ...state.user.gamification,
                                xp: data.newXp ?? ((state.user.gamification?.xp || 0) + data.xpGained),
                                level: data.newLevel ?? state.user.gamification?.level,
                            }
                        } : null
                    }));
                } else {
                    useAuthStore.getState().checkAuth();
                }
            } else if (data.type === 'xp_lost') {
                toast.error(`-${data.xpLost} XP (Reverted Task)`, { icon: '📉', duration: 3000 });
                if (data.leveledDown) {
                     toast.error(`Leveled Down to L${data.newLevel}`, { icon: '⚠️', duration: 4000 });
                }
                queryClient.invalidateQueries({ queryKey: ['user-heatmap'] });
                // Surgically patch local state instead of hitting /auth/me again
                if (data.newXp !== undefined || data.xpLost !== undefined) {
                    useAuthStore.setState((state) => ({
                        user: state.user ? {
                            ...state.user,
                            gamification: {
                                ...state.user.gamification,
                                xp: data.newXp ?? Math.max(0, (state.user.gamification?.xp || 0) - data.xpLost),
                                level: data.newLevel ?? state.user.gamification?.level,
                            }
                        } : null
                    }));
                } else {
                    useAuthStore.getState().checkAuth();
                }
            } else if (data.type === 'level_up') {
                toast.success(`Level Up! You reached Level ${data.newLevel}`, { icon: '🚀', duration: 5000 });
                useAuthStore.setState((state) => ({
                    user: state.user ? {
                        ...state.user,
                        gamification: { ...state.user.gamification, level: data.newLevel }
                    } : null
                }));
            } else if (data.type === 'badge_earned') {
                toast.success(`Badge Earned: ${data.badge?.name}!`, { icon: '🏆', duration: 5000 });
                useAuthStore.setState((state) => ({
                    user: state.user ? {
                        ...state.user,
                        gamification: {
                            ...state.user.gamification,
                            badges: [...(state.user.gamification?.badges || []), data.badge].filter(Boolean)
                        }
                    } : null
                }));
            }
        };
        socket.on('gamification_update', handleGamification);
        return () => socket.off('gamification_update', handleGamification);
    }, [socket, queryClient]);

    const chunkMap = {
        '/': () => import('../../pages/Home'),
        '/projects': () => import('../../pages/Projects'),
        '/tasks': () => import('../../pages/Tasks'),
        '/networking': () => import('../../pages/Networking'),
        '/settings': () => import('../../pages/Settings'),
        '/profile': () => import('../../pages/Profile'),
        '/whiteboard/main-workspace': () => import('../../pages/ProjectWhiteboard'),
        '/admin': () => import('../../pages/AdminDashboard'),
        '/admin/security': () => import('../../pages/SecurityFeed'),
    };

    const handlePrefetch = useCallback((path) => {
        chunkMap[path]?.();
        if (path === '/projects') {
            queryClient.prefetchQuery({
                queryKey: ['projects', 'active'],
                queryFn: async () => (await api.get('/projects')).data,
                staleTime: 1000 * 60 * 5
            });
        }
    }, [queryClient]);

    const [, startTransition] = useTransition();

    const handleLogout = useCallback(() => {
        navigate('/login');
        logout().catch(() => {});
    }, [logout, navigate]);

    const visibleNavItems = (user?.role === 'Admin' || isAdminSection)
        ? navItems.filter(item => item.path === '/')
        : navItems;

    const isHome = location.pathname === '/';
    const effectiveCollapsed = isMobile ? false : !isSidebarExpanded; // Hamburger expands the drawer

    return (
        <>
            <AnimatePresence>
                {isMobile && isSidebarExpanded && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[80] lg:hidden pointer-events-auto" 
                        onClick={() => setSidebarExpanded(false)} 
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{ 
                    width: isMobile ? (isSidebarExpanded ? 272 : 0) : (isSidebarExpanded ? 250 : (isHome ? 80 : 0)),
                    x: isMobile ? (isSidebarExpanded ? 0 : -272) : (isHome || isSidebarExpanded ? 0 : -80),
                    opacity: (isMobile || (!isHome && !isSidebarExpanded)) ? (isSidebarExpanded ? 1 : 0) : 1
                }}
                transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 38, 
                    mass: 1,
                    restDelta: 0.001
                }}
                className={cn(
                    "h-full transition-colors duration-300",
                    isMobile ? cn("fixed top-0 left-0 z-[90] rounded-r-[2rem] bg-base", isSidebarExpanded && "border-r border-default") : cn("relative", isSidebarExpanded && "border-r border-default"),
                    (!isMobile && isSidebarExpanded) ? "bg-base/95 backdrop-blur-3xl shadow-2xl absolute left-0 z-[60]" : (!isMobile ? "bg-transparent absolute left-0 z-[60]" : ""),
                    "flex flex-col overflow-hidden",
                    (isMobile || !isHome) && !isSidebarExpanded ? "pointer-events-none" : "pointer-events-auto"
                )}
            >
                {/* Mobile close button space (only rendered on mobile) */}
                {isMobile && isSidebarExpanded && (
                    <div className={cn("h-[4.25rem] flex items-center justify-end px-5 relative z-10 shrink-0")}>
                        <button 
                            onClick={() => setSidebarExpanded(false)} 
                            className="p-2 text-tertiary hover:text-primary hover:bg-sunken rounded-xl transition-all active:scale-95 lg:hidden"
                            aria-label="Close menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* ── Navigation ── */}
                <nav className={cn(
                    "flex-1 pt-4 pb-2 space-y-0.5 overflow-y-auto overflow-x-hidden relative z-10 scrollbar-none",
                    effectiveCollapsed ? "px-2.5" : "px-4"
                )}>

                    {/* Admin section items */}
                    {user?.role === 'Admin' && (
                        <div className={cn("mb-4", !effectiveCollapsed && "space-y-0.5")}>
                            {!effectiveCollapsed && (
                                <motion.p 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }}
                                    className="px-3 pb-1.5 text-[10px] font-bold text-tertiary uppercase tracking-[0.14em]"
                                >
                                    System
                                </motion.p>
                            )}
                            {effectiveCollapsed && <div className="h-2" />}

                                <NavLink 
                                    to="/admin" end 
                                    onClick={() => setSidebarExpanded(false)}
                                    className={({ isActive }) => cn(
                                        "group relative flex transition-all duration-200 select-none",
                                        effectiveCollapsed 
                                            ? "flex-col items-center justify-center py-3.5 w-14 mx-auto rounded-xl gap-1.5" 
                                            : "items-center gap-3 px-3 py-2.5 rounded-xl w-full",
                                        isActive ? "text-theme" : "text-tertiary hover:text-primary"
                                    )}
                                >
                                {({ isActive }) => (
                                    <>
                                        <span className={cn(
                                            "absolute inset-0 transition-opacity duration-150 rounded-xl bg-sunken",
                                            isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                                        )} />
                                        <ShieldAlert strokeWidth={isActive ? (effectiveCollapsed ? 1.75 : 2) : 1.5} className={cn("relative z-10 shrink-0 transition-all", effectiveCollapsed ? "w-6 h-6" : "w-5 h-5")} />
                                        
                                        {effectiveCollapsed ? (
                                            <span className={cn("relative z-10 text-[9px] leading-tight text-center truncate px-1 w-full", isActive ? "font-bold text-theme" : "font-medium opacity-70")}>System</span>
                                        ) : (
                                            <span className={cn("relative z-10 text-sm truncate leading-tight", isActive ? "font-semibold text-theme" : "font-medium")}>Admin Panel</span>
                                        )}
                                    </>
                                )}
                            </NavLink>

                                <NavLink 
                                    to="/admin/security" 
                                    onClick={() => setSidebarExpanded(false)}
                                    className={({ isActive }) => cn(
                                        "group relative flex transition-all duration-200 select-none",
                                        effectiveCollapsed 
                                            ? "flex-col items-center justify-center py-3.5 w-14 mx-auto rounded-xl gap-1.5" 
                                            : "items-center gap-3 px-3 py-2.5 rounded-xl w-full",
                                        isActive ? "text-danger" : "text-tertiary hover:text-danger"
                                    )}
                                >
                                {({ isActive }) => (
                                    <>
                                        <span className={cn(
                                            "absolute inset-0 transition-opacity duration-150 rounded-xl bg-sunken",
                                            isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                                        )} />
                                        <Activity strokeWidth={isActive ? (effectiveCollapsed ? 1.75 : 2) : 1.5} className={cn("relative z-10 shrink-0 transition-all", effectiveCollapsed ? "w-6 h-6" : "w-5 h-5")} />
                                        
                                        {effectiveCollapsed ? (
                                            <span className={cn("relative z-10 text-[9px] leading-tight text-center truncate px-1 w-full", isActive ? "font-bold text-danger" : "font-medium opacity-70")}>Security</span>
                                        ) : (
                                            <span className={cn("relative z-10 text-sm truncate leading-tight", isActive ? "font-semibold text-danger" : "font-medium")}>Security Feed</span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        </div>
                    )}

                    {/* Main nav section label */}
                    {!effectiveCollapsed && (
                        <motion.p 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="px-3 pb-1.5 text-[10px] font-bold text-tertiary uppercase tracking-[0.14em]"
                        >
                            {isAdminSection ? 'Overview' : 'Navigation'}
                        </motion.p>
                    )}
                    {effectiveCollapsed && !user?.role === 'Admin' && <div className="h-2" />}

                    {/* Nav items */}
                    <div className="space-y-0.5">
                        {visibleNavItems.map((item) => (
                            <SidebarItem 
                                key={item.path} 
                                item={item} 
                                isActive={location.pathname === item.path}
                                onClose={() => setSidebarExpanded(false)} 
                                onPrefetch={handlePrefetch} 
                                isCollapsed={effectiveCollapsed}
                                unreadTotal={unreadTotal}
                            />
                        ))}


                    </div>
                </nav>

                {/* ── Thin divider ── */}
                <div className={cn(
                    "relative z-10 mx-4 shrink-0",
                    "h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"
                )} />

                {/* ── Footer ── */}
                <div className={cn(
                    "relative z-10 shrink-0 pt-3 pb-4",
                    effectiveCollapsed ? "px-2.5" : "px-4"
                )}>
                    {/* Settings & theme toggle */}
                    <div className={cn("space-y-0.5 mb-3")}>
                        {!isAdminSection && (
                            <NavLink 
                                to="/settings" 
                                onClick={() => setSidebarExpanded(false)}
                                className={({ isActive }) => cn(
                                    "group relative flex items-center transition-all duration-200 select-none",
                                    effectiveCollapsed 
                                        ? "justify-center h-10 w-10 mx-auto rounded-xl" 
                                        : "gap-3 px-3 py-2.5 rounded-xl w-full",
                                    isActive ? "text-theme" : "text-tertiary hover:text-primary"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className={cn(
                                            "absolute inset-0 rounded-xl transition-opacity duration-200",
                                            "bg-gradient-to-r from-accent-500/12 to-accent-500/6 border border-accent-500/20",
                                            isActive ? "opacity-100" : "opacity-0"
                                        )} />
                                        <span className={cn(
                                            "absolute inset-0 rounded-xl transition-opacity duration-150 bg-white/5",
                                            isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                                        )} />
                                        <Settings strokeWidth={isActive ? 2 : 1.75} className="w-4 h-4 relative z-10 shrink-0" />
                                        {!effectiveCollapsed && (
                                            <span className={cn(
                                                "relative z-10 text-sm truncate",
                                                isActive ? "font-semibold" : "font-medium"
                                            )}>Settings</span>
                                        )}
                                        {!effectiveCollapsed && (
                                            <span className={cn(
                                                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-theme transition-all duration-200",
                                                isActive ? "h-4 opacity-100" : "h-0 opacity-0"
                                            )} />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        )}

                        {/* Theme toggle */}
                        <button 
                            onClick={() => startTransition(() => setMode(mode === MODES.DARK ? MODES.LIGHT : MODES.DARK))}
                            className={cn(
                                "group relative w-full flex transition-all duration-200 select-none text-tertiary hover:text-primary",
                                effectiveCollapsed 
                                    ? "flex-col items-center justify-center py-3.5 w-14 mx-auto rounded-xl gap-1.5"
                                    : "items-center gap-3 px-3 py-2.5 rounded-xl"
                            )}
                        >
                            <span className="absolute inset-0 rounded-xl transition-opacity duration-150 bg-sunken opacity-0 group-hover:opacity-100" />
                            {mode === MODES.DARK 
                                ? <Sun className={cn("relative z-10 shrink-0 transition-all", effectiveCollapsed ? "w-6 h-6" : "w-5 h-5")} strokeWidth={1.5} />
                                : <Moon className={cn("relative z-10 shrink-0 transition-all", effectiveCollapsed ? "w-6 h-6" : "w-5 h-5")} strokeWidth={1.5} />
                            }
                            {effectiveCollapsed ? (
                                <span className="relative z-10 text-[9px] leading-tight text-center truncate opacity-70 font-medium px-1 w-full">Theme</span>
                            ) : (
                                <span className="relative z-10 text-sm font-medium">
                                    {mode === MODES.DARK ? 'Light Mode' : 'Dark Mode'}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* User profile card */}
                    <div className={cn(
                        "rounded-xl border border-white/8 bg-white/4 transition-all duration-200",
                        "hover:bg-white/6 hover:border-white/12",
                        effectiveCollapsed 
                            ? "p-1.5 flex flex-col items-center gap-2" 
                            : "p-1.5 flex items-center gap-2.5"
                    )}>
                        {/* Avatar */}
                        <Link 
                            to="/profile" 
                            onClick={() => setSidebarExpanded(false)} 
                            className={cn(
                                "shrink-0 rounded-full overflow-hidden transition-all duration-150",
                                "w-9 h-9 flex items-center justify-center",
                                "bg-gradient-to-br from-accent-500/20 to-accent-600/20"
                            )}
                        >
                            {user?.avatar 
                                ? <img 
                                    src={getOptimizedAvatar(user.avatar)} 
                                    alt={user.name} 
                                    width={36} height={36} 
                                    loading="lazy" decoding="async" 
                                    className="w-full h-full object-cover" 
                                  /> 
                                : <UserCircle className="w-6 h-6 text-theme" />
                            }
                        </Link>

                        {!effectiveCollapsed && (
                            <>
                                <Link to="/profile" className="flex flex-col min-w-0 flex-1 group/profile">
                                    <span className="text-[13px] font-semibold text-primary truncate leading-tight group-hover/profile:text-theme transition-colors duration-150">
                                        {user?.name}
                                    </span>
                                    <span className="text-[10px] font-medium text-tertiary truncate leading-tight capitalize mt-0.5">
                                        {user?.role} • Lvl {user?.gamification?.level || 1}
                                    </span>
                                    {/* XP Progress Bar Small */}
                                    <div className="w-full h-1.5 mt-1.5 bg-black/20 rounded-full overflow-hidden border border-white/5 relative">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-theme to-theme-highlight rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(var(--theme-rgb),0.5)]"
                                            style={{ width: `${Math.min(100, Math.max(5, ((user?.gamification?.xp || 0) % 500) / 500 * 100))}%` }}
                                        />
                                    </div>
                                </Link>
                                <button 
                                    onClick={handleLogout} 
                                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-tertiary hover:text-danger hover:bg-danger/10 transition-all duration-150"
                                    aria-label="Log out"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}

                        {effectiveCollapsed && (
                            <button 
                                onClick={handleLogout} 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-tertiary hover:text-danger hover:bg-danger/10 transition-all duration-150"
                                aria-label="Log out"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default memo(SidebarComponent);
