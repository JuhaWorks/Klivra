import { useSearchParams } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useSocketStore } from '../store/useSocketStore';
import { api } from '../store/useAuthStore';
import KanbanBoard from '../components/tools/KanbanBoard';
import { preload } from 'react-dom';
import { 
    CheckSquare, Filter, Search, Plus, LayoutGrid, List, ChevronDown, Target, RefreshCw
} from 'lucide-react/dist/esm/lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';

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
                        <h2 className="text-xl font-black text-white">Domain Initialization Failed</h2>
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
                                <h3 className="text-xl font-black text-white tracking-tight uppercase">List View In Development</h3>
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

    // Removed speculative preload
    useEffect(() => {
        // Assets handled via standard cascading
    }, []);

    // Fetch projects for filter. Suspense is handled at a higher level or gracefully falls back.
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
            className="min-h-screen pb-20 pt-8 px-[var(--spacing-fluid-sm)] md:px-[var(--spacing-fluid-md)] space-y-10 w-full @container"
        >
            <header className="flex flex-col @4xl:flex-row @4xl:items-end justify-between gap-6 z-20 relative">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-theme font-black text-[10px] uppercase tracking-[0.4em] animate-in fade-in slide-in-from-left duration-700">
                        <CheckSquare className="w-4 h-4" />
                        <span>Core Operations</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-[length:clamp(3rem,6vw,4rem)] font-black text-[var(--text-main)] tracking-tighter leading-none">
                            Task <span className="text-theme">Nexus.</span>
                        </h1>
                        <p className="text-gray-500 font-medium text-[length:clamp(0.875rem,2vw,1.125rem)] max-w-xl">
                            Orchestrate complex project segments through high-fidelity task synchronization and real-time state management.
                        </p>
                    </div>
                </div>

                <nav className="flex flex-wrap items-center gap-4" aria-label="Task nexus controls">
                    {/* View Switcher Morphing */}
                    <div className="flex p-1.5 bg-[oklch(100%_0_0/0.03)] rounded-2xl border border-[oklch(100%_0_0/0.05)] relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                        {['kanban', 'list'].map((mode) => (
                            <button 
                                key={mode}
                                onClick={() => handleViewChange(mode)}
                                className={`relative z-10 p-2.5 rounded-xl transition-colors duration-300 ${optimisticView === mode ? 'text-[var(--bg-base)]' : 'text-gray-500 hover:text-white'}`}
                                aria-label={`${mode} view`}
                            >
                                {optimisticView === mode && (
                                    <motion.div 
                                        layoutId="view-highlight"
                                        className="absolute inset-0 bg-[var(--text-main)] rounded-xl shadow-[0_5px_15px_rgba(255,255,255,0.2)] -z-10"
                                        transition={LIQUID_SPRING}
                                    />
                                )}
                                {mode === 'kanban' ? <LayoutGrid className="w-5 h-5 relative z-20" /> : <List className="w-5 h-5 relative z-20" />}
                            </button>
                        ))}
                    </div>

                    <Button
                        leftIcon={Plus}
                        size="lg"
                        className="rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_10px_20px_rgba(6,182,212,0.3)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),_0_15px_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-1 transition-all duration-300"
                    >
                        New Directive
                    </Button>
                </nav>
            </header>

            {/* Orchestration Toolbar (Liquid Glass) */}
            <nav className="bg-surface/80 backdrop-blur-3xl border border-subtle p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-2xl z-20 relative">
                {/* Search Uplink */}
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary transition-colors group-within:text-theme" />
                    <input 
                        type="text"
                        placeholder="Search neural link for tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-sunken border border-subtle rounded-2xl pl-16 pr-6 py-4 text-primary placeholder:text-tertiary focus:outline-none focus:border-theme/30 focus:ring-[6px] focus:ring-theme/10 transition-all font-medium text-sm shadow-inner"
                    />
                </div>

                {/* Project Segment Filter */}
                <div className="relative shrink-0 w-full md:w-auto">
                    <button 
                        className="w-full flex items-center justify-between md:justify-start gap-3 px-6 py-4 bg-sunken border border-subtle rounded-2xl hover:border-theme/50 transition-colors group active:scale-95"
                        aria-haspopup="listbox"
                        onClick={() => {/* Trigger unified global selection modal in future integration */}}
                    >
                        <div className="flex items-center gap-3">
                            <Filter className="w-4 h-4 text-tertiary group-hover:text-theme transition-colors" />
                            <span className="text-[11px] font-black text-secondary uppercase tracking-widest">
                                {activeProject ? activeProject.name : 'All Segments'}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-tertiary" />
                    </button>
                </div>

                {/* Statistics Shaper */}
                <div className="hidden @2xl:flex items-center gap-6 px-4">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] mb-1">Active</span>
                        <span className="text-sm font-black text-theme px-3 py-1 bg-theme/5 rounded-lg border border-theme/10">12</span>
                    </div>
                    <div className="w-px h-8 bg-subtle shadow-sm" />
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.2em] mb-1">Risk</span>
                        <span className="text-sm font-black text-danger px-3 py-1 bg-danger/5 rounded-lg border border-danger/10 shadow-sm">02</span>
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
