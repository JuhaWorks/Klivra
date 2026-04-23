import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import { useAuthStore, api } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Activity, ArrowUpRight, TrendingUp,
    Target, Clock, AlertCircle, CheckCircle2,
    Zap, Briefcase, ChevronRight, MoreHorizontal,
    Circle, Minus
} from 'lucide-react';
import ApodWidget from '../components/tools/Widgets/ApodWidget';
import WeatherWidget from '../components/tools/Widgets/WeatherWidget';
import GlobalClockWidget from '../components/tools/Widgets/GlobalClockWidget';
import QuoteWidget from '../components/tools/Widgets/QuoteWidget';
import IntelligenceWidget from '../components/tools/Widgets/IntelligenceWidget';
import { useSocketStore } from '../store/useSocketStore';
import { Button, Card, Counter } from '../components/ui/BaseUI';
import { DeadlinePopup } from '../components/projects/ProjectShared';
import { cn } from '../utils/cn';
import TaskDetailModal from '../components/Kanban/TaskDetailModal';
import { toast } from 'react-hot-toast';

// c:\Users\asus\CSE 471 Project\frontend\src\pages\Home.jsx

/* --- DESIGN TOKENS (Streamlined) ------------------------------ */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ent-root {
    --ent-font: 'DM Sans', sans-serif; --ent-mono: 'DM Mono', monospace;
    --ent-bg: var(--bg-base); --ent-surface: var(--bg-surface); --ent-surface-2: var(--bg-sunken);
    --ent-border: var(--border-default); --ent-border-2: var(--border-strong);
    --ent-text-1: var(--text-primary); --ent-text-2: var(--text-secondary); --ent-text-3: var(--text-tertiary);
    --ent-accent: var(--accent-500); --ent-accent-dim: var(--accent-bg);
    --v-emerald: hsl(162,70%,55%); --v-cyan: hsl(200,65%,55%); --v-amber: hsl(75,75%,65%);
    --v-orange: hsl(45,80%,55%); --v-blue: hsl(240,70%,55%); --v-indigo: hsl(270,70%,55%); --v-rose: hsl(15,80%,60%);
    font-family: var(--ent-font); font-feature-settings: 'ss01','ss02','cv01'; -webkit-font-smoothing: antialiased;
    transition: background 0.3s ease, color 0.3s ease;
  }
  .text-hue-vibrant {
    background: linear-gradient(135deg, var(--v-emerald), var(--v-blue), var(--v-rose));
    background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: ent-hue-shift 8s ease infinite alternate;
  }
  @keyframes ent-hue-shift { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
  .glow-blob { position: absolute; width: 40vw; height: 40vw; border-radius: 50%; filter: blur(80px); opacity: 0.05; pointer-events: none; z-index: 0; }
  .ent-scroll::-webkit-scrollbar { width: 3px; }
  .ent-scroll::-webkit-scrollbar-thumb { background: var(--ent-border-2); border-radius: 10px; }
  .ent-task-row {
    display: grid; grid-template-columns: minmax(200px, 1.5fr) 140px 120px 1.2fr; gap: 12px; align-items: center;
    border-bottom: 1px solid var(--ent-border); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); cursor: pointer;
  }
  .ent-task-row:hover { background: var(--ent-surface-2); transform: translateX(4px); }
  .ent-tag { display: inline-flex; items-center; gap: 6px; font-family: var(--ent-mono); font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 20px; border: 1px solid; }
  .ent-label { font-family: var(--ent-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ent-text-3); }
  .ent-h-metric { display: flex; flex-direction: column; padding: 0 32px; border-right: 1px solid var(--ent-border); }
  @media (max-width: 1200px) {
    .ent-dashboard-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
    .ent-task-row { grid-template-columns: 1.5fr minmax(80px, 0.8fr) 0.8fr 1fr; padding: 16px !important; }
    .ent-task-row span:nth-child(2), .ent-task-row span:nth-child(3), .ent-header-hud { display: none !important; }
  }
  @media (max-width: 768px) {
    .ent-root { padding: 0 20px 48px !important; }
    header { padding: 32px 0 24px !important; flex-direction: column !important; align-items: flex-start !important; gap: 24px !important; }
    .ent-greeting-area h1 { font-size: 26px !important; white-space: normal !important; }
    .ent-task-row { grid-template-columns: 1fr 80px !important; }
  }
  @keyframes ent-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .ent-animate { animation: ent-fadein 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
`;


/* --- HELPERS ------------------------------------------------------------- */
const priorityConfig = {
    Urgent: { color: 'var(--v-rose)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', glow: 'rgba(239,68,68,0.2)' },
    High: { color: 'var(--v-amber)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.2)' },
    Medium: { color: 'var(--v-blue)', bg: 'rgba(59,130,246,0.05)', border: 'var(--ent-border)', glow: 'transparent' },
    Low: { color: 'var(--ent-text-3)', bg: 'transparent', border: 'var(--ent-border)', glow: 'transparent' },
};

const statusConfig = {
    'In Progress': { color: 'var(--v-blue)', dot: true, bg: 'rgba(59,130,246,0.1)' },
    'Pending': { color: 'var(--ent-text-3)', dot: false, bg: 'transparent' },
    'Completed': { color: 'var(--v-emerald)', dot: false, bg: 'rgba(34,197,94,0.1)' },
};

const Tag = ({ label, config }) => (
    <span className="ent-tag" style={{
        color: config.color,
        background: config.bg,
        borderColor: config.border,
        boxShadow: config.glow ? `0 0 12px ${config.glow}` : 'none'
    }}>
        {config.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: config.color, display: 'inline-block', flexShrink: 0 }} />}
        {label}
    </span>
);

const HeaderMetric = ({ label, value, unit, color1, color2 }) => (
    <div className="ent-h-metric">
        <span className="ent-label" style={{ marginBottom: 4 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{
                fontFamily: 'var(--ent-mono)',
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1,
                background: `linear-gradient(to bottom right, ${color1}, ${color2})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                <Counter value={value} />
            </span>
            {unit && <span style={{ fontFamily: 'var(--ent-mono)', fontSize: 10, color: 'var(--ent-text-3)', marginLeft: 1 }}>{unit}</span>}
        </div>
    </div>
);

const SectionHeader = ({ label, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 16px' }}>
        <span className="ent-label" style={{ fontSize: 10, letterSpacing: '0.15em' }}>{label}</span>
        {right}
    </div>
);

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */
const Home = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [selectedTask, setSelectedTask] = useState(null);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting('Good morning');
        else if (h < 17) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    /* queries */
    const { data: projRes } = useQuery({
        queryKey: ['projects'],
        queryFn: async ({ signal }) => (await api.get('/projects', { signal })).data,
        staleTime: 1000 * 60 * 5,
    });
    const projects = projRes?.data || [];

    const { data: taskRes } = useQuery({
        queryKey: ['myTasks'],
        queryFn: async ({ signal }) => (await api.get('/tasks', { signal })).data,
        staleTime: 1000 * 60 * 2,
    });
    const allTasks = taskRes?.data || [];

    const { data: wsAnalytics } = useQuery({
        queryKey: ['workspaceAnalytics'],
        queryFn: async () => (await api.get('/analytics/workspace')).data,
        staleTime: 1000 * 60 * 10,
    });

    const ws = useMemo(() => {
        const d = wsAnalytics?.data || {};
        return {
            phi: d.phi ?? 100,
            chaosIndex: d.chaosIndex ?? 0,
            completionPct: d.completionPct ?? 0,
            activeProjects: d.activeProjects ?? 0,
            completedTasks: d.completedTasks ?? 0,
            totalTasks: d.totalTasks ?? 0,
            bottlenecks: d.bottlenecks || [],
        };
    }, [wsAnalytics]);

    const taskStats = useMemo(() => {
        return {
            total: allTasks.length,
            pending: allTasks.filter(t => t.status === 'Pending').length,
            active: allTasks.filter(t => t.status === 'In Progress').length,
            urgent: allTasks.filter(t => (t.priority === 'Urgent' || (t.endDate && new Date(t.endDate) < new Date())) && t.status !== 'Completed').length,
        };
    }, [allTasks]);

    const myFocusTasks = useMemo(() => {
        return allTasks
            .filter(t => t.status !== 'Completed' && t.status !== 'Canceled')
            .sort((a, b) => {
                const p = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
                if (p[b.priority] !== p[a.priority]) return p[b.priority] - p[a.priority];
                return (a.dueDate && b.dueDate) ? new Date(a.dueDate) - new Date(b.dueDate) : 0;
            })
            .slice(0, 12);
    }, [allTasks]);

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, updates }) => (await api.put(`/tasks/${id}`, updates)).data,
        onSuccess: () => {
            queryClient.invalidateQueries(['myTasks']);
            queryClient.invalidateQueries(['workspace-stats']);
            toast.success('Task updated');
        },
        onError: () => toast.error('Failed to update task'),
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/tasks/${id}`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries(['myTasks']);
            queryClient.invalidateQueries(['workspace-stats']);
            toast.success('Task deleted');
            setSelectedTask(null);
        },
        onError: () => toast.error('Failed to delete task')
    });

    /* completion bar */
    const pct = Math.min(100, Math.max(0, ws.completionPct));

    return (
        <div
            className="ent-root"
            style={{
                minHeight: '100vh',
                background: 'transparent',
                color: 'var(--ent-text-1)',
                padding: '0 0 64px',
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative',
            }}
        >
            <style>{styles}</style>
            <DeadlinePopup projects={projects} user={user} />

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <header style={{
                padding: '48px 0 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--ent-border)',
                marginBottom: 40,
                gap: 40,
            }}>
                <div className="ent-greeting-area" style={{ display: 'flex', alignItems: 'baseline', gap: 48, flexWrap: 'wrap' }}>
                    <div style={{ paddingRight: 48, borderRight: '1px solid var(--ent-border)' }}>
                        <p style={{ fontFamily: 'var(--ent-mono)', fontSize: 10, color: 'var(--ent-text-3)', letterSpacing: '0.15em', marginBottom: 4 }}>
                            {dateString}
                        </p>
                        <h1 style={{ fontSize: 34, fontWeight: 600, color: 'var(--ent-text-1)', margin: 0, letterSpacing: '-0.04em', whiteSpace: 'nowrap' }}>
                            <span className="text-hue-vibrant">{greeting}</span>, <span style={{ color: 'var(--ent-text-2)' }}>{user?.name?.split(' ')[0] || 'Member'}</span>
                        </h1>
                    </div>

                    {/* HUD / Metrics Integrated into Header */}
                    <div className="ent-header-hud" style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 0
                    }}>
                        <HeaderMetric label="Health" value={ws.phi} unit="%" color1="var(--v-emerald)" color2="var(--v-cyan)" />
                        <HeaderMetric label="Stability" value={100 - ws.chaosIndex} unit="%" color1="var(--v-amber)" color2="var(--v-orange)" />
                        <HeaderMetric label="Resolved" value={ws.completedTasks} color1="var(--v-blue)" color2="var(--v-indigo)" />
                        <HeaderMetric label="Active" value={ws.activeProjects} color1="var(--v-rose)" color2="var(--v-orange)" />
                    </div>
                </div>

                <div className="ent-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 48, alignItems: 'start' }}>
                    {user?.role !== 'Admin' && (
                        <Button
                            variant="primary"
                            leftIcon={Plus}
                            as={Link}
                            to="/projects"
                            style={{
                                fontFamily: 'var(--ent-mono)',
                                fontSize: 10,
                                letterSpacing: '0.08em',
                                fontWeight: 500,
                                background: 'var(--ent-text-1)',
                                color: 'var(--bg-base)',
                                border: 'none',
                                borderRadius: 24, // Rounded corners
                                padding: '10px 20px',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-elevation)'
                            }}
                        >
                            New Project
                        </Button>
                    )}
                </div>
            </header>

            {/* ── BODY GRID ────────────────────────────────────────────────── */}
            <div
                className={cn(
                    "ent-main-grid",
                    user?.role === 'Admin' && user?.interfacePrefs?.showIntelligence !== false ? "ent-admin-layout" : "ent-standard-layout"
                )}
                style={{
                    display: 'grid',
                    gridTemplateColumns: user?.role === 'Admin' && user?.interfacePrefs?.showIntelligence !== false
                        ? '300px 1fr 300px'
                        : '1fr 340px',
                    gap: 48,
                    alignItems: 'start',
                }}
            >

                {/* ACTIVITY FEED — Admin only ─────────────────────────────── */}
                {user?.role === 'Admin' && user?.interfacePrefs?.showIntelligence !== false && (
                    <div className="ent-admin-pulse">
                        <SectionHeader label="System Pulse" />
                        <div style={{ background: 'transparent' }}>
                            <IntelligenceWidget fixed />
                        </div>
                    </div>
                )}

                {/* TASKS ───────────────────────────────────────────────────── */}
                <div className="ent-task-col" style={{ minWidth: 0 }}>
                    {/* task count line */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
                        <span className="ent-label">Active Tracks</span>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontFamily: 'var(--ent-mono)', fontSize: 9, color: 'var(--ent-blue)' }}>
                                {taskStats.active} in progress
                            </span>
                            {taskStats.urgent > 0 && (
                                <span style={{ fontFamily: 'var(--ent-mono)', fontSize: 9, color: 'var(--ent-red)' }}>
                                    {taskStats.urgent} critical
                                </span>
                            )}
                        </div>
                    </div>

                    {/* table */}
                    <div style={{
                        background: 'var(--ent-surface)',
                        border: '1px solid var(--ent-border)',
                        borderRadius: 24, // Softer rounding
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-elevation)'
                    }}>
                        {/* thead */}
                        <div className="ent-task-row" style={{
                            background: 'var(--ent-surface-2)',
                            cursor: 'default',
                            padding: '14px 24px',
                        }}>
                            <span className="ent-label" style={{ paddingLeft: 0 }}>Title</span>
                            <span className="ent-label">Status</span>
                            <span className="ent-label">Priority</span>
                            <span className="ent-label" style={{ textAlign: 'right' }}>Project</span>
                        </div>

                        {/* tbody */}
                        <div className="ent-scroll" style={{ maxHeight: 520, overflowY: 'auto' }}>
                            {myFocusTasks.length > 0 ? myFocusTasks.map((t, i) => {
                                const pConf = priorityConfig[t.priority] || priorityConfig.Medium;
                                const sConf = statusConfig[t.status] || statusConfig['Pending'];
                                return (
                                    <div
                                        key={t._id}
                                        className="ent-task-row ent-animate"
                                        style={{ animationDelay: `${i * 30}ms`, padding: '20px 24px', background: 'transparent' }}
                                        onClick={() => setSelectedTask(t)}
                                    >
                                        <span style={{
                                            fontSize: 14,
                                            fontWeight: 500,
                                            color: 'var(--ent-text-1)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            paddingRight: 20
                                        }}>
                                            {t.title}
                                        </span>

                                        <Tag label={t.status} config={sConf} />

                                        <Tag label={t.priority} config={pConf} />

                                        <span style={{
                                            fontFamily: 'var(--ent-mono)',
                                            fontSize: 10,
                                            color: 'var(--ent-text-3)',
                                            textAlign: 'right',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {t.project?.name || '—'}
                                        </span>
                                    </div>
                                );
                            }) : (
                                <div style={{
                                    padding: '64px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 12,
                                    color: 'var(--ent-text-3)',
                                }}>
                                    <CheckCircle2 size={24} strokeWidth={1.5} />
                                    <span className="ent-label">All systems clear</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* completion bar */}
                    <div style={{
                        marginTop: 32,
                        background: 'var(--ent-surface)',
                        border: '1px solid var(--ent-border)',
                        borderRadius: 24, // Softer rounding
                        padding: '24px 32px',
                        boxShadow: 'var(--shadow-elevation)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span className="ent-label">Workload Completion</span>
                            <span style={{ fontFamily: 'var(--ent-mono)', fontSize: 13, color: 'var(--ent-text-1)' }}>
                                <Counter value={pct} />%
                            </span>
                        </div>
                        <div style={{ height: 1, background: 'var(--ent-border)', borderRadius: 1 }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(to right, var(--v-blue), var(--v-emerald))',
                                    borderRadius: 2
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 40, marginTop: 16 }}>
                            <div>
                                <span className="ent-label">Resolved</span>
                                <p style={{ fontFamily: 'var(--ent-mono)', fontSize: 18, color: 'var(--ent-text-1)', margin: '4px 0 0' }}>{ws.completedTasks}</p>
                            </div>
                            <div>
                                <span className="ent-label">Remaining</span>
                                <p style={{ fontFamily: 'var(--ent-mono)', fontSize: 18, color: 'var(--ent-red)', margin: '4px 0 0' }}>{(ws.totalTasks || 0) - (ws.completedTasks || 0)}</p>
                            </div>
                        </div>
                    </div>

                    {/* APOD */}
                    {user?.interfacePrefs?.showApod !== false && (
                        <div style={{ marginTop: 32 }}>
                            <SectionHeader label="Visual Intelligence" />
                            <div style={{ background: 'transparent' }}>
                                <ApodWidget />
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDEBAR ───────────────────────────────────────────── */}
                <div className="ent-sidebar-col" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 48 }}>

                    {/* Bottlenecks */}
                    {ws.bottlenecks?.length > 0 && (
                        <div>
                            <SectionHeader label="Strategic Risks" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {ws.bottlenecks.slice(0, 4).map((task, i) => {
                                    const isOverdue = task.endDate && new Date(task.endDate) < new Date();
                                    const isUrgent = task.priority?.toLowerCase() === 'urgent';
                                    const badge = isUrgent ? 'CRITICAL' : isOverdue ? 'OVERDUE' : 'AT RISK';
                                    const bColor = (isUrgent || isOverdue) ? 'var(--ent-red)' : 'var(--ent-amber)';
                                    return (
                                        <div
                                            key={task._id}
                                            onClick={() => setSelectedTask(task)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 12,
                                                padding: '12px 0',
                                                borderBottom: '1px solid var(--ent-border)',
                                                cursor: 'pointer',
                                                transition: 'opacity 0.2s',
                                            }}
                                            className="hover:opacity-70"
                                        >
                                            <span style={{ fontSize: 13, color: 'var(--ent-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {task.title}
                                            </span>
                                            <span className="ent-tag" style={{ color: bColor, borderColor: 'transparent', background: 'transparent', padding: '0', fontSize: 8 }}>
                                                {badge}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quote */}
                    {user?.interfacePrefs?.showQuote !== false && (
                        <div>
                            <SectionHeader label="Daily Narrative" />
                            <QuoteWidget />
                        </div>
                    )}

                    {/* Activity (non-admin) */}
                    {user?.role !== 'Admin' && user?.interfacePrefs?.showIntelligence !== false && (
                        <div>
                            <SectionHeader label="Workspace Activity" />
                            <IntelligenceWidget />
                        </div>
                    )}

                    {/* Clock */}
                    {user?.role !== 'Admin' && user?.interfacePrefs?.showTeamClock !== false && (
                        <div>
                            <SectionHeader label="Operational Sync" />
                            <GlobalClockWidget />
                        </div>
                    )}

                    {/* Weather */}
                    {user?.interfacePrefs?.showWeather !== false && (
                        <div>
                            <SectionHeader label="Regional Context" />
                            <WeatherWidget />
                        </div>
                    )}
                </div>
            </div>

            {/* ── TASK MODAL ───────────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        projectId={selectedTask.project?._id || selectedTask.project}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={(id, updates) => updateTaskMutation.mutate({ id, updates })}
                        onDelete={() => deleteTaskMutation.mutate(selectedTask._id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(Home);
