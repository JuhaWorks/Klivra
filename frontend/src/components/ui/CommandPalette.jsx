import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, Settings, User, LogOut, Moon, Sun, ArrowRight,
    Briefcase, CheckSquare, Compass, LayoutDashboard, Home,
    Plus, Zap, Clock, Target, Hash, GitBranch, BookOpen, Loader2,
    ChevronRight, Command
} from 'lucide-react';
import { useTheme, MODES } from '../../store/useTheme';
import { useAuthStore, api } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';

// ── Keyboard shortcut badge ──────────────────────────
const Kbd = ({ children }) => (
    <kbd className="inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-medium text-gray-400">
        {children}
    </kbd>
);

// ── Result type icon mapping ──────────────────────────
const typeConfig = {
    project: { icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    task: { icon: CheckSquare, color: 'text-theme', bg: 'bg-theme/10' },
    user: { icon: User, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    page: { icon: ArrowRight, color: 'text-gray-400', bg: 'bg-white/5' },
    action: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

// ── Highlight matching substring ──────────────────────
const HighlightMatch = ({ text = '', query = '' }) => {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
        <span>
            {text.slice(0, idx)}
            <span className="text-theme font-black bg-theme/10 rounded px-0.5">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </span>
    );
};

// ── Individual result item ────────────────────────────
const ResultItem = React.forwardRef(({ item, isSelected, query, onClick }, ref) => {
    const cfg = typeConfig[item.type] || typeConfig.page;
    const Icon = item.icon || cfg.icon;

    return (
        <motion.button
            ref={ref}
            layout
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                isSelected ? 'bg-theme/10 border border-theme/20' : 'hover:bg-white/5 border border-transparent'
            }`}
        >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border border-white/5`}>
                <Icon className={`w-4 h-4 ${cfg.color}`} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                    <HighlightMatch text={item.label} query={query} />
                </div>
                {item.description && (
                    <div className="text-[10px] text-tertiary truncate mt-0.5">{item.description}</div>
                )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.shortcut ? (
                    <Kbd>{item.shortcut}</Kbd>
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-tertiary" />
                )}
            </div>
        </motion.button>
    );
});
ResultItem.displayName = 'ResultItem';

// ── Group header ──────────────────────────────────────
const GroupHeader = ({ label, count }) => (
    <div className="flex items-center justify-between px-3 pt-4 pb-1.5 first:pt-2">
        <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.25em]">{label}</span>
        {count !== undefined && (
            <span className="text-[8px] font-black text-tertiary/50 tabular-nums">{count}</span>
        )}
    </div>
);

// ── Main Component ────────────────────────────────────
export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { mode, setMode } = useTheme();
    const { logout } = useAuthStore();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Toggle via Ctrl/Cmd+K
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const close = useCallback(() => setOpen(false), []);

    // ── Live data fetching ────────────────────────────
    const { data: projects = [] } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => (await api.get('/projects')).data.data,
        enabled: open,
        staleTime: 1000 * 60 * 5,
    });

    const debouncedQuery = useDebouncedValue(query, 200);

    const { data: searchResults = [], isFetching: isSearching } = useQuery({
        queryKey: ['palette-search', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery.trim() || debouncedQuery.length < 2) return [];
            const res = await api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`);
            return res.data.data || [];
        },
        enabled: open && debouncedQuery.length >= 2,
        staleTime: 10000,
    });

    // ── Static items ───────────────────────────────────
    const staticGroups = useMemo(() => {
        const pages = [
            { id: 'home', type: 'page', icon: Home, label: 'Dashboard', description: 'Project overview', shortcut: null, action: () => navigate('/') },
            { id: 'projects', type: 'page', icon: Briefcase, label: 'Projects', description: 'All your projects', shortcut: null, action: () => navigate('/projects') },
            { id: 'tasks', type: 'page', icon: CheckSquare, label: 'Task Board', description: 'Kanban & planning', shortcut: null, action: () => navigate('/tasks') },
            { id: 'network', type: 'page', icon: Compass, label: 'Network', description: 'Member directory', shortcut: null, action: () => navigate('/networking') },
            { id: 'settings', type: 'page', icon: Settings, label: 'Settings', description: 'Preferences & account', shortcut: null, action: () => navigate('/settings') },
            { id: 'profile', type: 'page', icon: User, label: 'Profile', description: 'Edit your profile', shortcut: null, action: () => navigate('/profile') },
        ];
        const actions = [
            { id: 'new-task', type: 'action', icon: Plus, label: 'Create New Task', description: 'Add task to current project', shortcut: '⌘N', action: () => { navigate('/tasks'); close(); } },
            { id: 'new-project', type: 'action', icon: Target, label: 'New Project', description: 'Create a workspace project', shortcut: null, action: () => { navigate('/projects'); close(); } },
            { id: 'toggle-theme', type: 'action', icon: mode === MODES.DARK ? Sun : Moon, label: mode === MODES.DARK ? 'Switch to Light Mode' : 'Switch to Dark Mode', description: 'Toggle color theme', shortcut: null, action: () => setMode(mode === MODES.DARK ? MODES.LIGHT : MODES.DARK) },
            { id: 'logout', type: 'action', icon: LogOut, label: 'Sign Out', description: 'Log out of your account', shortcut: null, action: () => { logout(); navigate('/login'); } },
        ];
        return { pages, actions };
    }, [mode, navigate, setMode, logout, close]);

    // ── Project items from live data ──────────────────
    const projectItems = useMemo(() => {
        if (!Array.isArray(projects)) return [];
        return projects.slice(0, 6).map(p => ({
            id: `proj-${p._id}`,
            type: 'project',
            label: p.name,
            description: p.category || p.status,
            action: () => { navigate(`/tasks?project=${p._id}`); close(); }
        }));
    }, [projects, navigate, close]);

    // ── Search result items ───────────────────────────
    const searchItems = useMemo(() => {
        return searchResults.slice(0, 8).map(r => ({
            id: `search-${r._id}`,
            type: r.type || 'task',
            label: r.title || r.name,
            description: r.type === 'task' ? `Task · ${r.status || 'Pending'}` : `Project · ${r.status || ''}`,
            action: () => {
                if (r.type === 'project') navigate(`/tasks?project=${r._id}`);
                else navigate(`/tasks?project=${r.project?._id || r.project}`);
                close();
            }
        }));
    }, [searchResults, navigate, close]);

    // ── Filter by query ───────────────────────────────
    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        if (!q) return { pages: staticGroups.pages, actions: staticGroups.actions, projects: projectItems, search: [] };
        const filterFn = item => item.label?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
        return {
            pages: staticGroups.pages.filter(filterFn),
            actions: staticGroups.actions.filter(filterFn),
            projects: projectItems.filter(filterFn),
            search: searchItems,
        };
    }, [query, staticGroups, projectItems, searchItems]);

    const flatItems = useMemo(() => {
        const q = query.trim();
        if (!q) return [...filtered.pages, ...filtered.actions, ...filtered.projects];
        const all = [...filtered.search, ...filtered.pages, ...filtered.actions, ...filtered.projects];
        return all;
    }, [filtered, query]);

    // ── Keyboard navigation ───────────────────────────
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); flatItems[selectedIndex]?.action(); close(); }
            else if (e.key === 'Escape') { e.preventDefault(); close(); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, flatItems, selectedIndex, close]);

    // Reset selection on query change
    useEffect(() => setSelectedIndex(0), [query]);

    const runItem = useCallback((item) => { item.action(); close(); }, [close]);

    // ── Flat index tracker for selection ──────────────
    let globalIdx = 0;
    const renderGroup = (label, items, showCount) => {
        if (!items.length) return null;
        const start = globalIdx;
        globalIdx += items.length;
        return (
            <div key={label}>
                <GroupHeader label={label} count={showCount ? items.length : undefined} />
                <div className="space-y-0.5 px-1">
                    {items.map((item, i) => (
                        <ResultItem
                            key={item.id}
                            item={item}
                            query={query}
                            isSelected={selectedIndex === start + i}
                            onClick={() => runItem(item)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const hasQuery = query.trim().length > 0;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
                        onClick={close}
                    />

                    {/* Palette Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="fixed inset-x-4 top-[12vh] z-[201] mx-auto max-w-xl"
                        ref={containerRef}
                    >
                        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#0d0d10]/95 border border-white/10 shadow-2xl shadow-black/60 backdrop-blur-3xl">
                            {/* Theme-colored top accent */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-theme to-transparent" />
                            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-theme/5 to-transparent pointer-events-none" />

                            {/* Input Area */}
                            <div className="relative flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                                <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                                    {isSearching
                                        ? <Loader2 className="w-5 h-5 text-theme animate-spin" />
                                        : <Search className="w-5 h-5 text-tertiary" strokeWidth={2} />
                                    }
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search tasks, projects, or type a command..."
                                    className="flex-1 bg-transparent text-[15px] font-medium text-primary placeholder:text-tertiary outline-none"
                                />
                                <Kbd>Esc</Kbd>
                            </div>

                            {/* Results List */}
                            <div className="max-h-[420px] overflow-y-auto custom-scrollbar py-2 px-1">
                                {flatItems.length === 0 && hasQuery && !isSearching ? (
                                    <div className="py-12 text-center space-y-2">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                                            <Search className="w-5 h-5 text-tertiary" />
                                        </div>
                                        <p className="text-sm font-semibold text-tertiary">No results for "{query}"</p>
                                        <p className="text-[11px] text-tertiary/50">Try a different search term</p>
                                    </div>
                                ) : (
                                    (() => {
                                        globalIdx = 0;
                                        return (
                                            <>
                                                {hasQuery && filtered.search.length > 0 && renderGroup('Search Results', filtered.search, true)}
                                                {!hasQuery && renderGroup('Navigation', filtered.pages, false)}
                                                {renderGroup('Quick Actions', filtered.actions, false)}
                                                {renderGroup('Jump to Project', filtered.projects, true)}
                                                {hasQuery && renderGroup('Pages', filtered.pages, false)}
                                            </>
                                        );
                                    })()
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
                                <div className="flex items-center gap-1.5 text-tertiary/60">
                                    <Command className="w-3 h-3" />
                                    <span className="text-[10px] font-medium">Klivra Command</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-tertiary/50">
                                    <span className="flex items-center gap-1"><Kbd>↑↓</Kbd> Navigate</span>
                                    <span className="flex items-center gap-1"><Kbd>↵</Kbd> Select</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Utility: useDebounce ──────────────────────────────
function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}
