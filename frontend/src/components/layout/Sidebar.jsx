import React, { memo, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, FolderKanban, CheckSquare, Presentation, ShieldAlert, 
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
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Network', path: '/networking', icon: Users2, hideForAdmin: true },
    { label: 'Whiteboard', path: '/whiteboard/main-workspace', icon: Presentation },
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
                "group relative flex items-center rounded-2xl transition-all duration-200",
                isCollapsed ? "justify-center h-12 w-full px-0" : "gap-4 px-4 py-3",
                "hover:bg-theme/5 active:scale-[0.98]",
                linkActive ? "text-theme" : "text-secondary hover:text-primary"
            )}
        >
            {isActive && (
                <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-2xl bg-theme/10 border border-theme/20 shadow-[0_0_20px_rgba(var(--theme-rgb),0.05)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
            )}
            
            <Icon className={cn(
                "w-5 h-5 transition-colors z-10 shrink-0",
                isActive ? "text-theme" : "group-hover:text-theme-lt"
            )} />
            
            <AnimatePresence mode="wait">
                {!isCollapsed && (
                    <motion.span 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={{ duration: 0.15 }}
                        className="font-bold text-sm tracking-tight z-10 truncate"
                    >
                        {item.label}
                    </motion.span>
                )}
            </AnimatePresence>
            
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                        "w-1.5 h-1.5 rounded-full bg-theme shadow-theme z-10",
                        isCollapsed ? "absolute bottom-1 left-1/2 -translate-x-1/2" : "ml-auto"
                    )}
                />
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

    const handlePrefetch = (path) => {
        if (path === '/projects') {
            queryClient.prefetchQuery({
                queryKey: ['projects'],
                queryFn: async () => (await api.get('/projects')).data,
                staleTime: 1000 * 60 * 5
            });
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const visibleNavItems = (user?.role === 'Admin' || isAdminSection)
        ? navItems.filter(item => item.path === '/')
        : navItems;

    // Don't use effectively "isCollapsed" when on mobile drawer, force expanded look
    const effectiveCollapsed = isMobile ? false : isCollapsed;

    return (
        <>
            <AnimatePresence>
                {isMobile && isSidebarExpanded && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[80] lg:hidden" 
                        onClick={() => setSidebarExpanded(false)} 
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{ 
                    width: isMobile ? (isSidebarExpanded ? 280 : 0) : (isSidebarExpanded ? (effectiveCollapsed ? 80 : 280) : 0),
                    x: isSidebarExpanded ? 0 : -280,
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
                    isMobile ? "fixed top-0 left-0 z-[90] rounded-r-[2.5rem]" : "relative rounded-r-[2rem]",
                    "flex flex-col overflow-hidden bg-black/20",
                    !isSidebarExpanded && "pointer-events-none"
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

                {/* Theme Ambient Effect */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent-500/5 to-transparent pointer-events-none z-[-1]" />

                {/* Brand */}
                <div className={cn("h-20 flex items-center relative z-10 shrink-0", effectiveCollapsed ? "justify-center px-0" : "gap-4 px-6")}>
                    <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-xl shadow-accent-500/10 active:scale-95 transition-transform overflow-hidden">
                        <img src="/logo.png?v=2" alt="klvira logo" width={40} height={40} className="w-full h-full object-cover" />
                    </div>
                    {!effectiveCollapsed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-w-0">
                            <span className="text-lg font-black tracking-tighter text-primary truncate">klvira</span>
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest truncate">{isAdminSection ? 'Administration' : 'Workspace'}</span>
                        </motion.div>
                    )}
                    <button 
                        onClick={toggleCollapse} 
                        className="hidden lg:flex ml-auto p-2 text-tertiary hover:text-primary rounded-xl transition-all hover:bg-white/5"
                    >
                        <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", !effectiveCollapsed && "rotate-180")} />
                    </button>
                    {isMobile && isSidebarExpanded && (
                        <button 
                            onClick={() => setSidebarExpanded(false)} 
                            className="p-2.5 text-primary bg-white/10 hover:bg-rose-500/10 hover:text-rose-500 rounded-2xl transition-all active:scale-95 lg:hidden ml-auto border border-white/5"
                            aria-label="Close menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className={cn("flex-1 py-6 space-y-2 overflow-y-auto overflow-x-hidden relative z-10 scrollbar-hide", effectiveCollapsed ? "px-2" : "px-4")}>
                    {!effectiveCollapsed && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 mb-4 text-[10px] font-black text-tertiary uppercase tracking-[0.2em]">
                            {isAdminSection ? 'System Control' : 'Navigation'}
                        </motion.p>
                    )}

                    {user?.role === 'Admin' && (
                        <div className="mb-6 space-y-2 px-1">
                            <NavLink to="/admin" end onClick={() => isMobile && setSidebarExpanded(false)}
                                className={({ isActive }) => cn(
                                    "flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                                    effectiveCollapsed ? "justify-center h-12 w-full px-0" : "gap-4 px-4 py-3",
                                    isActive ? "bg-theme/10 text-theme border border-theme/20" : "text-tertiary hover:text-primary hover:bg-white/5"
                                )}
                            >
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                {!effectiveCollapsed && <span>Admin Panel</span>}
                            </NavLink>
                            <NavLink to="/admin/security" onClick={() => isMobile && setSidebarExpanded(false)}
                                className={({ isActive }) => cn(
                                    "flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                                    effectiveCollapsed ? "justify-center h-12 w-full px-0" : "gap-4 px-4 py-3",
                                    isActive ? "bg-danger/10 text-danger border border-danger/20" : "text-tertiary hover:text-danger hover:bg-danger/5"
                                )}
                            >
                                <Activity className="w-5 h-5 shrink-0" />
                                {!effectiveCollapsed && <span>Security Feed</span>}
                            </NavLink>
                        </div>
                    )}

                    <div className="space-y-1">
                        {visibleNavItems.map((item) => (
                            <SidebarItem 
                                key={item.path} item={item} isActive={location.pathname === item.path}
                                onClose={() => isMobile && setSidebarExpanded(false)} onPrefetch={handlePrefetch} isCollapsed={effectiveCollapsed}
                            />
                        ))}
                    </div>
                </nav>

                {/* Footer */}
                <div className={cn("mt-auto border-t border-white/5 relative z-10 shrink-0", effectiveCollapsed ? "p-3" : "p-4")}>
                    <div className="space-y-1 mb-6">
                        {!isAdminSection && (
                            <NavLink to="/settings" onClick={() => isMobile && setSidebarExpanded(false)}
                                className={({ isActive }) => cn(
                                    "flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                                    effectiveCollapsed ? "justify-center h-11 w-full px-0" : "gap-4 px-4 py-3",
                                    isActive ? "bg-theme/10 text-theme border border-theme/20" : "text-tertiary hover:text-primary hover:bg-white/5"
                                )}
                            >
                                <Settings className="w-5 h-5 shrink-0" />
                                {!effectiveCollapsed && <span>Settings</span>}
                            </NavLink>
                        )}
                        <button onClick={() => setMode(mode === MODES.DARK ? MODES.LIGHT : MODES.DARK)}
                            className={cn("w-full flex items-center rounded-2xl text-sm font-bold transition-all duration-300", effectiveCollapsed ? "justify-center h-11 px-0" : "gap-4 px-4 py-3", "text-tertiary hover:text-primary hover:bg-white/5")}
                        >
                            {mode === MODES.DARK ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            {!effectiveCollapsed && <span>{mode === MODES.DARK ? 'Light Mode' : 'Dark Mode'}</span>}
                        </button>
                    </div>

                    <div className={cn("rounded-[2.5rem] bg-white/5 border border-white/5 transition-all p-1.5", effectiveCollapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-3 pr-3")}>
                        <Link to="/profile" onClick={() => isMobile && setSidebarExpanded(false)} className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500/10 to-accent-500/20 border border-white/10 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform">
                            {user?.avatar ? <img src={getOptimizedAvatar(user.avatar)} alt={user.name} width={40} height={40} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-theme" />}
                        </Link>
                        {!effectiveCollapsed && (
                            <Link to="/profile" className="flex flex-col min-w-0 flex-1 group">
                                <span className="text-sm font-black text-primary truncate group-hover:text-theme transition-colors">{user?.name}</span>
                                <span className="text-[10px] font-black text-tertiary uppercase tracking-tighter truncate">{user?.role}</span>
                            </Link>
                        )}
                        {!effectiveCollapsed && <button onClick={handleLogout} className="p-2 text-tertiary hover:text-danger transition-colors"><LogOut className="w-4 h-4" /></button>}
                        {effectiveCollapsed && <button onClick={handleLogout} className="w-10 h-10 rounded-2xl flex items-center justify-center text-tertiary hover:text-danger hover:bg-danger/5 transition-all"><LogOut className="w-5 h-5" /></button>}
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default memo(SidebarComponent);
