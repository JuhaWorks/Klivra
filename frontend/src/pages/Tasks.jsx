import React, { useState, useEffect, useTransition, useOptimistic, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { useSocketStore } from '../store/useSocketStore';
import { api } from '../store/useAuthStore';
import KanbanBoard from '../components/tools/KanbanBoard';
import { 
    CheckSquare, Filter, Search, Plus, LayoutGrid, List, ChevronDown, Target, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import Counter from '../components/ui/Counter';
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
                        <RefreshCw className="w-8 h-8 text-rose-500" />
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
        <div className="w-10 h-10 border-2 border-theme/30 border-t-theme rounded-full animate-spin" />
    </div>
);

// ── Main Task Content ──
const TasksContent = ({ projectId, searchQuery, viewMode, activeProject, triggerQuickAdd }) => {
    // Relying on useSuspenseQuery for React 19 integration.
    // Removes the need for explicit loading states.

    return (
        <section className="relative flex-1 flex flex-col min-h-0 w-full mt-2 perspective-1000" aria-label="Task Board">
            <AnimatePresence mode="wait">
                {!projectId ? (
                    <motion.article 
                        key="unselected"
                        initial={{ opacity: 0, rotateX: 5, y: 20 }}
                        animate={{ opacity: 1, rotateX: 0, y: 0 }}
                        exit={{ opacity: 0, rotateX: -5, y: -20 }}
                        transition={LIQUID_SPRING}
                        className="flex flex-col items-center justify-center py-40 bg-surface border border-subtle rounded-[4rem] text-center space-y-8 backdrop-blur-3xl shadow-xl z-10 relative"
                    >
                        <div className="w-32 h-32 rounded-[3rem] bg-theme/5 border border-subtle flex items-center justify-center relative group">
                            <Target className="w-16 h-16 text-tertiary group-hover:text-theme transition-colors duration-500" />
                            <div className="absolute inset-0 bg-theme/10 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-[length:clamp(1.5rem,3vw,2.5rem)] font-black text-[var(--text-main)] tracking-tighter">No Project Selected.</h2>
                            <p className="text-gray-500 font-medium max-w-sm mx-auto text-[length:clamp(0.875rem,1.5vw,1rem)] line-clamp-3">
                                Select a project to view and manage its tasks, track progress, and collaborate with your team.
                            </p>
                        </div>
                    </motion.article>
                ) : (
                    <motion.div 
                        key="initialized"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={LIQUID_SPRING}
                        className="w-full flex-1 flex flex-col min-h-0"
                    >
                        {viewMode === 'kanban' ? (
                            <KanbanBoard 
                                projectId={projectId} 
                                searchQuery={searchQuery} 
                                triggerQuickAdd={triggerQuickAdd}
                            />
                        ) : (
                            <div className="bg-[oklch(100%_0_0/0.02)] border border-[oklch(100%_0_0/0.05)] rounded-[3rem] p-10 flex flex-col items-center justify-center text-center py-40 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <List className="w-16 h-16 text-gray-700 mb-6" />
                                <h3 className="text-xl font-black text-primary tracking-tight uppercase">List View In Development</h3>
                                <p className="text-gray-500 text-sm mt-2">Switch back to Kanban for immediate task management.</p>
                            </div>
                        )}
                    </motion.div>
                )}
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
    const { data: projects = [] } = useSuspenseQuery({
        queryKey: ['projects'],
        queryFn: async ({ signal }) => {
            const res = await api.get('/projects', { signal });
            return res.data.data;
        }
    });

    const activeProject = Array.isArray(projects) ? projects.find(p => p._id === projectId) : null;
    const { joinProject, leaveProject } = useSocketStore();

    useEffect(() => {
        if (projectId) {
            joinProject(projectId);
            return () => leaveProject(projectId);
        }
    }, [projectId, joinProject, leaveProject]);

    // Fetch tasks to compute global metrics
    const { data: rawTasks = [] } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: async ({ signal }) => {
            const url = projectId ? `/projects/${projectId}/tasks` : '/tasks';
            const res = await api.get(url, { signal });
            return res.data.data;
        }
    });

    // Compute Metrics
    const activeTasksCount = rawTasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled').length;
    const riskTasksCount = rawTasks.filter(t => 
        (t.status !== 'Completed' && t.status !== 'Canceled') && 
        (t.priority === 'Urgent' || t.priority === 'High' || (t.dueDate && new Date(t.dueDate) < new Date()))
    ).length;


    return (
        <article 
            className="min-h-screen flex flex-col pb-8 pt-4 px-1 space-y-4 sm:space-y-6 w-full max-w-[2000px] mx-auto @container overflow-x-hidden"
        >
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 z-20 relative">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-theme font-black text-[10px] uppercase tracking-[0.4em] animate-in fade-in slide-in-from-left duration-700">
                        <div className="w-8 h-8 rounded-xl bg-theme/10 flex items-center justify-center">
                            <CheckSquare className="w-4 h-4" />
                        </div>
                        <span>Task Management Dashboard</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl sm:text-6xl font-black text-primary tracking-tighter leading-[0.85]">
                            Task <span className="text-theme">Management.</span>
                        </h1>
                        <p className="text-secondary font-medium text-sm sm:text-xl max-w-xl leading-relaxed opacity-80">
                            Manage and track project tasks with real-time status updates and team synchronization.
                        </p>
                    </div>
                </div>

                <nav className="flex flex-wrap items-center gap-4 sm:gap-6" aria-label="Task management controls">
                    {/* View Switcher Morphing */}
                    <div className="flex p-1.5 bg-sunken/50 backdrop-blur-xl rounded-[1.75rem] border border-subtle relative shadow-2xl">
                        {['kanban', 'list'].map((mode) => (
                            <button 
                                key={mode}
                                onClick={() => handleViewChange(mode)}
                                className={`relative z-10 px-5 py-3 rounded-2xl transition-all duration-500 uppercase text-[10px] font-black tracking-widest ${optimisticView === mode ? 'text-primary' : 'text-tertiary hover:text-secondary'}`}
                                aria-label={`${mode} view`}
                            >
                                {optimisticView === mode && (
                                    <motion.div 
                                        layoutId="view-highlight"
                                        className="absolute inset-0 bg-surface border border-subtle rounded-2xl shadow-xl -z-10"
                                        transition={LIQUID_SPRING}
                                    />
                                )}
                                <div className="flex items-center gap-2 relative z-10">
                                    {mode === 'kanban' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{mode}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="vibrant"
                        leftIcon={Plus}
                        size="lg"
                        onClick={() => setTriggerQuickAdd(Date.now())}
                        className="h-14 sm:h-16 px-6 sm:px-8 rounded-2xl sm:rounded-[2rem] shadow-xl shadow-theme/30 w-full sm:w-auto"
                    >
                        New Task
                    </Button>
                </nav>
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

                {/* Statistics Shaper */}
                <div className="hidden lg:flex items-center gap-8 px-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] mb-1 opacity-60">Active</span>
                        <span className="text-sm font-black text-theme px-4 py-1.5 bg-theme/5 rounded-xl border border-theme/10 font-mono tracking-tighter">
                            <Counter value={activeTasksCount} />
                        </span>
                    </div>
                    <div className="w-px h-10 bg-subtle/50 shadow-sm" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] mb-1 opacity-60">Risk</span>
                        <span className="text-sm font-black text-danger px-4 py-1.5 bg-danger/5 rounded-xl border border-danger/10 shadow-sm font-mono tracking-tighter">
                            <Counter value={riskTasksCount} />
                        </span>
                    </div>
                </div>
            </nav>

            <TaskErrorBoundary>
                <Suspense fallback={<TaskBoardSkeleton />}>
                    <TasksContent 
                        projectId={projectId} 
                        searchQuery={searchQuery} 
                        viewMode={optimisticView} 
                        activeProject={activeProject} 
                        triggerQuickAdd={triggerQuickAdd}
                    />
                </Suspense>
            </TaskErrorBoundary>
        </article>
    );
}
