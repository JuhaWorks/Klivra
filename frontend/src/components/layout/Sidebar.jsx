import React, { memo } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, 
    FolderKanban, 
    CheckSquare, 
    Presentation, 
    ShieldAlert, 
    Activity, 
    Settings, 
    LogOut, 
    X,
    ChevronRight,
    Sun,
    Moon,
    UserCircle
} from 'lucide-react';
import { useAuthStore, api } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme, MODES } from '../../store/useTheme';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
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
            className={({ isActive: linkActive }) => twMerge(clsx(
                "group relative flex items-center rounded-2xl transition-all duration-200",
                isCollapsed ? "justify-center h-12 w-full px-0" : "gap-4 px-4 py-3",
                "hover:bg-sunken active:scale-[0.98]",
                linkActive ? "text-theme" : "text-tertiary hover:text-primary"
            ))}
        >
            {isActive && (
                <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-theme/5 rounded-2xl border border-theme/20 shadow-[0_0_20px_rgba(var(--theme-rgb),0.05)] backdrop-blur-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
            )}
            
            <Icon className={twMerge(clsx(
                "w-5 h-5 transition-colors z-10 shrink-0",
                isActive ? "text-theme" : "group-hover:text-theme-lt"
            ))} />
            
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
                    className={twMerge(clsx(
                        "w-1.5 h-1.5 rounded-full bg-theme shadow-theme z-10",
                        isCollapsed ? "absolute bottom-1 left-1/2 -translate-x-1/2" : "ml-auto"
                    ))}
                />
            )}
        </NavLink>
    );
});

const SidebarComponent = ({ isOpen, isCollapsed, onClose, onToggleCollapse }) => {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { mode, setMode } = useTheme();

    const isAdminSection = location.pathname.startsWith('/admin');

    const handlePrefetch = (path) => {
        if (path === '/projects') {
            queryClient.prefetchQuery({
                queryKey: ['projects'],
                queryFn: async () => {
                    const res = await api.get('/projects');
                    return res.data;
                },
                staleTime: 1000 * 60 * 5
            });
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const visibleNavItems = isAdminSection 
        ? navItems.filter(item => item.path === '/')
        : navItems;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden" 
                        onClick={onClose} 
                    />
                )}
            </AnimatePresence>

            <motion.aside 
                initial={false}
                animate={{ 
                    width: isOpen ? (isCollapsed ? 80 : 280) : 0,
                    x: isOpen ? 0 : -280
                }}
                transition={{ 
                    type: 'spring', 
                    stiffness: 300, 
                    damping: 35,
                    mass: 0.8
                }}
                style={{ willChange: 'width, transform' }}
                className={twMerge(clsx(
                "fixed inset-y-0 left-0 z-50 glass-2 border-r border-default bg-surface/95 backdrop-blur-xl",
                "flex flex-col rounded-none shadow-2xl shadow-black/50 overflow-hidden"
            ))}>
                {/* Theme Ambient Effect */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent-bg to-transparent pointer-events-none" />

                {/* Brand */}
                <div className={twMerge(clsx(
                    "h-20 flex items-center relative z-10 shrink-0",
                    isCollapsed ? "justify-center px-0" : "gap-4 px-6"
                ))}>
                    <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-xl shadow-accent-500/10 active:scale-95 transition-transform">
                        <span className="text-white font-black text-xl">K</span>
                    </div>
                    {!isCollapsed && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col min-w-0"
                        >
                            <span className="text-lg font-black tracking-tighter text-primary truncate">Klivra</span>
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest truncate">{isAdminSection ? 'Administration' : 'Workspace'}</span>
                        </motion.div>
                    )}
                    <button 
                        onClick={onToggleCollapse} 
                        className="hidden lg:flex ml-auto p-2 text-tertiary hover:text-primary rounded-xl transition-all hover:bg-sunken"
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <ChevronRight className={twMerge(clsx("w-5 h-5 transition-transform duration-300", !isCollapsed && "rotate-180"))} />
                    </button>
                    {!isCollapsed && (
                        <button 
                            onClick={onClose} 
                            className="p-2 text-tertiary hover:text-rose-500 rounded-xl transition-all hover:bg-rose-500/5 lg:hidden"
                            title="Hide Sidebar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className={twMerge(clsx(
                    "flex-1 py-6 space-y-2 overflow-y-auto overflow-x-hidden relative z-10 scrollbar-hide",
                    isCollapsed ? "px-2" : "px-4"
                ))}>
                    {!isCollapsed && (
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-4 mb-4 text-[10px] font-black text-tertiary uppercase tracking-[0.2em]"
                        >
                            {isAdminSection ? 'System Control' : 'Navigation'}
                        </motion.p>
                    )}

                    {user?.role === 'Admin' && (
                        <div className="mb-6 space-y-2 px-1">
                            <NavLink
                                to="/admin"
                                end
                                onClick={onClose}
                                className={({ isActive }) => twMerge(clsx(
                                    "flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                                    isCollapsed ? "justify-center h-12 w-full px-0" : "gap-4 px-4 py-3",
                                    isActive 
                                        ? "bg-theme/10 text-theme border border-theme/20" 
                                        : "text-tertiary hover:text-primary hover:bg-sunken"
                                ))}
                            >
                                <ShieldAlert className="w-5 h-5 shrink-0" />
                                {!isCollapsed && <span>Admin Panel</span>}
                                {!isCollapsed && (
                                    <motion.span 
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="ml-auto w-2 h-2 rounded-full bg-theme shadow-theme"
                                    />
                                )}
                            </NavLink>
                            
                            <NavLink
                                to="/admin/security"
                                onClick={onClose}
                                className={({ isActive }) => twMerge(clsx(
                                    "flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                                    isCollapsed ? "justify-center h-12 w-full px-0" : "gap-4 px-4 py-3",
                                    isActive 
                                        ? "bg-danger/10 text-danger border border-danger/20" 
                                        : "text-tertiary hover:text-danger hover:bg-danger/5"
                                ))}
                            >
                                <Activity className="w-5 h-5 shrink-0" />
                                {!isCollapsed && <span>Security Feed</span>}
                            </NavLink>
                        </div>
                    )}

                    <div className="space-y-1">
                        {visibleNavItems.map((item) => (
                            <SidebarItem 
                                key={item.path} 
                                item={item} 
                                isActive={location.pathname === item.path}
                                onClose={onClose} 
                                onPrefetch={handlePrefetch}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </div>
                </nav>

                {/* Optimized Footer Hierarchy */}
                <div className={twMerge(clsx(
                    "mt-auto border-t border-default relative z-10 shrink-0",
                    isCollapsed ? "p-3" : "p-4"
                ))}>
                    {/* Part 1: Operational Actions */}
                    <div className="space-y-1 mb-6">
                        {!isAdminSection && (
                            <NavLink
                                to="/settings"
                                onClick={onClose}
                                className={({ isActive }) => twMerge(clsx(
                                    "flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                                    isCollapsed ? "justify-center h-11 w-full px-0" : "gap-4 px-4 py-3",
                                    isActive ? "bg-theme/10 text-theme border border-theme/20" : "text-tertiary hover:text-primary hover:bg-surface-lighter"
                                ))}
                            >
                                <Settings className="w-5 h-5 shrink-0" />
                                {!isCollapsed && <span>Settings</span>}
                            </NavLink>
                        )}

                        <button
                            onClick={() => setMode(mode === MODES.DARK ? MODES.LIGHT : MODES.DARK)}
                            className={twMerge(clsx(
                                "w-full flex items-center rounded-2xl text-sm font-bold transition-all duration-300",
                                isCollapsed ? "justify-center h-11 px-0" : "gap-4 px-4 py-3",
                                "text-tertiary hover:text-primary hover:bg-surface-lighter"
                            ))}
                        >
                            {mode === MODES.DARK ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            {!isCollapsed && <span>{mode === MODES.DARK ? 'Light Mode' : 'Dark Mode'}</span>}
                        </button>
                    </div>

                    {/* Part 2: Identity & Session */}
                    <div className={twMerge(clsx(
                        "rounded-[2rem] bg-surface-lighter border border-default transition-all p-1.5",
                        isCollapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-3 pr-3"
                    ))}>
                        <Link 
                            to="/profile"
                            onClick={onClose}
                            className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-theme-muted to-theme/20 border border-theme/10 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
                        >
                            {user?.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle className="w-6 h-6 text-theme" />
                            )}
                        </Link>
                        
                        {!isCollapsed && (
                            <Link to="/profile" className="flex flex-col min-w-0 flex-1 group">
                                <span className="text-sm font-black text-primary truncate group-hover:text-theme transition-colors">{user?.name}</span>
                                <span className="text-[10px] font-black text-tertiary uppercase tracking-tighter truncate">{user?.role}</span>
                            </Link>
                        )}

                        {!isCollapsed && (
                            <button 
                                onClick={handleLogout}
                                className="p-2 text-tertiary hover:text-danger transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}

                        {isCollapsed && (
                             <button 
                                onClick={handleLogout}
                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-tertiary hover:text-danger hover:bg-danger/5 transition-all"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default memo(SidebarComponent);
