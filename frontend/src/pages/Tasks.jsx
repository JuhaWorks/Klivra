import React, { useState, useEffect, useTransition, useOptimistic, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useSocketStore } from '../store/useSocketStore';
import { api } from '../store/useAuthStore';
import KanbanBoard from '../components/tools/KanbanBoard';
import { 
    CheckSquare, Filter, Search, Plus, LayoutGrid, List, ChevronDown, Target, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import Counter from '../components/ui/Counter';

// ── Vanguard 2026: Physics Configuration ──
const LIQUID_SPRING = { type: "spring", stiffness: 260, damping: 20, mass: 0.5 };

// ── Vanguard 2026: Error Boundary (Resilience Layer) ──
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
                        <h2 className="text-xl font-black text-primary">Domain Initialization Failed</h2>
                        <p className="text-gray-500 text-sm">{this.state.error?.message || "A neural misfire occurred."}</p>
                    </div>
                    <Button onClick={() => this.setState({ hasError: false })} variant="outline" className="border-rose-500/30 text-rose-400">
                        Initiate Soft Reset
                    </Button>
                </article>
            );
        }
        return this.props.children;
    }
}

// ── Vanguard 2026: Zero-CLS Skeleton (Machine Layer) ──
const TaskNexusSkeleton = () => (
    <div className="w-full flex-1 min-h-[600px] rounded-[4rem] border border-subtle bg-sunken animate-pulse aspect-[16/9] flex items-center justify-center" aria-hidden="true">
        <div className="w-10 h-10 border-2 border-theme/30 border-t-theme rounded-full animate-spin" />
    </div>
);

// ── Vanguard 2026: Core Implementation ──
const TasksContent = ({ projectId, searchQuery, viewMode, activeProject }) => {
    // Relying on useSuspenseQuery for React 19 integration.
    // Removes the need for explicit loading states.

    return (
        <section className="relative min-h-[600px] w-full mt-10 perspective-1000" aria-label="Task domain projection">
            <AnimatePresence mode="wait">
                {!projectId ? (
                    <motion.article 
                        key="uninitialized"
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
                            <h2 className="text-[length:clamp(1.5rem,3vw,2.5rem)] font-black text-[var(--text-main)] tracking-tighter">Domain Uninitialized.</h2>
                            <p className="text-gray-500 font-medium max-w-sm mx-auto text-[length:clamp(0.875rem,1.5vw,1rem)] line-clamp-3">
                                Select a project segment from the architecture to synchronize with its operational task domain.
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
                        className="w-full"
                    >
                        {viewMode === 'kanban' ? (
                            <KanbanBoard projectId={projectId} searchQuery={searchQuery} />
                        ) : (
                            <div className="bg-[oklch(100%_0_0/0.02)] border border-[oklch(100%_0_0/0.05)] rounded-[3rem] p-10 flex flex-col items-center justify-center text-center py-40 backdrop-blur-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                                <List className="w-16 h-16 text-gray-700 mb-6" />
                                <h3 className="text-xl font-black text-primary tracking-tight uppercase">List View In Development</h3>
                                <p className="text-gray-500 text-sm mt-2">Switch back to Kanban for immediate task orchestration.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tactile Maximalism: Ambient Decorative Elements */}
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

    // Fetch projects for filter
    const { data: projects = [] } = useSuspenseQuery({
        queryKey: ['projects'],
        queryFn: async ({ signal }) => {
            const res = await api.get('/projects', { signal });
            return res.data;
        }
    });

    const activeProject = projects.find(p => p._id === projectId);
    const { joinProject, leaveProject } = useSocketStore();

    useEffect(() => {
        if (projectId) {
            joinProject(projectId);
            return () => leaveProject(projectId);
        }
    }, [projectId, joinProject, leaveProject]);

    return (
        <article 
            className="min-h-screen pb-20 pt-8 px-1 space-y-8 sm:space-y-10 w-full max-w-[2000px] mx-auto @container overflow-x-hidden"
        >
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 z-20 relative">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-theme font-black text-[10px] uppercase tracking-[0.4em] animate-in fade-in slide-in-from-left duration-700">
                        <div className="w-8 h-8 rounded-xl bg-theme/10 flex items-center justify-center">
                            <CheckSquare className="w-4 h-4" />
                        </div>
                        <span>Neural Operations Center</span>
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl sm:text-7xl font-black text-primary tracking-tighter leading-[0.85]">
                            Task <span className="text-theme">Nexus.</span>
                        </h1>
                        <p className="text-secondary font-medium text-sm sm:text-xl max-w-xl leading-relaxed opacity-80">
                            Orchestrate complex project segments through high-fidelity synchronization and real-time state management.
                        </p>
                    </div>
                </div>

                <nav className="flex flex-wrap items-center gap-4 sm:gap-6" aria-label="Task nexus controls">
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
                        leftIcon={Plus}
                        size="lg"
                        className="h-14 sm:h-16 px-6 sm:px-8 rounded-2xl sm:rounded-[2rem] shadow-xl shadow-theme/10 w-full sm:w-auto"
                    >
                        New Directive
                    </Button>
                </nav>
            </header>

            {/* Orchestration Toolbar (Liquid Glass) */}
            <nav className="bg-surface/40 backdrop-blur-3xl border border-subtle p-4 sm:p-6 rounded-[2.5rem] sm:rounded-[3.15rem] flex flex-col md:flex-row items-center gap-4 sm:gap-6 shadow-2xl z-20 relative">
                {/* Search Uplink */}
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary transition-colors group-within:text-theme" />
                    <input 
                        type="text"
                        placeholder="Search neural link for tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-sunken/50 border border-subtle rounded-2xl sm:rounded-3xl pl-14 sm:pl-16 pr-6 h-12 sm:h-16 text-primary placeholder:text-tertiary focus:outline-none focus:border-theme/30 focus:ring-4 focus:ring-theme/10 transition-all font-medium text-sm shadow-inner"
                    />
                </div>

                {/* Project Segment Filter */}
                <div className="relative shrink-0 w-full md:w-auto">
                    <button 
                        className="w-full h-12 sm:h-16 flex items-center justify-between md:justify-start gap-4 px-6 sm:px-8 bg-sunken rounded-2xl sm:rounded-3xl border border-subtle hover:border-theme/50 transition-all group active:scale-95 shadow-inner"
                        aria-haspopup="listbox"
                    >
                        <div className="flex items-center gap-3">
                            <Filter className="w-4 h-4 text-tertiary group-hover:text-theme transition-colors" />
                            <span className="text-[9px] sm:text-[11px] font-black text-secondary uppercase tracking-[0.2em] whitespace-nowrap">
                                {activeProject ? activeProject.name : 'ALL SEGMENTS'}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-tertiary" />
                    </button>
                </div>

                {/* Statistics Shaper */}
                <div className="hidden lg:flex items-center gap-8 px-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] mb-1 opacity-60">Active</span>
                        <span className="text-sm font-black text-theme px-4 py-1.5 bg-theme/5 rounded-xl border border-theme/10 font-mono tracking-tighter">
                            <Counter value={12} />
                        </span>
                    </div>
                    <div className="w-px h-10 bg-subtle/50 shadow-sm" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] mb-1 opacity-60">Risk</span>
                        <span className="text-sm font-black text-danger px-4 py-1.5 bg-danger/5 rounded-xl border border-danger/10 shadow-sm font-mono tracking-tighter">
                            <Counter value={2} />
                        </span>
                    </div>
                </div>
            </nav>

            {/* Task Domain Logic & Resilience */}
            <TaskErrorBoundary>
                <Suspense fallback={<TaskNexusSkeleton />}>
                    <TasksContent 
                        projectId={projectId} 
                        searchQuery={searchQuery} 
                        viewMode={optimisticView} 
                        activeProject={activeProject} 
                    />
                </Suspense>
            </TaskErrorBoundary>
        </article>
    );
}
