import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Users2, UserPlus, UserCheck, UserX, Clock,
    Send, ChevronRight, X, Filter, Tag, MoreHorizontal,
    Sparkles, ArrowRight, Loader2, MessageSquare, Trash2
} from 'lucide-react';
import { api } from '../store/useAuthStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import Card from '../components/ui/Card';
import Counter from '../components/ui/Counter';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import NetworkingSkeleton from '../components/networking/NetworkingSkeleton';
import UserProfileModal from '../components/networking/UserProfileModal';
import { API_BASE } from '../components/auth/AuthLayout';
import { getOptimizedAvatar } from '../utils/avatar';

const EASE = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };

// ── Tab Configuration ────────────────────────────────────────────────────────
const TABS = [
    { key: 'network', label: 'My Network', icon: Users2 },
    { key: 'pending', label: 'Received', icon: UserPlus },
    { key: 'sent', label: 'Sent', icon: Send },
    { key: 'discover', label: 'Discover', icon: Sparkles },
];

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
    const colors = {
        Online: 'bg-emerald-400',
        Away: 'bg-amber-400',
        'Do Not Disturb': 'bg-rose-400',
        Offline: 'bg-zinc-500',
    };
    return (
        <span className="relative inline-flex w-2.5 h-2.5">
            {status === 'Online' && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />}
            <span className={`relative rounded-full w-2.5 h-2.5 ${colors[status] || colors.Offline}`} />
        </span>
    );
};

// ── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 'md' }) => {
    const [isError, setIsError] = useState(false);
    const sizes = { sm: 'w-9 h-9', md: 'w-12 h-12', lg: 'w-16 h-16' };
    const pxSizes = { sm: 36, md: 48, lg: 64 };
    const textSizes = { sm: 'text-[10px]', md: 'text-sm', lg: 'text-lg' };
    
    const avatarUrl = useMemo(() => {
        if (!user?.avatar) return null;
        return getOptimizedAvatar(user.avatar);
    }, [user?.avatar]);

    const initials = useMemo(() => {
        if (!user?.name) return '?';
        const parts = user.name.split(' ');
        if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
        return user.name.charAt(0).toUpperCase();
    }, [user?.name]);

    return (
        <div className="relative">
            <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-theme/10 to-theme/20 border border-default flex-shrink-0 flex items-center justify-center overflow-hidden relative`}>
                {avatarUrl && !isError ? (
                    <img 
                        src={avatarUrl} 
                        alt="" 
                        width={pxSizes[size]}
                        height={pxSizes[size]}
                        referrerPolicy="no-referrer"
                        onError={() => setIsError(true)}
                        className="w-full h-full object-cover" 
                        loading="lazy" 
                        decoding="async" 
                    />
                ) : (
                    <span className={`${textSizes[size]} font-black text-theme tracking-tight`}>
                        {initials}
                    </span>
                )}
            </div>
            {user?.gamification?.level && size !== 'sm' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-lg bg-base border border-default flex items-center justify-center shadow-lg">
                    <span className="text-[8px] font-black text-primary">L{user.gamification.level}</span>
                </div>
            )}
        </div>
    );
};

// ── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
    const styles = {
        Admin: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        Manager: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        Developer: 'bg-theme/10 text-theme border-theme/20',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${styles[role] || styles.Developer}`}>
            {role}
        </span>
    );
};

const SocialStats = ({ count }) => {
    if (count === undefined || count === null) return null;
    const displayCount = Math.max(0, count);
    return (
        <div className="flex items-center gap-1 mt-1">
            <Users2 className="w-3 h-3 text-tertiary" />
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">
                {displayCount} {displayCount === 1 ? 'Connection' : 'Connections'}
            </span>
        </div>
    );
};

// ── Connection Card (Compact) ────────────────────────────────────────────────
const ConnectionCard = ({ connection, onRemove, onViewProfile }) => {
    const user = connection.user;
    return (
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={EASE}>
            <Card variant="glass" padding="p-0" className="group hover:border-theme/20 transition-all duration-300">
                <div className="p-3.5 flex items-start gap-3">
                    <div className="relative cursor-pointer" onClick={() => onViewProfile && onViewProfile(user._id)}>
                        <Avatar user={user} size="sm" />
                        <div className="absolute -bottom-0.5 -right-0.5">
                            <StatusDot status={user?.status} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 
                                className="text-[13px] font-black text-primary truncate cursor-pointer hover:text-theme transition-colors"
                                onClick={() => onViewProfile && onViewProfile(user._id)}
                            >
                                {user?.name}
                            </h4>
                            <RoleBadge role={user?.role} />
                        </div>
                        <p className="text-[11px] text-tertiary truncate font-medium">{user?.email}</p>
                        <SocialStats count={user?.totalConnections} />

                        {connection.labels?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {connection.labels.map((label, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-theme/5 text-[9px] font-bold text-theme border border-theme/10">
                                        <Tag className="w-2 h-2" />{label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onRemove(connection._id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-tertiary hover:text-danger hover:bg-danger/5 transition-all"
                        title="Remove connection"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </Card>
        </motion.div>
    );
};

// ── Request Card (Incoming) ──────────────────────────────────────────────────
const IncomingRequestCard = ({ request, onRespond }) => {
    const user = request.requester;
    const [loading, setLoading] = useState(null);

    const handleRespond = async (action) => {
        setLoading(action);
        await onRespond(request._id, action);
        setLoading(null);
    };

    return (
        <motion.div layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={EASE}>
            <Card variant="glass" padding="p-0" className="border-l-2 border-l-theme/40">
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <Avatar user={user} size="sm" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-[13px] font-black text-primary truncate">{user?.name}</h4>
                                <RoleBadge role={user?.role} />
                            </div>
                            <p className="text-[11px] text-tertiary truncate font-medium">{user?.email}</p>
                            <SocialStats count={user?.totalConnections} />
                        </div>
                        <span className="text-[10px] text-tertiary font-mono opacity-60">
                            {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    {request.note && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-sunken border border-default">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <MessageSquare className="w-2.5 h-2.5 text-tertiary" />
                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest">Note</span>
                            </div>
                            <p className="text-[11px] text-secondary leading-relaxed line-clamp-2">"{request.note}"</p>
                        </div>
                    )}
                    <div className="flex gap-2 mt-3.5">
                        <button
                            onClick={() => handleRespond('accept')}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-black bg-theme text-white hover:bg-theme/90 shadow-lg shadow-theme/15 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {loading === 'accept' ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            Accept
                        </button>
                        <button
                            onClick={() => handleRespond('decline')}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-secondary border border-default bg-sunken hover:bg-default disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {loading === 'decline' ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                            Decline
                        </button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

// ── Sent Request Card ────────────────────────────────────────────────────────
const SentRequestCard = ({ request, onWithdraw }) => {
    const user = request.recipient;
    return (
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={EASE}>
            <Card variant="glass" padding="p-0">
                <div className="p-3.5 flex items-center gap-3">
                    <Avatar user={user} size="sm" />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-primary truncate leading-tight">{user?.name}</h4>
                        <p className="text-[11px] text-tertiary truncate">{user?.email}</p>
                        <SocialStats count={user?.totalConnections} />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[9px] text-amber-500 font-bold uppercase tracking-tight">
                            <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                        <button
                            onClick={() => onWithdraw(request._id)}
                            className="p-1.5 rounded-xl text-tertiary hover:text-danger hover:bg-danger/5 transition-all"
                            title="Withdraw request"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

// ── Discovery / Search Card ──────────────────────────────────────────────────
const DiscoverCard = ({ user, onConnect, onViewProfile }) => {
    const [showNote, setShowNote] = useState(false);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        setSending(true);
        try {
            await onConnect(user._id, note);
            setShowNote(false);
            setNote('');
        } catch (err) {
            console.error('Failed to connect:', err);
        } finally {
            setSending(false);
        }
    };

    const getActionButton = () => {
        if (user.connectionStatus === 'accepted') {
            return (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black text-theme bg-theme/10 border border-theme/20 uppercase tracking-tight">
                    <UserCheck className="w-3 h-3" /> Connected
                </span>
            );
        }
        if (user.connectionStatus === 'pending') {
            return (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 uppercase tracking-tight">
                    <Clock className="w-3 h-3" /> {user.direction === 'sent' ? 'Sent' : 'Received'}
                </span>
            );
        }
        return (
            <button
                onClick={() => setShowNote(!showNote)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-theme text-white hover:bg-theme/90 shadow-lg shadow-theme/15 active:scale-[0.98] transition-all"
            >
                <UserPlus className="w-2.5 h-2.5" /> Connect
            </button>
        );
    };

    return (
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={EASE}>
            <Card variant="glass" padding="p-0" className="hover:border-theme/15 transition-all duration-300">
                <div className="p-3.5">
                    <div className="flex items-start gap-3">
                        <div className="relative cursor-pointer" onClick={() => onViewProfile && onViewProfile(user._id)}>
                            <Avatar user={user} size="sm" />
                            <div className="absolute -bottom-0.5 -right-0.5">
                                <StatusDot status={user?.status} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 
                                    className="text-[13px] font-black text-primary truncate cursor-pointer hover:text-theme transition-colors"
                                    onClick={() => onViewProfile && onViewProfile(user._id)}
                                >
                                    {user?.name}
                                </h4>
                                <RoleBadge role={user?.role} />
                            </div>
                            <p className="text-[11px] text-tertiary truncate font-medium">{user?.email}</p>
                            <SocialStats count={user?.totalConnections} />

                            {user?.reason && (
                                <div className="flex items-start gap-1.5 mt-2 p-1.5 rounded-lg bg-theme/5 border border-theme/10">
                                    <Sparkles className="w-2.5 h-2.5 text-theme shrink-0 mt-0.5" />
                                    <p className="text-[9px] text-theme font-bold leading-tight uppercase tracking-tight">
                                        {user.reason}
                                    </p>
                                </div>
                            )}
                        </div>
                        {getActionButton()}
                    </div>

                    <AnimatePresence>
                        {showNote && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3.5 space-y-2.5">
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Add a personal note (optional)..."
                                        maxLength={300}
                                        rows={2}
                                        className="w-full px-3 py-2.5 rounded-xl bg-sunken border border-default text-[11px] text-primary placeholder-tertiary resize-none outline-none focus:border-theme focus:ring-2 focus:ring-theme/10 transition-all font-medium"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-tertiary font-mono">{note.length}/300</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowNote(false); setNote(''); }}
                                                className="px-3 py-1.5 rounded-xl text-[9px] font-bold text-secondary border border-default bg-sunken hover:bg-default transition-all uppercase tracking-tight"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSend}
                                                disabled={sending}
                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black bg-theme text-white hover:bg-theme/90 disabled:opacity-50 shadow-lg shadow-theme/15 active:scale-[0.98] transition-all"
                                            >
                                                {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-2.5 h-2.5" />}
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>
        </motion.div>
    );
};

// ── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, subtitle }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={EASE} className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-[2rem] bg-theme/5 border border-theme/10 flex items-center justify-center mb-5">
            <Icon className="w-7 h-7 text-theme/50" />
        </div>
        <h3 className="text-base font-black text-primary mb-1">{title}</h3>
        <p className="text-sm text-tertiary max-w-xs">{subtitle}</p>
    </motion.div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ██  MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const Networking = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('network');
    const [searchQuery, setSearchQuery] = useState('');
    const [skillQuery, setSkillQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedUserForModal, setSelectedUserForModal] = useState(null);
    const { socket } = useSocketStore();

    // ── Real-time Listeners ──────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleReceived = (data) => {
            toast(data.message, { icon: '👋', duration: 4000 });
            invalidateAll();
        };

        const handleStatusUpdate = (data) => {
            if (data.status === 'accepted') {
                toast.success(data.message, { icon: '🤝', duration: 5000 });
            } else {
                toast(data.message, { icon: '❌' });
            }
            invalidateAll();
        };

        const handleWithdrawn = () => {
            invalidateAll();
        };

        const handleRemoved = () => {
            toast('A connection was removed', { icon: '🗑️' });
            invalidateAll();
        };

        socket.on('connection:received', handleReceived);
        socket.on('connection:status_updated', handleStatusUpdate);
        socket.on('connection:withdrawn', handleWithdrawn);
        socket.on('connection:removed', handleRemoved);

        return () => {
            socket.off('connection:received', handleReceived);
            socket.off('connection:status_updated', handleStatusUpdate);
            socket.off('connection:withdrawn', handleWithdrawn);
            socket.off('connection:removed', handleRemoved);
        };
    }, [socket]);

    // Admin users cannot access the Networking page
    if (user?.role === 'Admin') {
        return <Navigate to="/" replace />;
    }

    // ── Queries ──────────────────────────────────────────────────────────────
    const { 
        data: connectionsRes, 
        fetchNextPage: fetchNextConnections, 
        hasNextPage: hasMoreConnections, 
        isFetchingNextPage: loadingMoreConnections,
        isLoading: loadingConns 
    } = useInfiniteQuery({
        queryKey: ['connections'],
        queryFn: async ({ pageParam, signal }) => {
            const url = pageParam ? `/connections?cursor=${pageParam}` : '/connections';
            return (await api.get(url, { signal })).data;
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 1000 * 60 * 3,
    });

    const { 
        data: pendingRes, 
        fetchNextPage: fetchNextPending, 
        hasNextPage: hasMorePending,
        isFetchingNextPage: loadingMorePending,
        isLoading: loadingPending 
    } = useInfiniteQuery({
        queryKey: ['connections', 'pending'],
        queryFn: async ({ pageParam, signal }) => {
            const url = pageParam ? `/connections/pending?cursor=${pageParam}` : '/connections/pending';
            return (await api.get(url, { signal })).data;
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 1000 * 60 * 2,
    });

    const { 
        data: sentRes,
        fetchNextPage: fetchNextSent,
        hasNextPage: hasMoreSent,
        isFetchingNextPage: loadingMoreSent
    } = useInfiniteQuery({
        queryKey: ['connections', 'sent'],
        queryFn: async ({ pageParam, signal }) => {
            const url = pageParam ? `/connections/sent?cursor=${pageParam}` : '/connections/sent';
            return (await api.get(url, { signal })).data;
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 1000 * 60 * 2,
    });

    const { data: statsRes } = useQuery({
        queryKey: ['connections', 'stats'],
        queryFn: async ({ signal }) => (await api.get('/connections/stats', { signal })).data,
        staleTime: 1000 * 60 * 2,
    });

    const { data: suggestionsRes } = useQuery({
        queryKey: ['connections', 'suggestions'],
        queryFn: async ({ signal }) => (await api.get('/connections/suggestions', { signal })).data,
        staleTime: 1000 * 60 * 5,
        enabled: activeTab === 'discover' && !searchQuery,
    });

    const { data: searchRes, isFetching: searching } = useQuery({
        queryKey: ['connections', 'search', searchQuery, skillQuery, roleFilter],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams({ q: searchQuery });
            if (roleFilter) params.append('role', roleFilter);
            if (skillQuery) params.append('skill', skillQuery);
            return (await api.get(`/connections/search?${params}`, { signal })).data;
        },
        staleTime: 1000 * 30,
        enabled: activeTab === 'discover' && (searchQuery.length >= 2 || skillQuery.length >= 2),
    });

    const connections = useMemo(() => connectionsRes?.pages?.flatMap(page => page.data) || [], [connectionsRes]);
    const pending = useMemo(() => pendingRes?.pages?.flatMap(page => page.data) || [], [pendingRes]);
    const sent = useMemo(() => sentRes?.pages?.flatMap(page => page.data) || [], [sentRes]);
    const stats = statsRes?.data || { connectionCount: 0, pendingCount: 0, sentCount: 0 };
    const suggestions = suggestionsRes?.data || [];
    const searchResults = searchRes?.data || [];

    const isSearching = searchQuery.length >= 2 || skillQuery.length >= 2;

    // ── Mutations ────────────────────────────────────────────────────────────
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['connections'] });
        queryClient.invalidateQueries({ queryKey: ['connections', 'stats'] });
    };

    const connectMutation = useMutation({
        mutationFn: async ({ recipientId, note }) => {
            return (await api.post('/connections/request', { recipientId, note })).data;
        },
        onMutate: async ({ recipientId }) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({ queryKey: ['connections'] });
            // Snapshot previous value
            const previoussuggestions = queryClient.getQueryData(['connections', 'suggestions']);
            const previousSearch = queryClient.getQueryData(['connections', 'search']);
            
            // Optimistically update
            queryClient.setQueryData(['connections', 'suggestions'], old => ({
                ...old,
                data: old?.data?.map(u => u._id === recipientId ? { ...u, connectionStatus: 'pending', direction: 'sent' } : u)
            }));

            return { previoussuggestions, previousSearch };
        },
        onSuccess: (data) => {
            toast.success(data.message);
            invalidateAll();
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Failed to send request');
            if (context?.previoussuggestions) queryClient.setQueryData(['connections', 'suggestions'], context.previoussuggestions);
        },
    });

    const respondMutation = useMutation({
        mutationFn: async ({ connectionId, action }) => {
            return (await api.put('/connections/respond', { connectionId, action })).data;
        },
        onMutate: async ({ connectionId, action }) => {
            await queryClient.cancelQueries({ queryKey: ['connections'] });
            const previousPending = queryClient.getQueryData(['connections', 'pending']);
            
            // Optimistically remove from pending if accepted or declined
            queryClient.setQueryData(['connections', 'pending'], old => ({
                ...old,
                pages: old?.pages?.map(page => ({
                    ...page,
                    data: page.data.filter(req => req._id !== connectionId)
                }))
            }));

            // Optimistically update connection count if accepted
            if (action === 'accept') {
                queryClient.setQueryData(['connections', 'stats'], old => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            connectionCount: (old.data.connectionCount || 0) + 1,
                            pendingCount: Math.max(0, (old.data.pendingCount || 0) - 1)
                        }
                    };
                });
            } else {
                queryClient.setQueryData(['connections', 'stats'], old => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            pendingCount: Math.max(0, (old.data.pendingCount || 0) - 1)
                        }
                    };
                });
            }

            return { previousPending };
        },
        onSuccess: (data) => {
            toast.success(data.message);
            invalidateAll();
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Failed to respond');
            if (context?.previousPending) queryClient.setQueryData(['connections', 'pending'], context.previousPending);
        },
    });

    const withdrawMutation = useMutation({
        mutationFn: async (connectionId) => {
            return (await api.delete(`/connections/withdraw/${connectionId}`)).data;
        },
        onSuccess: () => {
            toast.success('Request withdrawn');
            invalidateAll();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to withdraw'),
    });

    const removeMutation = useMutation({
        mutationFn: async (connectionId) => {
            return (await api.delete(`/connections/${connectionId}`)).data;
        },
        onMutate: async (connectionId) => {
            await queryClient.cancelQueries({ queryKey: ['connections', 'stats'] });
            const previousStats = queryClient.getQueryData(['connections', 'stats']);
            
            queryClient.setQueryData(['connections', 'stats'], old => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        connectionCount: Math.max(0, (old.data.connectionCount || 0) - 1)
                    }
                };
            });

            return { previousStats };
        },
        onSuccess: () => {
            toast.success('Connection removed');
            invalidateAll();
        },
        onError: (err, variables, context) => {
            toast.error(err.response?.data?.message || 'Failed to remove');
            if (context?.previousStats) queryClient.setQueryData(['connections', 'stats'], context.previousStats);
        },
    });

    const handleConnect = useCallback(async (recipientId, note) => {
        await connectMutation.mutateAsync({ recipientId, note });
    }, [connectMutation]);

    const handleRespond = useCallback(async (connectionId, action) => {
        await respondMutation.mutateAsync({ connectionId, action });
    }, [respondMutation]);

    // ── Stats Cards ──────────────────────────────────────────────────────────
    const STATS = [
        { label: 'Connections', value: Math.max(0, stats.connectionCount), icon: Users2, accent: 'var(--accent-500)', glow: 'var(--accent-bg)' },
        { label: 'Received', value: stats.pendingCount, icon: UserPlus, accent: 'oklch(0.70 0.15 240)', glow: 'oklch(0.70 0.15 240 / 0.10)' },
        { label: 'Sent', value: stats.sentCount, icon: Send, accent: 'oklch(0.72 0.15 60)', glow: 'oklch(0.72 0.15 60 / 0.10)' },
    ];

    const discoverData = isSearching ? searchResults : suggestions;

    // ── Virtualization for My Network ────────────────────────────────────────
    const parentRef = React.useRef(null);
    const rowVirtualizer = useWindowVirtualizer({
        count: Math.ceil(connections.length / 2),
        estimateSize: () => 180,
        overscan: 5,
        scrollMargin: parentRef.current?.offsetTop || 0,
    });

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
                .net-root { font-family: 'Sora', system-ui, sans-serif; --mono: 'JetBrains Mono', monospace; }
                .net-scroll::-webkit-scrollbar { width: 3px; }
                .net-scroll::-webkit-scrollbar-track { background: transparent; }
                .net-scroll::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }
            `}</style>

            <article className="net-root min-h-[calc(100vh-120px)] flex flex-col pb-10 relative max-w-[2000px] mx-auto w-full">
                {/* Ambient glow */}
                <div className="fixed top-0 left-0 right-0 h-[220px] pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-theme/10 rounded-full blur-[120px] opacity-40" />
                    <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-theme/5 rounded-full blur-[120px] opacity-30" />
                </div>

                <div className="px-1 relative z-10">
                    {/* Header */}
                    <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={EASE} className="mb-10 sm:mb-12">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-theme/10 flex items-center justify-center">
                                        <Users2 className="w-4 h-4 text-theme" />
                                    </div>
                                    <span className="text-[10px] sm:text-[11px] text-tertiary uppercase tracking-[0.3em] font-mono">
                                        Professional Network
                                    </span>
                                </div>
                                <h1 className="text-5xl sm:text-7xl font-black text-primary tracking-tighter leading-[0.9]">
                                    Networking
                                </h1>
                                <p className="text-sm sm:text-lg text-secondary max-w-xl leading-relaxed opacity-80 font-medium">
                                    Connect with professionals, join project teams, and collaborate on global initiatives.
                                </p>
                            </div>
                        </div>
                    </motion.header>

                    {/* Stats Grid - Moved below header */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        {STATS.map((s, i) => (
                            <motion.div
                                key={s.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...EASE, delay: i * 0.04 }}
                            >
                                <Card
                                    variant="glass"
                                    performance="premium"
                                    padding="p-6 sm:p-8"
                                    hideBorder={true}
                                    className="rounded-[2.5rem] sm:rounded-[3.15rem] cursor-default"
                                >
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-6 sm:mb-8"
                                        style={{ background: s.glow, border: `1px solid ${s.accent}20` }}>
                                        <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                                    </div>
                                    <div className="text-3xl sm:text-4xl font-bold tracking-tighter text-primary leading-none mb-2 tabular-nums">
                                        <Counter value={s.value} delay={i * 60} />
                                    </div>
                                    <div className="text-[10px] sm:text-[11px] font-bold tracking-widest text-tertiary uppercase font-mono">{s.label}</div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>


                    {/* Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-10 p-1.5 rounded-[1.75rem] bg-sunken/50 border border-subtle w-fit backdrop-blur-xl">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.key;
                            const count = tab.key === 'pending' ? pending.length : tab.key === 'sent' ? sent.length : tab.key === 'network' ? connections.length : 0;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative flex items-center gap-3 px-5 sm:px-8 py-3 rounded-2xl text-[10px] sm:text-xs font-black transition-all duration-300 uppercase tracking-widest ${
                                        isActive ? 'text-primary' : 'text-tertiary hover:text-secondary'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-surface shadow-xl border border-subtle rounded-2xl z-0"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className="relative z-10 flex items-center gap-2.5">
                                        <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">{tab.label}</span>
                                        {count > 0 && tab.key !== 'discover' && (
                                            <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono ${
                                                isActive ? 'bg-theme/10 text-theme' : 'bg-sunken text-tertiary'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search (visible in discover tab) */}
                    {activeTab === 'discover' && (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={EASE} className="mb-10">
                            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                <div className="flex-1 flex items-center gap-4 px-6 py-4 rounded-[2rem] bg-sunken/50 border border-subtle focus-within:border-theme/30 focus-within:ring-4 focus-within:ring-theme/5 transition-all shadow-inner group">
                                    <Search className="w-5 h-5 text-tertiary group-focus-within:text-theme transition-colors shrink-0" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name..."
                                        className="w-full bg-transparent text-sm font-black text-primary placeholder-tertiary outline-none"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="p-1.5 rounded-xl text-tertiary hover:text-primary transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 flex items-center gap-4 px-6 py-4 rounded-[2rem] bg-sunken/50 border border-subtle focus-within:border-theme/30 focus-within:ring-4 focus-within:ring-theme/5 transition-all shadow-inner group">
                                    <Filter className="w-5 h-5 text-tertiary group-focus-within:text-theme transition-colors shrink-0" />
                                    <input
                                        type="text"
                                        value={skillQuery}
                                        onChange={(e) => setSkillQuery(e.target.value)}
                                        placeholder="Filter by skill..."
                                        className="w-full bg-transparent text-sm font-black text-primary placeholder-tertiary outline-none"
                                    />
                                    {searching && <Loader2 className="w-5 h-5 text-theme animate-spin shrink-0" />}
                                    {skillQuery && (
                                        <button onClick={() => setSkillQuery('')} className="p-1.5 rounded-xl text-tertiary hover:text-primary transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-8 py-4 rounded-[2rem] bg-sunken/50 border border-subtle text-xs font-black uppercase tracking-widest text-secondary outline-none focus:border-theme/30 transition-all cursor-pointer shadow-inner min-w-[200px]"
                                >
                                    <option value="">All Roles</option>
                                    <option value="Manager">Managers</option>
                                    <option value="Developer">Developers</option>
                                </select>
                            </div>
                        </motion.div>
                    )}

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {/* My Network */}
                        {activeTab === 'network' && (
                            <motion.div 
                                key="network" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                transition={EASE}
                                ref={parentRef}
                            >
                                {loadingConns ? (
                                    <NetworkingSkeleton />
                                ) : connections.length === 0 ? (
                                    <EmptyState icon={Users2} title="No connections yet" subtitle="Start building your professional network by discovering and connecting with teammates." />
                                ) : (
                                    <div 
                                        className="relative w-full"
                                        style={{ height: `${rowVirtualizer.getTotalSize() - rowVirtualizer.options.scrollMargin}px` }}
                                    >
                                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                            const startIndex = virtualRow.index * 3;
                                            const rowItems = connections.slice(startIndex, startIndex + 3);
                                            
                                            return (
                                                <div
                                                    key={virtualRow.key}
                                                    className="absolute top-0 left-0 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
                                                    style={{ 
                                                        transform: `translateY(${virtualRow.start - rowVirtualizer.options.scrollMargin}px)`,
                                                        height: `${virtualRow.size}px`
                                                    }}
                                                >
                                                    {rowItems.map(conn => (
                                                        <ConnectionCard key={conn._id} connection={conn} onRemove={(id) => removeMutation.mutate(id)} onViewProfile={setSelectedUserForModal} />
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {hasMoreConnections && !loadingConns && (
                                    <div className="flex justify-center mt-6">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => fetchNextConnections()} 
                                            loading={loadingMoreConnections}
                                            className="px-8"
                                        >
                                            Load More Connections
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Received Requests */}
                        {activeTab === 'pending' && (
                            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                                {loadingPending ? (
                                    <NetworkingSkeleton />
                                ) : pending.length === 0 ? (
                                    <EmptyState icon={UserPlus} title="No pending requests" subtitle="When someone sends you a connection request, it will appear here." />
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative">
                                            <AnimatePresence mode="popLayout">
                                                {pending.map(req => (
                                                    <IncomingRequestCard key={req._id} request={req} onRespond={handleRespond} />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        {hasMorePending && (
                                            <div className="flex justify-center mt-6">
                                                <Button 
                                                    variant="ghost" 
                                                    onClick={() => fetchNextPending()} 
                                                    loading={loadingMorePending}
                                                    className="px-8"
                                                >
                                                    Load More Requests
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* Sent Requests */}
                        {activeTab === 'sent' && (
                            <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                                {loadingMoreSent ? (
                                     <NetworkingSkeleton />
                                ) : sent.length === 0 ? (
                                    <EmptyState icon={Send} title="No sent requests" subtitle="Requests you've sent will appear here until they're accepted or declined." />
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative">
                                            <AnimatePresence mode="popLayout">
                                                {sent.map(req => (
                                                    <SentRequestCard key={req._id} request={req} onWithdraw={(id) => withdrawMutation.mutate(id)} />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        {hasMoreSent && (
                                            <div className="flex justify-center mt-6">
                                                <Button 
                                                    variant="ghost" 
                                                    onClick={() => fetchNextSent()} 
                                                    loading={loadingMoreSent}
                                                    className="px-8"
                                                >
                                                    Load More Requests
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* Discover */}
                        {activeTab === 'discover' && (
                            <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                                {!searchQuery && suggestions.length > 0 && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4 text-theme" />
                                        <span className="text-xs font-black text-primary uppercase tracking-widest">People You May Know</span>
                                    </div>
                                )}
                                {searchQuery && searchQuery.length < 2 && (
                                    <p className="text-sm text-tertiary text-center py-8">Type at least 2 characters to search...</p>
                                )}
                                {discoverData.length === 0 && (searchQuery.length >= 2 || (!searchQuery && suggestions.length === 0)) ? (
                                    <EmptyState icon={Search} title="No users found" subtitle={searchQuery ? "Try a different search term or filter." : "No suggestions available right now."} />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative">
                                        <AnimatePresence mode="popLayout">
                                            {discoverData.map(u => (
                                                <DiscoverCard key={u._id} user={u} onConnect={handleConnect} onViewProfile={setSelectedUserForModal} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </article>

            <UserProfileModal 
                isOpen={!!selectedUserForModal} 
                onClose={() => setSelectedUserForModal(null)} 
                userId={selectedUserForModal} 
            />
        </>
    );
};

export default Networking;
