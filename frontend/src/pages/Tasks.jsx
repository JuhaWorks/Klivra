import React, { useState, useEffect, useTransition, useOptimistic, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { useSocketStore } from '../store/useSocketStore';
import { api } from '../store/useAuthStore';
import KanbanBoard from '../components/Kanban';
import {
    CheckSquare, Filter, Search, Plus, LayoutGrid, List, ChevronDown, Target, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Counter } from '../components/ui/BaseUI';
import { KlivraLogo } from '../components/ui/Loaders';
import { cn } from '../utils/cn';

// ── Task Physics Configuration ──
const LIQUID_SPRING = { type: "spring", stiffness: 260, damping: 20, mass: 0.5 };

// ── Error Boundary ──
class TaskErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <article className="flex flex-col items-center justify-center py-20 glass-2 bg-rose-500/5 border border-rose-500/20 rounded-[3rem] text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                        <KlivraLogo pulse={false} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-primary">Failed to Load Tasks</h2>
                        <p className="text-gray-500 text-sm">{this.state.error?.message || "An unexpected error occurred while loading project data."}</p>
                    </div>
                    <Button onClick={() => this.setState({ hasError: false })} variant="outline" className="border-rose-500/30 text-rose-400">
                        Retry Loading
                    </Button>
                </article>
            );
        }
        return this.props.children;
    }
}

// ── Board Loading Skeleton ──
const TaskBoardSkeleton = () => (
    <div className="w-full flex-1 min-h-[600px] rounded-[4rem] border border-subtle bg-sunken animate-pulse aspect-[16/9] flex items-center justify-center" aria-hidden="true">
        <KlivraLogo />
    </div>
);

// ── Main Task Content ──
const TasksContent = ({ projectId, searchQuery, quickFilter, viewMode, activeProject, triggerQuickAdd }) => {
    // Relying on useSuspenseQuery for React 19 integration.
    // Removes the need for explicit loading states.

    return (
        <section className="relative flex-1 flex flex-col min-h-0 w-full mt-2 perspective-1000" aria-label="Task Board">
            <AnimatePresence mode="wait">
                <motion.div
                    key={projectId || 'initialized'}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={LIQUID_SPRING}
                    className="w-full flex-1 flex flex-col min-h-0"
                >
                    {!projectId ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in zoom-in-95 duration-1000">
                            <div className="w-24 h-24 bg-theme/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-theme/10 shadow-glow-sm">
                                <Target className="w-10 h-10 text-theme opacity-60" />
                            </div>
                            <h2 className="text-3xl font-black text-primary tracking-tighter uppercase mb-3">Select a Project</h2>
                            <p className="text-sm text-tertiary max-w-[340px] leading-relaxed opacity-60">Choose a specific project from the workspace filter above to view and manage its strategic task board.</p>
                        </div>
                    ) : viewMode === 'kanban' ? (
                        <KanbanBoard
                            projectId={projectId}
                            searchQuery={searchQuery}
                            quickFilter={quickFilter}
                            triggerQuickAdd={triggerQuickAdd}
                        />
                    ) : (
                        <div className="bg-white/2 border border-white/5 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center py-40 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                            <List className="w-16 h-16 text-gray-700 mb-6" />
                            <h3 className="text-xl font-black text-primary tracking-tight uppercase">List View In Development</h3>
                            <p className="text-gray-500 text-sm mt-2">Switch back to Kanban for immediate task management.</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Ambient Decorative Elements */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-theme/5 rounded-full blur-[120px] pointer-events-none -z-10" aria-hidden="true" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-theme/5 rounded-full blur-[120px] pointer-events-none -z-10" aria-hidden="true" />
        </section>
    );
};

export default function Tasks() {
    const [searchParams, setSearchParams] = useSearchParams();
    const projectId = searchParams.get('project');
    const [searchQuery, setSearchQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState('All');
    const [viewMode, setViewMode] = useState('kanban');
    const [triggerQuickAdd, setTriggerQuickAdd] = useState(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Optimistic UI for View Mode
    const [optimisticView, setOptimisticView] = useOptimistic(
        viewMode,
        (state, newMode) => newMode
    );

    const handleViewChange = (mode) => {
        startTransition(() => {
            setOptimisticView(mode);
            setViewMode(mode);
        });
    };

    const selectProject = (id) => {
        const nextParams = new URLSearchParams(searchParams);
        if (!id) {
            nextParams.delete('project');
        } else {
            nextParams.set('project', id);
        }
        setSearchParams(nextParams);
        setIsFilterOpen(false);
    };

    // Fetch projects for filter
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: async ({ signal }) => {
            const res = await api.get('/projects', { signal });
            return res.data.data;
        }
    });

    const activeProject = useMemo(() => {
        if (!projectId || !Array.isArray(projects)) return null;
        return projects.find(p => String(p._id) === String(projectId));
    }, [projects, projectId]);

    const { joinProject, leaveProject } = useSocketStore();

    useEffect(() => {
        if (projectId) {
            joinProject(projectId);
            return () => leaveProject(projectId);
        }
    }, [projectId, joinProject, leaveProject]);

    // Fetch tasks to compute metrics (only when project is selected)
    const { data: rawTasks = [] } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: async ({ signal }) => {
            if (!projectId) return [];
            const url = `/projects/${projectId}/tasks`;
            const res = await api.get(url, { signal });
            return res.data.data;
        },
        enabled: !!projectId
    });

    // Fetch workspace stats for global metrics
    const { data: workspaceStats } = useQuery({
        queryKey: ['workspace-stats'],
        queryFn: async () => {
            const res = await api.get('/projects/workspace/stats');
            return res.data.data;
        },
        staleTime: 60000 // 1 minute
    });

    // Compute Metrics: Use project-specific rawTasks if projectId exists, otherwise use workspaceStats
    const activeTasksCount = projectId
        ? rawTasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled').length
        : (workspaceStats?.activeTasks || 0);

    const riskTasksCount = projectId
        ? rawTasks.filter(t =>
            (t.status !== 'Completed' && t.status !== 'Canceled') &&
            (t.priority === 'Urgent' || t.priority === 'High' || (t.dueDate && new Date(t.dueDate) < new Date()))
        ).length
        : (workspaceStats?.atRiskTasks || 0);


    return (
        <article
            className="min-h-screen flex flex-col pb-8 pt-4 px-4 sm:px-6 space-y-4 sm:space-y-6 w-full max-w-[2000px] mx-auto @container overflow-x-hidden"
        >
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-20 relative px-2">
                <div className="flex items-center gap-6">
                    <div className="w-10 h-10 rounded-2xl bg-theme/10 flex items-center justify-center shrink-0">
                        <CheckSquare className="w-5 h-5 text-theme" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tighter leading-none">
                            Task <span className="text-theme">Management.</span>
                        </h1>
                        <span className="text-[10px] sm:text-xs font-medium text-tertiary opacity-40 mt-1 uppercase tracking-widest leading-none">
                            {activeProject ? activeProject.name : 'Workspace Strategic Oversight'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Switcher Morphing */}
                    <div className="flex p-1 bg-sunken/40 backdrop-blur-xl rounded-2xl border border-subtle relative overflow-x-auto">
                        {['kanban', 'list'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => handleViewChange(mode)}
                                className={`relative z-10 px-4 py-2 rounded-xl transition-all duration-300 uppercase text-[9px] font-black tracking-widest ${optimisticView === mode ? 'text-primary' : 'text-tertiary hover:text-secondary'}`}
                                aria-label={`${mode} view`}
                            >
                                {optimisticView === mode && (
                                    <motion.div
                                        layoutId="view-highlight"
                                        className="absolute inset-0 bg-surface border border-subtle rounded-xl shadow-lg -z-10"
                                        transition={LIQUID_SPRING}
                                    />
                                )}
                                <div className="flex items-center justify-center gap-2 relative z-10">
                                    {mode === 'kanban' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                                    <span>{mode}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="vibrant"
                        leftIcon={Plus}
                        size="md"
                        onClick={() => setTriggerQuickAdd(Date.now())}
                        className="h-11 px-6 rounded-xl shadow-lg shadow-theme/20 uppercase text-[10px] font-black tracking-widest"
                    >
                        New Task
                    </Button>
                </div>
            </header>

            {/* Management Toolbar */}
            <nav className="bg-surface/40 backdrop-blur-3xl border border-subtle p-3 sm:p-4 rounded-[2rem] flex flex-col md:flex-row items-center gap-4 sm:gap-6 shadow-2xl z-20 relative">
                {/* Search Bar */}
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary transition-colors group-within:text-theme" />
                    <input
                        type="text"
                        placeholder="Search for tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-sunken/50 border border-subtle rounded-xl sm:rounded-2xl pl-14 pr-6 h-10 sm:h-12 text-primary placeholder:text-tertiary focus:outline-none focus:border-theme/30 focus:ring-4 focus:ring-theme/10 transition-all font-medium text-sm shadow-inner"
                    />
                </div>

                {/* Project Filter */}
                <div className="relative shrink-0 w-full md:w-auto">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="w-full h-10 sm:h-12 flex items-center justify-between md:justify-start gap-4 px-5 bg-sunken rounded-xl sm:rounded-2xl border border-subtle hover:border-theme/50 transition-all group active:scale-95 shadow-inner"
                        aria-haspopup="listbox"
                    >
                        <div className="flex items-center gap-3">
                            <Filter className="w-4 h-4 text-tertiary group-hover:text-theme transition-colors" />
                            <span className="text-[9px] sm:text-[11px] font-black text-secondary uppercase tracking-[0.2em] whitespace-nowrap">
                                {activeProject ? activeProject.name : 'ALL PROJECTS'}
                            </span>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-tertiary transition-transform", isFilterOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 right-0 mt-3 p-2 bg-surface/95 backdrop-blur-3xl border border-subtle rounded-3xl shadow-2xl z-40 min-w-[240px]"
                                >
                                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                        <button
                                            onClick={() => selectProject(null)}
                                            className={cn(
                                                "w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left flex items-center gap-3 transition-all",
                                                !projectId ? "bg-theme/10 text-theme" : "text-tertiary hover:bg-white/5 hover:text-primary"
                                            )}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5" />
                                            All Projects
                                        </button>
                                        <div className="h-px bg-subtle/50 my-2 mx-2" />
                                        {Array.isArray(projects) && projects.map(p => (
                                            <button
                                                key={p._id}
                                                onClick={() => selectProject(p._id)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left flex items-center gap-3 transition-all",
                                                    projectId === p._id ? "bg-theme/10 text-theme" : "text-tertiary hover:bg-white/5 hover:text-primary"
                                                )}
                                            >
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || 'var(--theme)' }} />
                                                <span className="truncate">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Management Metrics Integrated */}
                <div className="flex lg:flex items-center h-10 ml-auto whitespace-nowrap divide-x divide-subtle/20">
                    <button
                        onClick={() => setQuickFilter(quickFilter === 'Active' ? 'All' : 'Active')}
                        className={cn(
                            "relative flex items-center gap-2 px-5 h-full transition-all group",
                            quickFilter === 'Active' ? "text-theme" : "text-tertiary hover:text-primary"
                        )}
                    >
                        <span className="text-[12px] font-black uppercase tracking-widest">Active</span>
                        <span className="text-[18px] font-black font-mono tracking-tighter tabular-nums">
                            <Counter value={activeTasksCount} />
                        </span>
                        {quickFilter === 'Active' && (
                            <motion.div layoutId="active-filter" className="absolute bottom-0 left-4 right-4 h-[2px] bg-theme rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setQuickFilter(quickFilter === 'Risk' ? 'All' : 'Risk')}
                        className={cn(
                            "relative flex items-center gap-2 px-5 h-full transition-all group",
                            quickFilter === 'Risk' ? "text-danger" : "text-tertiary hover:text-primary"
                        )}
                    >
                        <span className="text-[12px] font-black uppercase tracking-widest">Risk</span>
                        <span className="text-[18px] font-black font-mono tracking-tighter tabular-nums">
                            <Counter value={riskTasksCount} />
                        </span>
                        {quickFilter === 'Risk' && (
                            <motion.div layoutId="active-filter" className="absolute bottom-0 left-4 right-4 h-[2px] bg-danger rounded-full" />
                        )}
                    </button>
                </div>
            </nav>

            <TaskErrorBoundary>
                <Suspense fallback={<TaskBoardSkeleton />}>
                    <TasksContent
                        projectId={projectId}
                        searchQuery={searchQuery}
                        quickFilter={quickFilter}
                        viewMode={optimisticView}
                        activeProject={activeProject}
                        triggerQuickAdd={triggerQuickAdd}
                    />
                </Suspense>
            </TaskErrorBoundary>
        </article>
    );
}
