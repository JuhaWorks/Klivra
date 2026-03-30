import React, { useState, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Users2, UserPlus, UserCheck, UserX, Clock,
    Send, ChevronRight, X, Filter, Tag, MoreHorizontal,
    Sparkles, ArrowRight, Loader2, MessageSquare, Trash2
} from 'lucide-react';
import { api } from '../store/useAuthStore';
import { useAuthStore } from '../store/useAuthStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

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
    const sizes = { sm: 'w-9 h-9', md: 'w-12 h-12', lg: 'w-16 h-16' };
    const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
    return (
        <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-theme/10 to-theme/20 border border-default flex-shrink-0 flex items-center justify-center overflow-hidden`}>
            {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
                <span className={`${textSizes[size]} font-black text-theme`}>
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
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

// ── Connection Card ──────────────────────────────────────────────────────────
const ConnectionCard = ({ connection, onRemove }) => {
    const user = connection.user;
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={EASE}
        >
            <Card variant="glass" padding="p-0" className="group hover:border-theme/20 transition-all duration-300">
                <div className="p-5 flex items-start gap-4">
                    <div className="relative">
                        <Avatar user={user} />
                        <div className="absolute -bottom-0.5 -right-0.5">
                            <StatusDot status={user?.status} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black text-primary truncate">{user?.name}</h4>
                            <RoleBadge role={user?.role} />
                        </div>
                        <p className="text-xs text-tertiary truncate font-medium">{user?.email}</p>
                        {user?.customMessage && (
                            <p className="text-xs text-secondary mt-1.5 italic truncate">"{user.customMessage}"</p>
                        )}
                        {connection.labels?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {connection.labels.map((label, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-theme/5 text-[10px] font-bold text-theme border border-theme/10">
                                        <Tag className="w-2.5 h-2.5" />{label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onRemove(connection._id)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-tertiary hover:text-danger hover:bg-danger/5 transition-all"
                        title="Remove connection"
                    >
                        <Trash2 className="w-4 h-4" />
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
        <motion.div
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={EASE}
        >
            <Card variant="glass" padding="p-0" className="border-l-2 border-l-theme/40">
                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <Avatar user={user} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-black text-primary truncate">{user?.name}</h4>
                                <RoleBadge role={user?.role} />
                            </div>
                            <p className="text-xs text-tertiary truncate font-medium">{user?.email}</p>
                        </div>
                        <span className="text-[10px] text-tertiary font-mono">
                            {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    {request.note && (
                        <div className="mt-3 p-3 rounded-xl bg-sunken border border-default">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MessageSquare className="w-3 h-3 text-tertiary" />
                                <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">Note</span>
                            </div>
                            <p className="text-xs text-secondary leading-relaxed">"{request.note}"</p>
                        </div>
                    )}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => handleRespond('accept')}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black bg-theme text-white hover:bg-theme/90 shadow-lg shadow-theme/15 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {loading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            Accept
                        </button>
                        <button
                            onClick={() => handleRespond('decline')}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-secondary border border-default bg-sunken hover:bg-default disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {loading === 'decline' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
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
                <div className="p-5 flex items-center gap-4">
                    <Avatar user={user} size="sm" />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-primary truncate">{user?.name}</h4>
                        <p className="text-xs text-tertiary truncate">{user?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold">
                            <Clock className="w-3 h-3" /> Pending
                        </span>
                        <button
                            onClick={() => onWithdraw(request._id)}
                            className="p-2 rounded-xl text-tertiary hover:text-danger hover:bg-danger/5 transition-all"
                            title="Withdraw request"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

// ── Discovery / Search Card ──────────────────────────────────────────────────
const DiscoverCard = ({ user, onConnect }) => {
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
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black text-theme bg-theme/10 border border-theme/20">
                    <UserCheck className="w-3 h-3" /> Connected
                </span>
            );
        }
        if (user.connectionStatus === 'pending') {
            return (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20">
                    <Clock className="w-3 h-3" /> {user.direction === 'sent' ? 'Sent' : 'Received'}
                </span>
            );
        }
        return (
            <button
                onClick={() => setShowNote(!showNote)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-theme text-white hover:bg-theme/90 shadow-lg shadow-theme/15 active:scale-[0.98] transition-all"
            >
                <UserPlus className="w-3 h-3" /> Connect
            </button>
        );
    };

    return (
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={EASE}>
            <Card variant="glass" padding="p-0" className="hover:border-theme/15 transition-all duration-300">
                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="relative">
                            <Avatar user={user} />
                            <div className="absolute -bottom-0.5 -right-0.5">
                                <StatusDot status={user?.status} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-black text-primary truncate">{user?.name}</h4>
                                <RoleBadge role={user?.role} />
                            </div>
                            <p className="text-xs text-tertiary truncate font-medium">{user?.email}</p>
                            {user?.customMessage && (
                                <p className="text-xs text-secondary mt-1 italic truncate">"{user.customMessage}"</p>
                            )}
                            {user?.reason && (
                                <p className="text-[10px] text-theme/70 mt-1 font-bold">✦ {user.reason}</p>
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
                                <div className="mt-4 space-y-3">
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Add a personal note (optional)..."
                                        maxLength={300}
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl bg-sunken border border-default text-xs text-primary placeholder-tertiary resize-none outline-none focus:border-theme focus:ring-2 focus:ring-theme/10 transition-all"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-tertiary font-mono">{note.length}/300</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowNote(false); setNote(''); }}
                                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-secondary border border-default bg-sunken hover:bg-default transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSend}
                                                disabled={sending}
                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black bg-theme text-white hover:bg-theme/90 disabled:opacity-50 shadow-lg shadow-theme/15 active:scale-[0.98] transition-all"
                                            >
                                                {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                Send Request
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
    const [roleFilter, setRoleFilter] = useState('');

    // Admin users cannot access the Networking page
    if (user?.role === 'Admin') {
        return <Navigate to="/" replace />;
    }

    // ── Queries ──────────────────────────────────────────────────────────────
    const { data: connectionsRes, isLoading: loadingConns } = useQuery({
        queryKey: ['connections'],
        queryFn: async ({ signal }) => (await api.get('/connections', { signal })).data,
        staleTime: 1000 * 60 * 3,
    });

    const { data: pendingRes, isLoading: loadingPending } = useQuery({
        queryKey: ['connections', 'pending'],
        queryFn: async ({ signal }) => (await api.get('/connections/pending', { signal })).data,
        staleTime: 1000 * 60 * 2,
    });

    const { data: sentRes } = useQuery({
        queryKey: ['connections', 'sent'],
        queryFn: async ({ signal }) => (await api.get('/connections/sent', { signal })).data,
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
        queryKey: ['connections', 'search', searchQuery, roleFilter],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams({ q: searchQuery });
            if (roleFilter) params.append('role', roleFilter);
            return (await api.get(`/connections/search?${params}`, { signal })).data;
        },
        staleTime: 1000 * 30,
        enabled: activeTab === 'discover' && searchQuery.length >= 2,
    });

    const connections = connectionsRes?.data || [];
    const pending = pendingRes?.data || [];
    const sent = sentRes?.data || [];
    const stats = statsRes?.data || { connectionCount: 0, pendingCount: 0, sentCount: 0 };
    const suggestions = suggestionsRes?.data || [];
    const searchResults = searchRes?.data || [];

    // ── Mutations ────────────────────────────────────────────────────────────
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['connections'] });
    };

    const connectMutation = useMutation({
        mutationFn: async ({ recipientId, note }) => {
            return (await api.post('/connections/request', { recipientId, note })).data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            invalidateAll();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to send request'),
    });

    const respondMutation = useMutation({
        mutationFn: async ({ connectionId, action }) => {
            return (await api.put('/connections/respond', { connectionId, action })).data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            invalidateAll();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to respond'),
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
        onSuccess: () => {
            toast.success('Connection removed');
            invalidateAll();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove'),
    });

    const handleConnect = useCallback(async (recipientId, note) => {
        await connectMutation.mutateAsync({ recipientId, note });
    }, [connectMutation]);

    const handleRespond = useCallback(async (connectionId, action) => {
        await respondMutation.mutateAsync({ connectionId, action });
    }, [respondMutation]);

    // ── Stats Cards ──────────────────────────────────────────────────────────
    const STATS = [
        { label: 'Connections', value: stats.connectionCount, icon: Users2, accent: 'var(--accent-500)' },
        { label: 'Received', value: stats.pendingCount, icon: UserPlus, accent: 'oklch(0.70 0.15 240)' },
        { label: 'Sent', value: stats.sentCount, icon: Send, accent: 'oklch(0.72 0.15 60)' },
    ];

    const discoverData = searchQuery.length >= 2 ? searchResults : suggestions;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
                .net-root { font-family: 'Sora', system-ui, sans-serif; --mono: 'JetBrains Mono', monospace; }
                .net-scroll::-webkit-scrollbar { width: 3px; }
                .net-scroll::-webkit-scrollbar-track { background: transparent; }
                .net-scroll::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }
            `}</style>

            <article className="net-root min-h-[calc(100vh-120px)] flex flex-col pb-6 relative">
                {/* Ambient glow */}
                <div className="fixed top-0 left-0 right-0 h-[220px] pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-theme/10 rounded-full blur-[120px] opacity-40" />
                </div>

                <div className="px-1 relative z-10">
                    {/* Header */}
                    <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={EASE} className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Users2 className="w-4 h-4 text-theme" />
                                    <span className="text-[11px] text-tertiary" style={{ fontFamily: 'var(--mono)' }}>
                                        Professional Network
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight leading-tight m-0 mb-2">
                                    Networking
                                </h1>
                                <p className="text-base text-secondary max-w-lg leading-relaxed opacity-80">
                                    Build meaningful professional connections, discover teammates, and grow your network.
                                </p>
                            </div>
                        </div>
                    </motion.header>

                    {/* Stats Row */}
                    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        {STATS.map((s, i) => (
                            <Card
                                key={s.label}
                                variant="glass"
                                performance="premium"
                                hideBorder={true}
                                padding="p-5"
                                className="cursor-default"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...EASE, delay: i * 0.06 }}
                            >
                                <div style={{
                                    width: 30, height: 30, borderRadius: 9,
                                    background: `color-mix(in oklch, ${s.accent}, transparent 85%)`,
                                    border: `1px solid color-mix(in oklch, ${s.accent}, transparent 70%)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 14
                                }}>
                                    <s.icon style={{ width: 14, height: 14, color: s.accent }} />
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-1px', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
                                    {s.value}
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--mono)' }}>
                                    {s.label}
                                </div>
                            </Card>
                        ))}
                    </section>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 mb-6 p-1 rounded-2xl bg-sunken border border-default w-fit">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.key;
                            const count = tab.key === 'pending' ? pending.length : tab.key === 'sent' ? sent.length : tab.key === 'network' ? connections.length : 0;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                                        isActive ? 'bg-surface text-primary shadow-sm border border-default' : 'text-tertiary hover:text-secondary'
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                    {count > 0 && tab.key !== 'discover' && (
                                        <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
                                            isActive ? 'bg-theme/10 text-theme' : 'bg-default text-tertiary'
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search (visible in discover tab) */}
                    {activeTab === 'discover' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE} className="mb-6">
                            <div className="flex gap-3">
                                <div className="flex-1 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-sunken border border-default focus-within:border-theme focus-within:ring-2 focus-within:ring-theme/10 transition-all">
                                    <Search className="w-4 h-4 text-tertiary shrink-0" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="w-full bg-transparent text-sm font-bold text-primary placeholder-tertiary outline-none"
                                    />
                                    {searching && <Loader2 className="w-4 h-4 text-theme animate-spin shrink-0" />}
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="p-1 rounded-lg text-tertiary hover:text-primary transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-4 py-3 rounded-2xl bg-sunken border border-default text-xs font-bold text-secondary outline-none focus:border-theme transition-all cursor-pointer"
                                >
                                    <option value="">All Roles</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Developer">Developer</option>
                                </select>
                            </div>
                        </motion.div>
                    )}

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {/* My Network */}
                        {activeTab === 'network' && (
                            <motion.div key="network" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                                {connections.length === 0 ? (
                                    <EmptyState icon={Users2} title="No connections yet" subtitle="Start building your professional network by discovering and connecting with teammates." />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {connections.map(conn => (
                                            <ConnectionCard key={conn._id} connection={conn} onRemove={(id) => removeMutation.mutate(id)} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Received Requests */}
                        {activeTab === 'pending' && (
                            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                                {pending.length === 0 ? (
                                    <EmptyState icon={UserPlus} title="No pending requests" subtitle="When someone sends you a connection request, it will appear here." />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {pending.map(req => (
                                            <IncomingRequestCard key={req._id} request={req} onRespond={handleRespond} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Sent Requests */}
                        {activeTab === 'sent' && (
                            <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
                                {sent.length === 0 ? (
                                    <EmptyState icon={Send} title="No sent requests" subtitle="Requests you've sent will appear here until they're accepted or declined." />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {sent.map(req => (
                                            <SentRequestCard key={req._id} request={req} onWithdraw={(id) => withdrawMutation.mutate(id)} />
                                        ))}
                                    </div>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {discoverData.map(u => (
                                            <DiscoverCard key={u._id} user={u} onConnect={handleConnect} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </article>
        </>
    );
};

export default Networking;
