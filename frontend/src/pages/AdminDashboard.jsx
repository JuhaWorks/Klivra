import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, api } from '../store/useAuthStore';
import { Navigate, Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';

import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts';
import toast from 'react-hot-toast';
import GlassSurface from '../components/ui/GlassSurface';

/* ─────────────────────────────── helpers ─── */
const fmtDTLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const z = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};

// Tiny sparkline mock generator (replace with real data)
const sparkData = (base, len = 14) =>
    Array.from({ length: len }, (_, i) => ({ v: Math.max(0, base + Math.sin(i * 0.7) * base * 0.3 + (Math.random() - 0.5) * base * 0.2) }));

/* ─────────────────────────── animated counter ─── */
const AnimatedNumber = ({ value, duration = 1.2 }) => {
    const mv = useMotionValue(0);
    const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
    const display = useTransform(spring, v => Math.round(v).toLocaleString());
    useEffect(() => { mv.set(value); }, [value]);
    return <motion.span>{display}</motion.span>;
};

/* ─────────────────────── status / role badges ─── */
const STATUS_MAP = {
    banned: { label: 'Banned', color: '#ff4d6d', bg: 'rgba(255,77,109,0.08)', border: 'rgba(255,77,109,0.2)' },
    inactive: { label: 'Inactive', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' },
    active: { label: 'Active', color: '#00e5a0', bg: 'rgba(0,229,160,0.08)', border: 'rgba(0,229,160,0.2)' },
};

const StatusBadge = ({ user: u }) => {
    const key = u.isBanned ? 'banned' : !u.isActive ? 'inactive' : 'active';
    const { label, color, bg, border } = STATUS_MAP[key];
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'var(--mono)', color, background: bg, border: `1px solid ${border}` }}>
            {key === 'active' && (
                <span style={{ position: 'relative', width: 5, height: 5 }}>
                    <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'ping 1.6s ease-in-out infinite', opacity: .4 }} />
                    <span style={{ position: 'relative', display: 'block', width: 5, height: 5, borderRadius: '50%', background: color }} />
                </span>
            )}
            {key !== 'active' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />}
            {label}
        </span>
    );
};

const ROLE_MAP = {
    Admin: { color: 'var(--accent-500)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
    Manager: { color: '#38bdf8', bg: 'rgba(56,189,248,0.07)', border: 'rgba(56,189,248,0.18)' },
    Developer: { color: '#a78bfa', bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.18)' },
};

const RoleBadge = ({ role }) => {
    const { color, bg, border } = ROLE_MAP[role] || ROLE_MAP.Developer;
    return (
        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: 'var(--mono)', color, background: bg, border: `1px solid ${border}` }}>
            {role}
        </span>
    );
};

/* ─────────────── sparkline stat card ─── */
const StatCard = ({ label, value, sub, color, spark, icon, delay = 0 }) => {
    const data = useMemo(() => sparkData(value || 10), [value]);
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay, ease: [.22, 1, .36, 1] }}
            whileHover={{ y: -3, transition: { duration: .2 } }}
            style={{ position: 'relative', borderRadius: 32, overflow: 'hidden', cursor: 'default' }}
        >
            <div className="absolute inset-0 z-0">
                <GlassSurface width="100%" height="100%" borderRadius={32} displace={0.5} distortionScale={-60} backgroundOpacity={0.06} opacity={0.93} />
            </div>
            <div style={{ padding: '24px 28px', width: '100%', height: '100%', position: 'relative', zIndex: 10 }}>
                    {/* sparkline bg */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, opacity: .35 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={color} stopOpacity={.4} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${label})`} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {/* corner glow */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at top right, ${color}12, transparent 70%)`, pointerEvents: 'none' }} />
                    {/* icon */}
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color }}>
                        {icon}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#4a5568', fontFamily: 'var(--mono)', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: '-2px', color }}>
                        <AnimatedNumber value={value || 0} />
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10, fontFamily: 'var(--mono)', color: `${color}80`, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 7l3-3 2 2 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {sub}
                    </div>
                </div>
        </motion.div>
    );
};

/* ──────────────── command palette ─── */
const CommandPalette = ({ open, onClose, users = [], onBan, onRole }) => (
    <AnimatePresence>
        {open && (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120 }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: .94, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .94, y: -20 }}
                    transition={{ duration: .2, ease: [.22, 1, .36, 1] }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: '100%', maxWidth: 540, background: '#0c0c16', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.8)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#4a5568" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input autoFocus placeholder="Search users, actions..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--mono)', fontSize: 13, color: '#e2e8f0' }} />
                        <kbd style={{ fontSize: 9, fontFamily: 'var(--mono)', color: '#4a5568', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 6px' }}>ESC</kbd>
                    </div>
                    <div style={{ padding: '6px 6px 10px' }}>
                        <div style={{ padding: '6px 12px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#334155', fontFamily: 'var(--mono)' }}>Quick Actions</div>
                        {[
                            { icon: '⚡', label: 'Schedule Maintenance', hint: 'System' },
                            { icon: '📋', label: 'Export User CSV', hint: 'Export' },
                            { icon: '🔒', label: 'Lock All Sessions', hint: 'Security' },
                            { icon: '📊', label: 'View Activity Log', hint: 'Audit' },
                        ].map((a, i) => (
                            <motion.button key={i} whileHover={{ background: 'rgba(0,229,160,0.05)' }}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontFamily: 'var(--sans)', fontSize: 13, textAlign: 'left' }}
                                onClick={onClose}
                            >
                                <span style={{ fontSize: 15 }}>{a.icon}</span>
                                <span style={{ flex: 1 }}>{a.label}</span>
                                <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: '#334155', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 4 }}>{a.hint}</span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

/* ────────────────── user row ─── */
const UserRow = ({ u, user, onRole, onBan, index }) => (
    <motion.tr
        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .3, delay: index * 0.04, ease: [.22, 1, .36, 1] }}
        style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}
    >
        <td style={{ padding: '14px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={u.avatar} alt={u.name} loading="lazy" decoding="async" style={{ width: 38, height: 38, borderRadius: 11, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.07)' }} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', border: '2px solid #080812', background: u.isActive && !u.isBanned ? '#00e5a0' : '#374151' }} />
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#374151', fontFamily: 'var(--mono)', marginTop: 1 }}>{u.email}</div>
                </div>
            </div>
        </td>
        <td style={{ padding: '14px 24px' }}><RoleBadge role={u.role} /></td>
        <td style={{ padding: '14px 24px' }}><StatusBadge user={u} /></td>
        <td style={{ padding: '14px 24px', fontSize: 11, color: '#374151', fontFamily: 'var(--mono)' }}>
            {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
        </td>
        <td style={{ padding: '14px 24px' }}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#374151', cursor: 'pointer', marginLeft: 'auto' }}
                    >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                        </svg>
                    </motion.button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        style={{ width: 200, background: '#0c0c18', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 6, boxShadow: '0 24px 60px rgba(0,0,0,.8)', zIndex: 999, animationDuration: '.15s' }}
                        sideOffset={6} align="end"
                    >
                        <div style={{ padding: '5px 10px 3px', fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#2d3748', fontFamily: 'var(--mono)' }}>Assign Role</div>
                        {['Admin', 'Manager', 'Developer'].map(r => (
                            <DropdownMenu.Item key={r} disabled={u.role === r} onSelect={() => onRole(u._id, r)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, color: u.role === r ? '#2d3748' : '#94a3b8', cursor: u.role === r ? 'not-allowed' : 'pointer', outline: 'none', transition: 'background .1s' }}
                                onMouseEnter={e => { if (u.role !== r) e.currentTarget.style.background = 'rgba(0,229,160,0.07)'; e.currentTarget.style.color = '#00e5a0'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = u.role === r ? '#2d3748' : '#94a3b8'; }}
                            >
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', opacity: .5, flexShrink: 0 }} />
                                Set as {r}
                            </DropdownMenu.Item>
                        ))}
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                        <DropdownMenu.Item disabled={u._id === user._id} onSelect={() => { if (window.confirm(`${u.isBanned ? 'Unban' : 'Ban'} ${u.name}?`)) onBan(u._id); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, color: u._id === user._id ? '#2d3748' : '#ff4d6d', cursor: u._id === user._id ? 'not-allowed' : 'pointer', outline: 'none' }}
                            onMouseEnter={e => { if (u._id !== user._id) e.currentTarget.style.background = 'rgba(255,77,109,0.07)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                        >
                            {u.isBanned ? '↑ Unban User' : '⊘ Ban User'}
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </td>
    </motion.tr>
);

/* ─────────────── maintenance modal ─── */
const MaintenanceModal = ({ open, onClose, maintenanceEndTime, setMaintenanceEndTime, onConfirm, loading }) => (
    <AnimatePresence>
        {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={e => e.target === e.currentTarget && onClose()}
            >
                <motion.div initial={{ opacity: 0, scale: .93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .93, y: 20 }}
                    transition={{ duration: .25, ease: [.22, 1, .36, 1] }}
                    style={{ width: '100%', maxWidth: 440, background: '#09090f', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 24, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.9), 0 0 60px rgba(255,77,109,0.04)' }}
                >
                    {/* red glow top */}
                    <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #ff4d6d, transparent)' }} />
                    <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ff4d6d" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </motion.div>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', fontFamily: 'var(--sans)' }}>Schedule Maintenance</div>
                                <div style={{ fontSize: 11, color: '#4a5568', fontFamily: 'var(--mono)', marginTop: 3 }}>All non-admin users will be blocked</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#4a5568', fontFamily: 'var(--mono)', marginBottom: 8 }}>
                                Expected Completion
                            </label>
                            <input type="datetime-local" value={maintenanceEndTime} onChange={e => setMaintenanceEndTime(e.target.value)}
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' }}
                                onFocus={e => e.target.style.borderColor = 'rgba(255,77,109,0.4)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                        </div>
                        <div style={{ padding: '12px 14px', background: 'rgba(255,77,109,0.04)', border: '1px solid rgba(255,77,109,0.1)', borderRadius: 12 }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#fca5a5', lineHeight: 1.65 }}>
                                <strong>Warning:</strong> Users will immediately see a maintenance screen. You retain full admin access.
                            </p>
                        </div>
                    </div>
                    <div style={{ padding: '14px 28px 24px', display: 'flex', gap: 10 }}>
                        <button onClick={onClose}
                            style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#4a5568', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '.05em', textTransform: 'uppercase' }}>
                            Cancel
                        </button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={onConfirm}
                            style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: '#ff4d6d', color: '#fff', fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '.05em', textTransform: 'uppercase', boxShadow: '0 8px 20px rgba(255,77,109,0.25)' }}>
                            {loading ? '...' : 'Enable Now'}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════ */
const AdminDashboard = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [maintenanceEndTime, setMaintenanceEndTime] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [roleFilter, setRoleFilter] = useState('All');

    if (user?.role !== 'Admin') return <Navigate to="/" replace />;

    /* keyboard shortcut for command palette */
    useEffect(() => {
        const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o); } };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    /* debounced search */
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    /* ── queries ── */
    const { data: statsRes } = useQuery({
        queryKey: ['adminStats'],
        queryFn: async () => (await api.get('/admin/stats')).data,
        refetchInterval: 30_000,
    });
    const stats = statsRes?.data || { users: { total: 0, active: 0, banned: 0 }, projects: { total: 0 } };

    const { data: usersData, isLoading } = useQuery({
        queryKey: ['adminUsers', page, debouncedSearch, roleFilter],
        queryFn: async () => (await api.get(`/admin/users?page=${page}&limit=10&search=${debouncedSearch}${roleFilter !== 'All' ? `&role=${roleFilter}` : ''}`)).data,
        keepPreviousData: true,
    });
    const users = usersData?.data || [];
    const meta = usersData?.meta || { page: 1, pages: 1, total: 0 };

    /* ── mutations ── */
    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, newRole }) => (await api.put(`/admin/users/${id}/role`, { role: newRole })).data,
        onSuccess: d => { toast.success(`Role → ${d.data.role}`); queryClient.invalidateQueries(['adminUsers']); },
        onError: e => toast.error(e.response?.data?.message || 'Failed'),
    });

    const toggleBanMutation = useMutation({
        mutationFn: async id => (await api.put(`/admin/users/${id}/ban`)).data,
        onSuccess: d => { toast.success(d.message); queryClient.invalidateQueries(['adminUsers']); },
        onError: e => toast.error(e.response?.data?.message || 'Failed'),
    });

    const toggleMaintenanceMutation = useMutation({
        mutationFn: async ({ enabled, endTime }) => {
            const utcEndTime = (enabled && endTime) ? new Date(endTime).toISOString() : null;
            return (await api.put('/admin/system/maintenance', { enabled, endTime: utcEndTime })).data;
        },
        onSuccess: d => {
            const on = d.data.value.enabled;
            toast.success(on ? `Maintenance until ${new Date(d.data.value.endTime).toLocaleString()}` : 'Maintenance disabled');
            queryClient.invalidateQueries(['adminStats']);
        },
    });

    const isMaintenanceMode = stats.system?.status === 'Maintenance';

    useEffect(() => {
        if (stats.system?.endTime && !maintenanceEndTime)
            setMaintenanceEndTime(fmtDTLocal(stats.system.endTime));
    }, [stats.system?.endTime]);

    /* ── bulk select ── */
    const allSelected = users.length > 0 && users.every(u => selectedRows.has(u._id));
    const toggleAll = () => setSelectedRows(allSelected ? new Set() : new Set(users.map(u => u._id)));

    /* ── derived filtered users ── */
    const filteredUsers = useMemo(() => users, [users]);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

                :root {
                    --sans: 'Bricolage Grotesque', sans-serif;
                    --mono: 'IBM Plex Mono', monospace;
                    --green: var(--accent-500);
                    --red:   #ff4d6d;
                    --blue:  #38bdf8;
                    --purple:#a78bfa;
                    --bg:    #080812;
                }

                @keyframes ping { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.8);opacity:0} }
                @keyframes scan { 0%{transform:translateY(0)} 100%{transform:translateY(100vh)} }
                @keyframes drift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-12px)} }

                * { box-sizing: border-box; }

                .adm-root {
                    font-family: var(--sans);
                    background: var(--bg);
                    min-height: 100vh;
                    color: #e2e8f0;
                    position: relative;
                    overflow-x: hidden;
                }

                /* grid lines */
                .adm-root::before {
                    content:'';
                    position:fixed; inset:0;
                    background-image:
                        linear-gradient(rgba(0,229,160,.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,229,160,.025) 1px, transparent 1px);
                    background-size: 52px 52px;
                    pointer-events:none; z-index:0;
                }

                /* scan line effect */
                .adm-root::after {
                    content:'';
                    position:fixed; top:0; left:0; right:0;
                    height:1px;
                    background: linear-gradient(90deg, transparent, rgba(0,229,160,.15), transparent);
                    animation: scan 8s linear infinite;
                    pointer-events:none; z-index:0;
                }

                .adm-inner { position:relative; z-index:1; }

                /* floating orbs */
                .orb {
                    position:fixed; border-radius:50%;
                    filter: blur(80px);
                    pointer-events:none; z-index:0;
                    animation: drift 12s ease-in-out infinite;
                }

                /* table */
                .adm-table { width:100%; border-collapse:collapse; }
                .adm-table thead th {
                    padding:12px 24px;
                    text-align:left;
                    font-size:9px; font-weight:700;
                    letter-spacing:.2em; text-transform:uppercase;
                    color:#2d3748; font-family:var(--mono);
                    background:rgba(255,255,255,0.01);
                    border-bottom:1px solid rgba(255,255,255,0.035);
                }
                .adm-table tbody tr { transition: background .12s; }
                .adm-table tbody tr:hover { background: rgba(0,229,160,.015); }
                .adm-table tbody tr:last-child td { border-bottom:none !important; }

                /* scrollbar */
                ::-webkit-scrollbar { width:5px; height:5px; }
                ::-webkit-scrollbar-track { background:transparent; }
                ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07); border-radius:3px; }

                /* filter pill */
                .filter-pill {
                    padding:5px 12px;
                    border-radius:8px;
                    font-size:11px; font-weight:600;
                    border:1px solid rgba(255,255,255,0.06);
                    background:transparent;
                    color:#4a5568;
                    cursor:pointer;
                    transition:all .15s;
                    font-family:var(--sans);
                }
                .filter-pill:hover { background:rgba(255,255,255,.04); color:#94a3b8; }
                .filter-pill.active { background:rgba(0,229,160,.08); border-color:rgba(0,229,160,.2); color:var(--green); }

                /* checkbox */
                .adm-checkbox {
                    width:14px; height:14px;
                    border:1px solid rgba(255,255,255,0.12);
                    border-radius:4px;
                    appearance:none;
                    background:transparent;
                    cursor:pointer;
                    transition:all .15s;
                    position:relative;
                }
                .adm-checkbox:checked { background:var(--green); border-color:var(--green); }
                .adm-checkbox:checked::after {
                    content:'✓'; position:absolute;
                    top:-1px; left:1px;
                    font-size:9px; color:#000; font-weight:800;
                }

                /* hover glow on rows */
                .adm-table tbody tr:hover .user-name-text { color: var(--green) !important; }
            `}</style>

            {/* Ambient orbs */}
            <div className="orb" style={{ width: 500, height: 500, top: -200, left: -150, background: 'rgba(0,229,160,.04)' }} />
            <div className="orb" style={{ width: 400, height: 400, bottom: -100, right: -100, background: 'rgba(56,189,248,.03)', animationDelay: '-6s' }} />

            <div className="adm-root cv-auto">
                <div className="adm-inner" style={{ padding: '36px 32px 80px', maxWidth: 1380, margin: '0 auto' }}>

                    {/* ── HEADER ── */}
                    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}
                        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 44 }}
                    >
                        <div>
                            {/* breadcrumb */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <span style={{ fontSize: 11, color: '#2d3748', fontFamily: 'var(--mono)' }}>admin</span>
                                <span style={{ color: '#1e293b' }}>/</span>
                                <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--mono)' }}>security</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 4, height: 36, background: 'linear-gradient(180deg, var(--green), transparent)', borderRadius: 2 }} />
                                <div>
                                    <h1 style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.1 }}>
                                        Security & Access
                                    </h1>
                                    <p style={{ fontSize: 12, color: '#374151', fontFamily: 'var(--mono)', margin: '4px 0 0' }}>
                                        {meta.total} users · last sync {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {/* Command palette trigger */}
                            <Tooltip.Provider delayDuration={200}>
                                <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }} onClick={() => setCmdOpen(true)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, background: 'rgba(255,255,255,0.03)', color: '#4a5568', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>
                                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            <span>⌘K</span>
                                        </motion.button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content style={{ fontSize: 11, fontFamily: 'var(--mono)', background: '#1e2030', color: '#94a3b8', padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)' }} sideOffset={5}>
                                        Command Palette
                                    </Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>

                            {isMaintenanceMode && stats.system?.endTime && (
                                <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.15)', borderRadius: 12 }}>
                                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                                        style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)' }} />
                                    <div>
                                        <div style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--red)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Maintenance</div>
                                        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, color: '#fca5a5' }}>
                                            Until {new Date(stats.system.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <Link to="/admin/security"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#4a5568', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--sans)', transition: 'all .2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#4a5568'; }}
                            >
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Audit Log
                            </Link>

                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: .97 }}
                                onClick={() => isMaintenanceMode ? toggleMaintenanceMutation.mutate({ enabled: false }) : setIsModalOpen(true)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 12, border: `1px solid ${isMaintenanceMode ? 'var(--green)' : 'rgba(255,77,109,0.3)'}`, background: isMaintenanceMode ? 'var(--green)' : 'rgba(255,77,109,0.08)', color: isMaintenanceMode ? '#020810' : 'var(--red)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all .2s' }}
                            >
                                <motion.span 
                                    animate={toggleMaintenanceMutation.isPending ? { rotate: 360 } : {}} 
                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    className="flex items-center justify-center"
                                >
                                    {toggleMaintenanceMutation.isPending ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                    ) : (
                                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    )}
                                </motion.span>
                                {isMaintenanceMode ? 'Disable Maintenance' : 'Schedule Maintenance'}
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* ── STAT CARDS ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                        <StatCard label="Total Users" value={stats.users.total} color="var(--green)" sub="Registered accounts" delay={0} icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>} spark />
                        <StatCard label="Active Users" value={stats.users.active} color="var(--green)" sub="Verified & operational" delay={.07} icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} spark />
                        <StatCard label="Blacklisted" value={stats.users.banned} color="var(--red)" sub="Restricted access" delay={.14} icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} spark />
                        <StatCard label="Projects" value={stats.projects?.total ?? 0} color="var(--blue)" sub="Across all workspaces" delay={.21} icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} spark />
                    </div>

                    {/* ── TABLE PANEL ── */}
                    <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden' }}>
                        <div className="absolute inset-0 z-0">
                            <GlassSurface width="100%" height="100%" borderRadius={22} displace={0.5} distortionScale={-60} backgroundOpacity={0.06} opacity={0.93} />
                        </div>
                        <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
                                {/* toolbar */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                                    {/* search */}
                                    <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
                                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 14px 9px 36px', fontFamily: 'var(--mono)', fontSize: 12, color: '#e2e8f0', outline: 'none', transition: 'border-color .2s' }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(0,229,160,.25)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                                        />
                                        {search && (
                                            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#374151', cursor: 'pointer', padding: 2, display: 'flex' }}>
                                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* role filters */}
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        {['All', 'Admin', 'Manager', 'Developer'].map(r => (
                                            <button key={r} className={`filter-pill${roleFilter === r ? ' active' : ''}`} onClick={() => { setRoleFilter(r); setPage(1); }}>
                                                {r}
                                            </button>
                                        ))}
                                    </div>

                                    {/* bulk actions (when rows selected) */}
                                    <AnimatePresence>
                                        {selectedRows.size > 0 && (
                                            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'rgba(0,229,160,.06)', border: '1px solid rgba(0,229,160,.15)', borderRadius: 10 }}>
                                                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 600 }}>{selectedRows.size} selected</span>
                                                <button onClick={() => setSelectedRows(new Set())}
                                                    style={{ fontSize: 9, fontFamily: 'var(--mono)', color: '#374151', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.1em' }}>clear</button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--mono)', color: '#2d3748' }}>
                                        {meta.total} total
                                    </div>
                                </div>

                                {/* table */}
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="adm-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 40, paddingLeft: 24 }}>
                                                    <input type="checkbox" className="adm-checkbox" checked={allSelected} onChange={toggleAll} />
                                                </th>
                                                <th>User</th>
                                                <th>Role</th>
                                                <th>Status</th>
                                                <th>Joined</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                Array.from({ length: 8 }).map((_, i) => (
                                                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .05 }}>
                                                        <td style={{ padding: '14px 24px' }}><div style={{ width: 14, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} /></td>
                                                        <td style={{ padding: '14px 24px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.04)', flexShrink: 0, backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.02) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.02) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                                                <div>
                                                                    <div style={{ width: 110, height: 11, borderRadius: 5, background: 'rgba(255,255,255,0.04)', marginBottom: 6, backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.02) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.02) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                                                    <div style={{ width: 75, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.03)', backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.02) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.02) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {[55, 65, 90, 32].map((w, j) => (
                                                            <td key={j} style={{ padding: '14px 24px' }}>
                                                                <div style={{ width: w, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.03)', backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.02) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.02) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                                                            </td>
                                                        ))}
                                                    </motion.tr>
                                                ))
                                            ) : filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ padding: '70px 24px', textAlign: 'center' }}>
                                                        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}>
                                                            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
                                                            <div style={{ fontSize: 13, color: '#2d3748', fontFamily: 'var(--mono)' }}>No users found for "{search}"</div>
                                                        </motion.div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map((u, i) => (
                                                    <motion.tr key={u._id}
                                                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: .3, delay: i * 0.04, ease: [.22, 1, .36, 1] }}
                                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.025)' }}
                                                    >
                                                        <td style={{ padding: '14px 24px' }}>
                                                            <input type="checkbox" className="adm-checkbox"
                                                                checked={selectedRows.has(u._id)}
                                                                onChange={() => setSelectedRows(prev => { const s = new Set(prev); s.has(u._id) ? s.delete(u._id) : s.add(u._id); return s; })}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '14px 24px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                                                    <img src={u.avatar} alt={u.name} loading="lazy" decoding="async" style={{ width: 38, height: 38, borderRadius: 11, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.07)' }} />
                                                                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', border: '2px solid #080812', background: u.isActive && !u.isBanned ? 'var(--green)' : '#374151' }} />
                                                                </div>
                                                                <div>
                                                                    <div className="user-name-text" style={{ fontSize: 13, fontWeight: 700, color: '#d1d5db', transition: 'color .15s' }}>{u.name}</div>
                                                                    <div style={{ fontSize: 11, color: '#374151', fontFamily: 'var(--mono)', marginTop: 1 }}>{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '14px 24px' }}><RoleBadge role={u.role} /></td>
                                                        <td style={{ padding: '14px 24px' }}><StatusBadge user={u} /></td>
                                                        <td style={{ padding: '14px 24px', fontSize: 11, color: '#374151', fontFamily: 'var(--mono)' }}>
                                                            {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </td>
                                                        <td style={{ padding: '14px 24px' }}>
                                                            <DropdownMenu.Root>
                                                                <DropdownMenu.Trigger asChild>
                                                                    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .92 }}
                                                                        style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#374151', cursor: 'pointer', marginLeft: 'auto' }}>
                                                                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                                                                        </svg>
                                                                    </motion.button>
                                                                </DropdownMenu.Trigger>
                                                                <DropdownMenu.Portal>
                                                                    <DropdownMenu.Content
                                                                        style={{ width: 196, background: '#0b0b17', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 6, boxShadow: '0 24px 60px rgba(0,0,0,.85)', zIndex: 999 }}
                                                                        sideOffset={6} align="end"
                                                                    >
                                                                        <div style={{ padding: '5px 10px 3px', fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: '#2d3748', fontFamily: 'var(--mono)' }}>Assign Role</div>
                                                                        {['Admin', 'Manager', 'Developer'].map(r => (
                                                                            <DropdownMenu.Item key={r} disabled={u.role === r} onSelect={() => updateRoleMutation.mutate({ id: u._id, newRole: r })}
                                                                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, color: u.role === r ? '#2d3748' : '#94a3b8', cursor: u.role === r ? 'not-allowed' : 'pointer', outline: 'none' }}
                                                                                onMouseEnter={e => { if (u.role !== r) { e.currentTarget.style.background = 'rgba(0,229,160,0.07)'; e.currentTarget.style.color = 'var(--green)'; } }}
                                                                                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = u.role === r ? '#2d3748' : '#94a3b8'; }}
                                                                            >
                                                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', opacity: .4, flexShrink: 0 }} />
                                                                                Set as {r}
                                                                            </DropdownMenu.Item>
                                                                        ))}
                                                                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                                                        <DropdownMenu.Item disabled={u._id === user._id}
                                                                            onSelect={() => { if (window.confirm(`${u.isBanned ? 'Unban' : 'Ban'} ${u.name}?`)) toggleBanMutation.mutate(u._id); }}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600, color: u._id === user._id ? '#2d3748' : 'var(--red)', cursor: u._id === user._id ? 'not-allowed' : 'pointer', outline: 'none' }}
                                                                            onMouseEnter={e => { if (u._id !== user._id) e.currentTarget.style.background = 'rgba(255,77,109,0.07)'; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                                                                        >
                                                                            {u.isBanned ? '↑ Unban User' : '⊘ Ban User'}
                                                                        </DropdownMenu.Item>
                                                                    </DropdownMenu.Content>
                                                                </DropdownMenu.Portal>
                                                            </DropdownMenu.Root>
                                                        </td>
                                                    </motion.tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* pagination */}
                                <AnimatePresence>
                                    {!isLoading && meta.pages > 1 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#2d3748' }}>
                                                {(page - 1) * 10 + 1}–{Math.min(page * 10, meta.total)} <span style={{ color: '#1e293b' }}>of</span> <span style={{ color: 'var(--green)' }}>{meta.total}</span>
                                            </span>
                                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                                {/* page nums */}
                                                {Array.from({ length: Math.min(meta.pages, 5) }, (_, i) => {
                                                    const p = i + 1;
                                                    return (
                                                        <motion.button key={p} whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
                                                            onClick={() => setPage(p)}
                                                            style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${page === p ? 'rgba(0,229,160,.3)' : 'rgba(255,255,255,0.06)'}`, background: page === p ? 'rgba(0,229,160,.08)' : 'transparent', color: page === p ? 'var(--green)' : '#374151', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600, transition: 'all .15s' }}>
                                                            {p}
                                                        </motion.button>
                                                    );
                                                })}
                                                {meta.pages > 5 && <span style={{ color: '#2d3748', fontSize: 11, fontFamily: 'var(--mono)', padding: '0 4px' }}>…</span>}
                                                {meta.pages > 5 && (
                                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}
                                                        onClick={() => setPage(meta.pages)}
                                                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${page === meta.pages ? 'rgba(0,229,160,.3)' : 'rgba(255,255,255,0.06)'}`, background: page === meta.pages ? 'rgba(0,229,160,.08)' : 'transparent', color: page === meta.pages ? 'var(--green)' : '#374151', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600 }}>
                                                        {meta.pages}
                                                    </motion.button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                    {/* bottom status bar */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .6 }}
                        style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16, padding: '8px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }}
                                style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#2d3748' }}>All systems operational</span>
                        </div>
                        <span style={{ color: '#1a1a2e', fontSize: 10 }}>·</span>
                        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#2d3748' }}>Auto-refresh 30s</span>
                        <span style={{ color: '#1a1a2e', fontSize: 10 }}>·</span>
                        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#2d3748' }}>v2.4.1</span>
                    </motion.div>
                </div>
            </div>

            {/* ── COMMAND PALETTE ── */}
            <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} users={users} />

            {/* ── MAINTENANCE MODAL ── */}
            <MaintenanceModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                maintenanceEndTime={maintenanceEndTime}
                setMaintenanceEndTime={setMaintenanceEndTime}
                loading={toggleMaintenanceMutation.isLoading}
                onConfirm={() => {
                    if (!maintenanceEndTime) return toast.error('Set a completion time first');
                    toggleMaintenanceMutation.mutate({ enabled: true, endTime: maintenanceEndTime });
                    setIsModalOpen(false);
                }}
            />

            <style>{`@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}`}</style>
        </>
    );
};

export default AdminDashboard;