import React, { useState, useRef, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Bell, Menu, User, Settings, LogOut, Command, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GlassSurface from '../ui/GlassSurface';
import { API_BASE } from '../auth/AuthLayout';
import { getOptimizedAvatar } from '../../utils/avatar';

const STATUS_COLOR = {
    Online: 'text-success',
    Away: 'text-warning',
    'Do Not Disturb': 'text-danger',
    Offline: 'text-tertiary',
};


const TopBar = () => {
    const { user, logout } = useAuthStore();
    const { toggleSidebar, isSidebarExpanded } = useUIStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    // Responsive Detection
    const isMobile = useMediaQuery('(max-width: 1024px)');

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <header className="h-16 transition-all duration-300 relative z-50 rounded-b-[3.15rem]">
            <div className="absolute inset-0 z-0 overflow-hidden rounded-b-[3.15rem] backdrop-blur-2xl bg-black/40">
                <GlassSurface width="100%" height="100%" borderRadius="0 0 3.15rem 3.15rem" displace={0.5} distortionScale={-20} backgroundOpacity={0.04} opacity={0.93} />
            </div>
            
            <div className="w-full h-full flex items-center justify-between px-4 sm:px-6 lg:px-10 relative z-10">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 pr-4">
                    <button
                        onClick={toggleSidebar}
                        className={twMerge(clsx(
                            "p-2.5 text-tertiary hover:text-primary rounded-2xl transition-all active:scale-90",
                            isMobile ? "bg-theme/10 text-theme" : "hover:bg-sunken",
                            isMobile && isSidebarExpanded && "opacity-0 pointer-events-none"
                        ))}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="relative hidden sm:block max-w-sm w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary group-focus-within:text-theme transition-colors" />
                        <input
                            type="text"
                            placeholder="Search workspace..."
                            className={twMerge(clsx(
                                "w-full pl-11 pr-4 py-2 bg-sunken border border-default rounded-2xl text-sm text-primary placeholder-tertiary outline-none font-bold",
                                "focus:border-theme/30 focus:ring-4 focus:ring-theme/5 transition-all"
                            ))}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-default bg-surface text-[10px] font-black text-tertiary">
                            <Command className="w-2.5 h-2.5" />
                            <span>K</span>
                        </div>
                    </div>
                    
                    {/* Brand name for very small mobile screens when sidebar is hidden */}
                    {isMobile && (
                        <div className="flex items-center gap-2 sm:hidden overflow-hidden">
                            <img src="/logo.png?v=2" alt="" width={24} height={24} className="w-6 h-6 object-contain opacity-80" />
                            <span className="text-xl font-black tracking-tighter text-primary truncate">klvira</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button className="relative p-2.5 text-tertiary hover:text-primary hover:bg-sunken rounded-2xl transition-all group">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-theme rounded-full border-2 border-base shadow-theme" />
                    </button>

                    <div className="w-px h-6 bg-default mx-1 hidden sm:block" />

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className={twMerge(clsx(
                                "flex items-center gap-3 p-1 rounded-2xl transition-all",
                                dropdownOpen ? "bg-sunken" : "hover:bg-sunken"
                            ))}
                        >
                            <div className="relative">
                                <img
                                    src={getOptimizedAvatar(user?.avatar)}
                                    alt=""
                                    width={36}
                                    height={36}
                                    referrerPolicy="no-referrer"
                                    className="w-9 h-9 rounded-xl border border-default object-cover"
                                />
                                <div className={twMerge(clsx(
                                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-base bg-current",
                                    STATUS_COLOR[user?.status] || 'text-theme'
                                ))} />
                            </div>
                            <div className="hidden sm:block text-left mr-1">
                                <p className="text-sm font-bold text-primary leading-none">{user?.name || 'User'}</p>
                                <p className="text-[10px] font-bold text-tertiary uppercase tracking-tighter mt-1">{user?.role || 'Engineer'}</p>
                            </div>
                            <ChevronDown className={twMerge(clsx(
                                "w-4 h-4 text-gray-500 transition-transform hidden sm:block",
                                dropdownOpen && "rotate-180"
                            ))} />
                        </button>

                        <AnimatePresence>
                            {dropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-3 w-64 shadow-modal p-2 z-[100] overflow-hidden rounded-[2.5rem] border border-white/10 backdrop-blur-3xl bg-black/60"
                                >
                                    <div className="absolute inset-0 z-0 pointer-events-none">
                                        <GlassSurface 
                                            width="100%" height="100%" borderRadius={40} displace={0.4} distortionScale={-20} 
                                            backgroundOpacity={0.08} opacity={0.95} blur={20}
                                        />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="p-5 border-b border-default mb-2">
                                            <p className="text-sm font-black text-primary tracking-tight">{user?.name}</p>
                                            <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest truncate mt-0.5">{user?.email}</p>
                                        </div>

                                        <div className="space-y-1 p-1">
                                            <Link
                                                to="/profile"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-tertiary hover:text-primary hover:bg-sunken transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-sunken flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                                                    <User className="w-4 h-4 group-hover:text-cyan-500 transition-colors" />
                                                </div>
                                                <span>My Profile</span>
                                            </Link>
                                            <Link
                                                to="/settings"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-tertiary hover:text-primary hover:bg-sunken transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-sunken flex items-center justify-center group-hover:bg-theme/20 transition-colors">
                                                    <Settings className="w-4 h-4 group-hover:text-theme transition-colors" />
                                                </div>
                                                <span>Settings</span>
                                            </Link>
                                            
                                            <div className="h-px bg-default my-2 mx-3" />

                                            <button
                                                onClick={() => { logout(); setDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-rose-500/5 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                                                    <LogOut className="w-4 h-4" />
                                                </div>
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default memo(TopBar);

