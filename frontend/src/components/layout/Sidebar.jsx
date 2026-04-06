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
import GlassSurface from '../ui/GlassSurface';
import { getOptimizedAvatar } from '../../utils/avatar';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/', labelDescription: 'Project Overview' },
    { icon: Briefcase, label: 'Projects', path: '/projects', labelDescription: 'Manage Projects' },
    { icon: Calendar, label: 'Planning', path: '/tasks', labelDescription: 'Project Roadmap' },
    { icon: Compass, label: 'Network', path: '/networking', labelDescription: 'Member Directory' },
    { icon: MessageSquare, label: 'Collaboration', path: '/whiteboard/main-workspace', labelDescription: 'Shared Workspace' },
];

const SidebarItem = memo(({ item, isActive, onClose, onPrefetch, isCollapsed }) => {
    const Icon = item.icon;
    
    return (
        <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={onClose}
            onMouseEnter={() => onPrefetch(item.path)}
            className={({ isActive: linkActive }) => cn(
                "sidebar-nav-item group relative flex items-center transition-all duration-200 select-none",
                isCollapsed 
                    ? "justify-center h-11 w-11 mx-auto rounded-2xl" 
                    : "gap-3 px-3 py-2.5 rounded-xl w-full",
                linkActive 
                    ? "text-theme" 
                    : "text-tertiary hover:text-primary"
            )}
        >
            {/* Active background fill */}
            <span className={cn(
                "absolute inset-0 rounded-xl transition-opacity duration-200",
                isCollapsed ? "rounded-2xl" : "rounded-xl",
                "bg-gradient-to-r from-accent-500/12 to-accent-500/6 border border-accent-500/20",
                isActive ? "opacity-100" : "opacity-0"
            )} />

            {/* Hover background */}
            <span className={cn(
                "absolute inset-0 transition-opacity duration-150",
                isCollapsed ? "rounded-2xl" : "rounded-xl",
                "bg-white/5",
                isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            )} />

            {/* Icon container */}
            <span className={cn(
                "relative z-10 flex items-center justify-center shrink-0 transition-all duration-200",
                isCollapsed ? "w-5 h-5" : "w-5 h-5",
                isActive ? "text-theme" : "group-hover:text-theme/70"
            )}>
                <Icon strokeWidth={isActive ? 2 : 1.75} className="w-full h-full" />
            </span>

            {!isCollapsed && (
                <span className="relative z-10 flex flex-col min-w-0 flex-1">
                    <span className={cn(
                        "text-sm leading-tight truncate transition-colors duration-150",
                        isActive ? "font-semibold text-theme" : "font-medium"
                    )}>
                        {item.label}
                    </span>
                </span>
            )}

            {/* Active left accent bar */}
            {!isCollapsed && (
                <span className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-theme transition-all duration-200",
                    isActive ? "h-5 opacity-100" : "h-0 opacity-0"
                )} />
            )}

            {/* Collapsed active dot */}
            {isCollapsed && (
                <span className={cn(
                    "absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-theme transition-all duration-200",
                    isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
            )}
        </NavLink>
    );
});

const SidebarComponent = () => {
    const { logout, user } = useAuthStore();
    const { isSidebarExpanded, isCollapsed, toggleSidebar, toggleCollapse, setSidebarExpanded, setCollapsed } = useUIStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { mode, setMode } = useTheme();
    
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

    const chunkMap = {
        '/': () => import('../../pages/Home'),
        '/projects': () => import('../../pages/Projects'),
        '/tasks': () => import('../../pages/Tasks'),
        '/networking': () => import('../../pages/Networking'),
        '/settings': () => import('../../pages/Settings'),
        '/profile': () => import('../../pages/Profile'),
        '/whiteboard/main-workspace': () => import('../tools/Whiteboard'),
        '/admin': () => import('../../pages/AdminDashboard'),
        '/admin/security': () => import('../../pages/SecurityFeed'),
    };

    const handlePrefetch = useCallback((path) => {
        chunkMap[path]?.();
        if (path === '/projects') {
            queryClient.prefetchQuery({
                queryKey: ['projects'],
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

    const effectiveCollapsed = isMobile ? false : isCollapsed;

    return (
        <>
            <AnimatePresence>
                {isMobile && isSidebarExpanded && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[80] lg:hidden pointer-events-auto" 
                        onClick={() => setSidebarExpanded(false)} 
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{ 
                    width: isMobile ? (isSidebarExpanded ? 272 : 0) : (isSidebarExpanded ? (effectiveCollapsed ? 72 : 272) : 0),
                    x: isSidebarExpanded ? 0 : -272,
                    opacity: isMobile && !isSidebarExpanded ? 0 : 1
                }}
                transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 38, 
                    mass: 1,
                    restDelta: 0.001
                }}
                className={cn(
                    "h-full border-r border-default shadow-modal transition-shadow",
                    isMobile ? "fixed top-0 left-0 z-[90] rounded-r-[2rem]" : "relative rounded-r-[1.75rem]",
                    "flex flex-col overflow-hidden",
                    isSidebarExpanded ? "pointer-events-auto" : "pointer-events-none"
                )}
                style={{ borderRightColor: 'var(--border-glass)' }}
            >
                {/* GLASS BACKGROUND */}
                <div className="absolute inset-0 z-0">
                    <GlassSurface 
                        width="100%" height="100%" borderRadius={0} displace={0.6} distortionScale={-60} 
                        backgroundOpacity={mode === MODES.DARK ? 0.08 : 0.20} opacity={0.96} blur={24}
                    />
                </div>

                {/* Subtle vertical gradient accent at top */}
                <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-accent-500/8 via-accent-500/3 to-transparent pointer-events-none z-[1]" />
                
                {/* Subtle inner right border glow */}
                <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-accent-500/20 via-transparent to-transparent pointer-events-none z-[1]" />

                {/* ── Brand Header ── */}
                <div className={cn(
                    "h-[4.25rem] flex items-center relative z-10 shrink-0",
                    effectiveCollapsed ? "justify-center px-0" : "gap-3 px-5"
                )}>
                    {/* Logo */}
                    <div className={cn(
                        "shrink-0 rounded-xl overflow-hidden transition-all duration-200",
                        "shadow-[0_2px_8px_rgba(0,0,0,0.24)] ring-1 ring-white/10",
                        effectiveCollapsed ? "w-9 h-9" : "w-8 h-8"
                    )}>
                        <img 
                            src="/logo.png" alt="Klivra logo" 
                            width={40} height={40} 
                            fetchPriority="high" 
                            className="w-full h-full object-cover" 
                        />
                    </div>

                    {!effectiveCollapsed && (
                        <motion.div 
                            initial={{ opacity: 0, x: -6 }} 
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-col min-w-0 flex-1"
                        >
                            <span className="text-[17px] font-black tracking-tight text-primary leading-none mt-1">
                                klivra
                            </span>
                            <span className="text-[10px] font-semibold text-tertiary uppercase tracking-[0.14em] mt-1.5">
                                {isAdminSection ? 'Administration' : 'Workspace'}
                            </span>
                        </motion.div>
                    )}

                    {/* Desktop collapse toggle */}
                    <button 
                        onClick={toggleCollapse} 
                        className={cn(
                            "hidden lg:flex items-center justify-center shrink-0",
                            "w-7 h-7 rounded-lg transition-all duration-150",
                            "text-tertiary hover:text-primary hover:bg-white/8",
                            "border border-transparent hover:border-white/8",
                            effectiveCollapsed ? "ml-0" : "ml-auto"
                        )}
                        aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <ChevronRight className={cn(
                            "w-3.5 h-3.5 transition-transform duration-300",
                            !effectiveCollapsed && "rotate-180"
                        )} />
                    </button>

                    {/* Mobile close button */}
                    {isMobile && isSidebarExpanded && (
                        <button 
                            onClick={() => setSidebarExpanded(false)} 
                            className="p-2 text-tertiary hover:text-primary hover:bg-white/8 rounded-xl transition-all active:scale-95 lg:hidden ml-auto"
                            aria-label="Close menu"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* ── Thin divider ── */}
                <div className={cn(
                    "relative z-10 mx-4 shrink-0",
                    "h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"
                )} />

                {/* ── Navigation ── */}
                <nav className={cn(
                    "flex-1 pt-4 pb-2 space-y-0.5 overflow-y-auto overflow-x-hidden relative z-10 scrollbar-none",
                    effectiveCollapsed ? "px-2.5" : "px-3"
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
                                onClick={() => isMobile && setSidebarExpanded(false)}
                                className={({ isActive }) => cn(
                                    "group relative flex items-center transition-all duration-200 select-none",
                                    effectiveCollapsed 
                                        ? "justify-center h-11 w-11 mx-auto rounded-2xl" 
                                        : "gap-3 px-3 py-2.5 rounded-xl w-full",
                                    isActive ? "text-theme" : "text-tertiary hover:text-primary"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className={cn(
                                            "absolute inset-0 transition-opacity duration-200",
                                            effectiveCollapsed ? "rounded-2xl" : "rounded-xl",
                                            "bg-gradient-to-r from-accent-500/12 to-accent-500/6 border border-accent-500/20",
                                            isActive ? "opacity-100" : "opacity-0"
                                        )} />
                                        <span className={cn(
                                            "absolute inset-0 transition-opacity duration-150",
                                            effectiveCollapsed ? "rounded-2xl" : "rounded-xl",
                                            "bg-white/5",
                                            isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                                        )} />
                                        <ShieldAlert strokeWidth={isActive ? 2 : 1.75} className="w-5 h-5 relative z-10 shrink-0" />
                                        {!effectiveCollapsed && (
                                            <span className={cn(
                                                "relative z-10 text-sm truncate leading-tight",
                                                isActive ? "font-semibold" : "font-medium"
                                            )}>Admin Panel</span>
                                        )}
                                        {!effectiveCollapsed && (
                                            <span className={cn(
                                                "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-theme transition-all duration-200",
                                                isActive ? "h-5 opacity-100" : "h-0 opacity-0"
                                            )} />
                                        )}
                                    </>
                                )}
                            </NavLink>

                            <NavLink 
                                to="/admin/security" 
                                onClick={() => isMobile && setSidebarExpanded(false)}
                                className={({ isActive }) => cn(
                                    "group relative flex items-center transition-all duration-200 select-none",
                                    effectiveCollapsed 
                                        ? "justify-center h-11 w-11 mx-auto rounded-2xl" 
                                        : "gap-3 px-3 py-2.5 rounded-xl w-full",
                                    isActive ? "text-danger" : "text-tertiary hover:text-danger"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className={cn(
                                            "absolute inset-0 transition-opacity duration-200",
                                            effectiveCollapsed ? "rounded-2xl" : "rounded-xl",
                                            "bg-gradient-to-r from-danger/12 to-danger/6 border border-danger/20",
                                            isActive ? "opacity-100" : "opacity-0"
                                        )} />
                                        <span className={cn(
                                            "absolute inset-0 transition-opacity duration-150",
                                            effectiveCollapsed ? "rounded-2xl" : "rounded-xl",
                                            "bg-white/5",
                                            isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                                        )} />
                                        <Activity strokeWidth={isActive ? 2 : 1.75} className="w-5 h-5 relative z-10 shrink-0" />
                                        {!effectiveCollapsed && (
                                            <span className={cn(
                                                "relative z-10 text-sm truncate leading-tight",
                                                isActive ? "font-semibold" : "font-medium"
                                            )}>Security Feed</span>
                                        )}
                                        {!effectiveCollapsed && isActive && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-danger opacity-100" />
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
                                onClose={() => isMobile && setSidebarExpanded(false)} 
                                onPrefetch={handlePrefetch} 
                                isCollapsed={effectiveCollapsed}
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
                    effectiveCollapsed ? "px-2.5" : "px-3"
                )}>
                    {/* Settings & theme toggle */}
                    <div className={cn("space-y-0.5 mb-3")}>
                        {!isAdminSection && (
                            <NavLink 
                                to="/settings" 
                                onClick={() => isMobile && setSidebarExpanded(false)}
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
                                "group relative w-full flex items-center transition-all duration-200 select-none text-tertiary hover:text-primary",
                                effectiveCollapsed 
                                    ? "justify-center h-10 w-10 mx-auto rounded-xl" 
                                    : "gap-3 px-3 py-2.5 rounded-xl"
                            )}
                        >
                            <span className="absolute inset-0 rounded-xl transition-opacity duration-150 bg-white/5 opacity-0 group-hover:opacity-100" />
                            {mode === MODES.DARK 
                                ? <Sun className="w-4 h-4 relative z-10 shrink-0" strokeWidth={1.75} />
                                : <Moon className="w-4 h-4 relative z-10 shrink-0" strokeWidth={1.75} />
                            }
                            {!effectiveCollapsed && (
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
                            onClick={() => isMobile && setSidebarExpanded(false)} 
                            className={cn(
                                "shrink-0 rounded-lg overflow-hidden transition-all duration-150",
                                "ring-1 ring-white/10 hover:ring-accent-500/40",
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
                                : <UserCircle className="w-5 h-5 text-theme" />
                            }
                        </Link>

                        {!effectiveCollapsed && (
                            <>
                                <Link to="/profile" className="flex flex-col min-w-0 flex-1 group/profile">
                                    <span className="text-[13px] font-semibold text-primary truncate leading-tight group-hover/profile:text-theme transition-colors duration-150">
                                        {user?.name}
                                    </span>
                                    <span className="text-[10px] font-medium text-tertiary truncate leading-tight capitalize mt-0.5">
                                        {user?.role}
                                    </span>
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
