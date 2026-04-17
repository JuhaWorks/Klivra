import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, ExternalLink, Calendar, MessageSquare, UserPlus, Clock, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    
    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    if (diffInSeconds < 604800) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
import api from '../../utils/api';
import GlassSurface from '../ui/GlassSurface';
import { useSocketStore } from '../../store/useSocketStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const TYPE_CONFIG = {
    Assignment: { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    Mention: { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    StatusUpdate: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    Deadline: { icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    System: { icon: Bell, color: 'text-theme', bg: 'bg-theme/10' },
};

const PRIORITY_STYLES = {
    Urgent: "bg-danger/20 text-danger border-danger/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    High: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    Medium: "bg-theme/10 text-theme border-theme/20",
    Low: "bg-white/5 text-tertiary border-white/10",
};

const NotificationInbox = ({ isOpen, onClose, onUnreadCountChange }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket } = useSocketStore();
    const inboxRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.data);
            const count = Number(data.unreadCount) || 0;
            setUnreadCount(count);
            if (onUnreadCountChange) onUnreadCountChange(count);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen]);

    useEffect(() => {
        if (socket) {
            const handleNewNotify = (notify) => {
                setNotifications(prev => [notify, ...prev].slice(0, 50));
                setUnreadCount(prev => (Number(prev) || 0) + 1);
                if (onUnreadCountChange) onUnreadCountChange((Number(unreadCount) || 0) + 1);
            };
            socket.on('newNotification', handleNewNotify);
            return () => socket.off('newNotification', handleNewNotify);
        }
    }, [socket, unreadCount]);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            if (onUnreadCountChange) onUnreadCountChange(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const markAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            if (onUnreadCountChange) onUnreadCountChange(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const archiveNotification = async (id) => {
        try {
            await api.patch(`/notifications/${id}/archive`);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (error) {
            console.error("Failed to archive notification:", error);
        }
    };

    const handleInviteResponse = async (notificationId, projectId, status) => {
        try {
            // 1. Send the response to the project API
            await api.post(`/projects/${projectId}/invitations/respond`, { status });
            
            // 2. Mark notification as read and archive/hide it
            await markAsRead(notificationId);
            
            toast.success(`Invitation ${status === 'active' ? 'accepted' : 'declined'}!`, {
                style: { borderRadius: '12px', background: '#09090b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
            });

            // Refresh notifications to reflect changes
            fetchNotifications();
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const archiveAll = async () => {
        try {
            await api.patch('/notifications/archive-all');
            setNotifications([]);
            setUnreadCount(0);
            if (onUnreadCountChange) onUnreadCountChange(0);
        } catch (error) {
            console.error("Failed to archive all:", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
                    {/* Backdrop for closing */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
                    />

                    <motion.div
                        ref={inboxRef}
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-md h-full bg-black/60 backdrop-blur-3xl border-l border-white/10 shadow-huge pointer-events-auto flex flex-col"
                    >
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            <GlassSurface width="100%" height="100%" displace={0.5} distortionScale={-10} backgroundOpacity={0.05} />
                        </div>

                        {/* Header */}
                        <div className="relative z-10 p-8 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Inbox</h2>
                                <p className="text-sm font-bold text-tertiary mt-1">
                                    {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {notifications.length > 0 && (
                                    <button 
                                        onClick={archiveAll}
                                        className="p-3 rounded-2xl bg-white/5 text-tertiary hover:bg-white/10 transition-all border border-white/5"
                                        title="Archive All"
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                )}
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={markAllRead}
                                        className="p-3 rounded-2xl bg-theme/10 text-theme hover:bg-theme/20 transition-all active:scale-95 flex items-center gap-2 text-xs font-black uppercase tracking-wider border border-theme/20"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>Read All</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {loading ? (
                                <div className="flex flex-col gap-3 p-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-24 rounded-3xl bg-white/5 animate-pulse" />
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-10">
                                    <div className="w-20 h-20 rounded-[2.5rem] bg-sunken flex items-center justify-center mb-6">
                                        <Bell className="w-10 h-10 text-tertiary opacity-20" />
                                    </div>
                                    <h3 className="text-xl font-bold text-primary tracking-tight">Nothing to see here</h3>
                                    <p className="text-sm text-tertiary mt-2">Notifications from assignments, mentions, and updates will appear here.</p>
                                </div>
                            ) : (
                                notifications.map((n) => {
                                    const Config = TYPE_CONFIG[n.type] || TYPE_CONFIG.System;
                                    return (
                                        <motion.div
                                            key={n._id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={twMerge(clsx(
                                                "group relative p-5 rounded-[2rem] border transition-all duration-300",
                                                n.isRead 
                                                    ? "bg-white/5 border-white/5 grayscale-[0.5] opacity-80" 
                                                    : "bg-white/[0.08] border-white/10 shadow-lg shadow-black/20"
                                            ))}
                                        >
                                            <div className="flex gap-4">
                                                <div className={twMerge(clsx(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                                    Config.bg
                                                ))}>
                                                    <Config.icon className={twMerge(clsx("w-6 h-6", Config.color))} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", Config.color)}>
                                                                {n.type}
                                                            </span>
                                                            <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border", PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.Medium)}>
                                                                {n.priority}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-tertiary">
                                                            {formatRelativeTime(new Date(n.createdAt))}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-primary leading-tight group-hover:text-theme transition-colors">
                                                        {n.title}
                                                    </h4>
                                                    <p className="text-xs text-tertiary mt-1.5 leading-relaxed line-clamp-2">
                                                        {n.message}
                                                    </p>
                                                    
                                                    <div className="flex items-center justify-between mt-4">
                                                        <div className="flex items-center gap-3">
                                                            {!n.isRead ? (
                                                                <button 
                                                                    onClick={(e) => { e.preventDefault(); markAsRead(n._id); }}
                                                                    className="text-[10px] font-black text-theme hover:underline uppercase tracking-tighter"
                                                                >
                                                                    Mark as read
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-tertiary/40 uppercase tracking-tighter">Read</span>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => { e.preventDefault(); archiveNotification(n._id); }}
                                                                className="p-2 rounded-xl bg-white/5 border border-white/5 text-tertiary hover:text-danger hover:bg-danger/10 transition-all"
                                                                title="Archive"
                                                            >
                                                                <Archive className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Inline Actions for Invitations */}
                                                    {n.type === 'Assignment' && !n.isRead && n.metadata?.projectId && (
                                                        <div className="mt-4 flex gap-2 border-t border-white/5 pt-4">
                                                            <button
                                                                onClick={(e) => { 
                                                                    e.preventDefault(); 
                                                                    handleInviteResponse(n._id, n.metadata.projectId, 'active'); 
                                                                }}
                                                                className="flex-1 py-2 rounded-xl bg-success/10 hover:bg-success/20 border border-success/20 text-[10px] font-black text-success uppercase tracking-widest transition-all"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={(e) => { 
                                                                    e.preventDefault(); 
                                                                    handleInviteResponse(n._id, n.metadata.projectId, 'rejected'); 
                                                                }}
                                                                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black text-tertiary uppercase tracking-widest transition-all"
                                                            >
                                                                Decline
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {n.link && (
                                                <Link 
                                                    to={n.link} 
                                                    onClick={onClose}
                                                    className="absolute inset-0 z-0"
                                                />
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="relative z-10 p-6 border-t border-white/10">
                            <Link 
                                to="/profile?tab=security" 
                                onClick={onClose}
                                className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl bg-white/5 border border-white/10 text-sm font-bold text-white hover:bg-white/10 transition-all"
                            >
                                <GearIcon className="w-4 h-4" />
                                <span>Notification Settings</span>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Simple Fallback Helper
const GearIcon = (props) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default NotificationInbox;
