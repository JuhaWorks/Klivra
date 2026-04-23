import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, LayoutGrid, MousePointer2,
    Layers, Download, Share2, Target, Filter, ChevronDown,
    Zap, Save, Sparkles, Wand2
} from 'lucide-react';
import { api, useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import { cn } from '../utils/cn';
import StickyNote from '../components/whiteboard/StickyNote';
import { Button, Tooltip } from '../components/ui/BaseUI';
import { KlivraLogo } from '../components/ui/Loaders';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { RefreshCcw } from 'lucide-react';

const LIQUID_SPRING = { type: "spring", stiffness: 260, damping: 20, mass: 0.5 };

const ProjectWhiteboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const projectId = searchParams.get('project');
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { joinProject, leaveProject } = useSocketStore();
    const workspaceRef = useRef(null);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeTool, setActiveTool] = useState('select'); // select, grid, hand
    const [isGridActive, setIsGridActive] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // ── Fetch Projects for Navigation ──
    const { data: projectsRes, isLoading: loadingProjects } = useQuery({
        queryKey: ['projects', 'active'],
        queryFn: async () => (await api.get('/projects')).data,
        staleTime: 1000 * 30, // 30 seconds
        refetchOnWindowFocus: true
    });
    const projects = projectsRes?.data || [];

    const activeProject = Array.isArray(projects)
        ? projects.find(p => p._id === projectId || String(p._id) === String(projectId))
        : null;

    // ── Fetch Notes ──
    const { data: notes = [], isLoading } = useQuery({
        queryKey: ['whiteboard-notes', projectId],
        queryFn: async () => (await api.get(`/projects/${projectId}/whiteboard`)).data.data,
        enabled: !!projectId
    });

    // ── Socket Sync ──
    useEffect(() => {
        if (projectId) {
            joinProject(projectId);
            // Listen for changes
            // Note: Socket emitters are handled in backend controllers. 
            // We just invalidate the query to get fresh data.
            return () => leaveProject(projectId);
        }
    }, [projectId, joinProject, leaveProject]);

    // ── Mutations ──
    // ── Mutations with Optimistic Updates ──
    const createMutation = useMutation({
        mutationFn: async (noteData) => (await api.post(`/projects/${projectId}/whiteboard`, noteData)).data,
        onMutate: async (newNote) => {
            await queryClient.cancelQueries({ queryKey: ['whiteboard-notes', projectId] });
            const previousNotes = queryClient.getQueryData(['whiteboard-notes', projectId]);

            // Generate temporary note for instant feedback
            const tempNote = {
                ...newNote,
                _id: `temp-${Date.now()}`,
                votes: [],
                zIndex: Math.max(0, ...(previousNotes?.map(n => n.zIndex) || [0])) + 1
            };

            queryClient.setQueryData(['whiteboard-notes', projectId], (old) => [...(old || []), tempNote]);
            return { previousNotes };
        },
        onError: (err, newNote, context) => {
            queryClient.setQueryData(['whiteboard-notes', projectId], context.previousNotes);
            const errMsg = err.response?.data?.message || err.message || "Unknown error";
            toast.error(`Creation Failed: ${errMsg}`);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['whiteboard-notes', projectId] })
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            // Block server updates for temporary IDs (waiting for real ObjectId)
            if (String(id).startsWith('temp-')) return null;
            return (await api.patch(`/projects/${projectId}/whiteboard/${id}`, data)).data;
        },
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['whiteboard-notes', projectId] });
            const previousNotes = queryClient.getQueryData(['whiteboard-notes', projectId]);

            queryClient.setQueryData(['whiteboard-notes', projectId], (old) =>
                old?.map(n => n._id === id ? { ...n, ...data } : n)
            );
            return { previousNotes };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['whiteboard-notes', projectId], context.previousNotes);
        }
        // No invalidate on success for updates to prevent flicker — socket will handle it
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            if (String(id).startsWith('temp-')) return null;
            return (await api.delete(`/projects/${projectId}/whiteboard/${id}`)).data;
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['whiteboard-notes', projectId] });
            const previousNotes = queryClient.getQueryData(['whiteboard-notes', projectId]);
            queryClient.setQueryData(['whiteboard-notes', projectId], (old) => old?.filter(n => n._id !== id));
            return { previousNotes };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['whiteboard-notes', projectId], context.previousNotes);
            toast.error("Failed to delete note");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['whiteboard-notes', projectId] });
        }
    });

    const voteMutation = useMutation({
        mutationFn: async (id) => (await api.post(`/projects/${projectId}/whiteboard/${id}/vote`)).data,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['whiteboard-notes', projectId] });
            const previousNotes = queryClient.getQueryData(['whiteboard-notes', projectId]);
            queryClient.setQueryData(['whiteboard-notes', projectId], (old) =>
                old?.map(n => {
                    if (n._id !== id) return n;
                    const votes = [...(n.votes || [])];
                    const idx = votes.indexOf(user?._id);
                    if (idx > -1) votes.splice(idx, 1);
                    else votes.push(user?._id);
                    return { ...n, votes };
                })
            );
            return { previousNotes };
        }
    });

    // ── Handlers ──
    const handleAddNote = () => {
        if (!projectId) return toast.error("Select a project first");

        const container = workspaceRef.current;
        if (!container) return;

        const previousNotes = queryClient.getQueryData(['whiteboard-notes', projectId]);
        const maxZ = Math.max(0, ...(previousNotes?.map(n => n.zIndex) || [0])) + 1;

        // Calculate center of the actual workspace container (not window)
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2 - 120; // Half note width 240
        const centerY = rect.height / 2 - 110; // Half note height 220

        // Random slight offset from center
        const x = centerX + (Math.random() * 60 - 30);
        const y = centerY + (Math.random() * 60 - 30);

        createMutation.mutate({
            x: Math.round(x),
            y: Math.round(y),
            content: '',
            color: 'yellow', // Using semantic keys
            zIndex: maxZ
        });
    };

    const handleBringToFront = (id) => {
        const previousNotes = queryClient.getQueryData(['whiteboard-notes', projectId]);
        const maxZ = Math.max(0, ...(previousNotes?.map(n => n.zIndex) || [0])) + 1;
        const note = previousNotes?.find(n => n._id === id);

        if (note && note.zIndex < maxZ) {
            updateMutation.mutate({ id, data: { zIndex: maxZ } });
        }
    };

    const handleUpdateNote = (id, data) => {
        // First update local cache for zero-lag
        queryClient.setQueryData(['whiteboard-notes', projectId], (old) =>
            old?.map(n => n._id === id ? { ...n, ...data } : n)
        );

        // Emit for real-time sync
        const { socket } = useSocketStore.getState();
        if (socket && projectId && !String(id).startsWith('temp-')) {
            socket.emit('whiteboard:noteUpdated', { projectId, noteId: id, data });
        }

        // Only hit the server if it's a real ID
        if (!String(id).startsWith('temp-')) {
            updateMutation.mutate({ id, data });
        }
    };

    const handleMoveNote = (id, x, y) => {
        const { socket } = useSocketStore.getState();
        if (socket && projectId && !String(id).startsWith('temp-')) {
            socket.emit('whiteboard:noteMoved', { projectId, noteId: id, x, y });
        }
    };

    const handleSmartStack = () => {
        if (!notes.length) return;
        const padding = 40;
        const width = 240;
        const height = 220;
        const cols = 3;

        notes.forEach((note, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            handleUpdateNote(note._id, {
                x: 100 + col * (width + padding),
                y: 100 + row * (height + padding),
                zIndex: index + 1
            });
        });
        toast.success("Board Organized!");
    };

    const handleSync = async () => {
        setIsSyncing(true);
        await queryClient.invalidateQueries(['whiteboard-notes', projectId]);
        setTimeout(() => setIsSyncing(false), 1000);
        toast.success("Workspace Synced");
    };

    const handleConvertToTask = async (note) => {
        if (!note.content?.trim()) {
            return toast.error("Sticky note is empty — add content first");
        }

        const tid = toast.loading("Converting to actionable task...");
        try {
            const taskData = {
                title: note.content.length > 50 ? note.content.substring(0, 47) + "..." : note.content,
                description: `## Brainstorming Insight\nConverted from whiteboard sticky note.\n\n### Original Content\n${note.content}`,
                status: 'Pending',
                priority: 'Medium',
                type: 'Task'
            };
            await api.post(`/projects/${projectId}/tasks`, taskData);
            toast.success("Intelligence captured as Task", { id: tid });
            
            // Optional: delete note after conversion if requested, 
            // but usually keeping it as reference is better for "whiteboard" feel.
        } catch (err) {
            toast.error("Bridge failure: Intelligence could not be persisted", { id: tid });
        }
    };

    const handleExport = async () => {
        if (!workspaceRef.current || !activeProject) return;
        try {
            toast.loading("Rendering blueprint...", { id: 'export' });

            // Wait a tiny bit for any layout shifts
            await new Promise(r => setTimeout(r, 100));

            const canvas = await html2canvas(workspaceRef.current, {
                backgroundColor: '#09090b',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false, // Set to true if debugging locally
                ignoreElements: (el) => {
                    return el.classList.contains('no-export') ||
                        el.tagName === 'NAV' ||
                        el.tagName === 'HEADER' ||
                        el.classList.contains('animate-bounce'); // Hide syncing indicators
                }
            });

            const link = document.createElement('a');
            link.download = `klivra-brainstorm-${activeProject.name.toLowerCase().replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast.success("Blueprint exported!", { id: 'export' });
        } catch (err) {
            console.error('[EXPORT] Failure:', err);
            toast.error("Export failed. Try a smaller scale.", { id: 'export' });
        }
    };

    const handleShare = () => {
        if (!projectId) {
            toast.error("Select a project first!");
            return;
        }
        // Generate a clean permalink
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?project=${projectId}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            toast.success("Workspace link copied!");
        }).catch(() => {
            toast.error("Failed to copy link.");
        });
    };

    const selectProject = (id) => {
        const nextParams = new URLSearchParams(searchParams);
        if (!id) nextParams.delete('project');
        else nextParams.set('project', id);
        setSearchParams(nextParams);
        setIsFilterOpen(false);
    };

    // ── Collaborative Presence ──
    const { activeViewers } = useSocketStore();
    const activeProjectMembers = activeViewers.filter(v => v.projectId === projectId);

    return (
        <article className="h-screen flex flex-col overflow-hidden bg-base selection:bg-theme/30 transition-colors duration-500">
            {/* Header: Project Context & Global Actions */}
            <header className="shrink-0 z-[100] px-4 sm:px-8 py-3 sm:py-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-default bg-surface/40 backdrop-blur-3xl">
                <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-6 min-w-0">
                    <div className="space-y-1 shrink-0">
                        <div className="flex items-center gap-2 text-theme font-black text-[9px] uppercase tracking-[0.3em]">
                            <Sparkles className="w-3 h-3" />
                            <span>Brainstorm Hub</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tighter">Whiteboard.</h1>
                    </div>

                    <div className="h-10 w-px bg-white/10 mx-2" />

                    {/* Project Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="h-10 sm:h-12 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 bg-sunken rounded-xl sm:rounded-2xl border border-default hover:border-theme/40 transition-all group active:scale-95 shadow-lg shadow-black/5"
                        >
                            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 group-hover:text-theme transition-colors" />
                            <span className="text-[9px] sm:text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap max-w-[60px] xs:max-w-[100px] sm:max-w-none truncate">
                                {activeProject ? activeProject.name : 'Select Project'}
                            </span>
                            <ChevronDown className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 transition-transform", isFilterOpen && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-3 p-2 bg-elevated/95 backdrop-blur-3xl border border-strong rounded-3xl shadow-modal z-40 min-w-[240px]"
                                    >
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                            {loadingProjects ? (
                                                <div className="px-4 py-8 flex flex-col items-center justify-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-theme/30 border-t-theme rounded-full animate-spin" />
                                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Searching Pulse...</span>
                                                </div>
                                            ) : projects.length === 0 ? (
                                                <div className="px-4 py-8 flex flex-col items-center justify-center gap-3 opacity-50">
                                                    <div className="p-3 bg-white/5 rounded-full">
                                                        <Sparkles className="w-4 h-4 text-gray-600" />
                                                    </div>
                                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-center">No Workspaces Found</span>
                                                </div>
                                            ) : (
                                                projects.map(p => (
                                                    <button
                                                        key={p._id}
                                                        onClick={() => selectProject(p._id)}
                                                        className={cn(
                                                            "w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-left flex items-center gap-3 transition-all",
                                                            projectId === p._id ? "bg-theme/10 text-theme" : "text-gray-500 hover:bg-white/5 hover:text-white"
                                                        )}
                                                    >
                                                        <div className="w-2 h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: p.color || '#3b82f6' }} />
                                                        <span className="truncate">{p.name || 'Untitled Workspace'}</span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                    {/* Synchronized Collaborative Presence */}
                    <div className="flex items-center gap-2 sm:gap-3 bg-white/[0.03] border border-white/[0.08] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="flex -space-x-2 shrink-0">
                            {activeProjectMembers.length > 0 ? activeProjectMembers.slice(0, 3).map((v, i) => (
                                <div key={v.userId} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-[#09090b] overflow-hidden bg-gray-800 ring-2 ring-emerald-500/20 shadow-lg" title={`${v.name} (Active)`}>
                                    <img src={v.avatar || '/default-avatar.png'} alt={v.name} className="w-full h-full object-cover" />
                                </div>
                            )) : (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-[#09090b] bg-white/5 flex items-center justify-center">
                                    <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white/20" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[7px] sm:text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate">Live</span>
                            <span className="text-[8px] sm:text-[10px] font-black text-theme whitespace-nowrap">{activeProjectMembers.length || 1} Sync</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="xs" onClick={handleExport} className="border-white/10 text-gray-400 flex sm:hidden p-2"><Download className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={handleExport} leftIcon={Download} className="border-white/10 text-gray-400 hidden sm:flex">Export</Button>
                        
                        <Button variant="outline" size="xs" onClick={handleShare} className="border-white/10 text-gray-400 flex sm:hidden p-2"><Share2 className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={handleShare} leftIcon={Share2} className="border-white/10 text-gray-400 hidden sm:flex">Share</Button>
                    </div>
                </div>
            </header>

            {/* Main Canvas Workspace */}
            <main
                ref={workspaceRef}
                className="flex-1 relative overflow-hidden cursor-crosshair group"
            >
                {/* Blueprint Grid Background */}
                <div className="absolute inset-0 bg-base opacity-100" />
                <AnimatePresence>
                    {isGridActive && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--grid-line)_1px,transparent_1px)] bg-[length:32px_32px]"
                            />
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.1)_1px,transparent_1px)] bg-[length:128px_128px]"
                            />
                        </>
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {!projectId ? (
                    <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
                        <div className="max-w-md text-center space-y-6">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                                <Target className="w-10 h-10 text-white/20" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-black text-primary tracking-tight uppercase">Ready for Brainstorming</h2>
                                <p className="text-gray-500 text-sm font-medium">Please select a project from the top menu to access its persistent sticky notes whiteboard.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {notes.map(note => (
                            <StickyNote
                                key={note._id}
                                note={note}
                                currentUserId={user?._id}
                                isGridActive={isGridActive}
                                onUpdate={handleUpdateNote}
                                onMove={handleMoveNote}
                                onFocus={() => handleBringToFront(note._id)}
                                onDelete={(id) => deleteMutation.mutate(id)}
                                onVote={(id) => voteMutation.mutate(id)}
                                onConvertToTask={handleConvertToTask}
                            />
                        ))}
                    </AnimatePresence>
                )}

                {/* Loading State Overlay */}
                {isLoading && projectId && (
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[200]">
                         <KlivraLogo size={64} />
                    </div>
                )}
            </main>

            {/* Floating Toolbar */}
            {projectId && (
                <motion.nav
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 sm:gap-4 p-2 bg-elevated/90 backdrop-blur-2xl border border-default rounded-2xl sm:rounded-3xl shadow-lift w-auto max-w-[calc(100%-2rem)]"
                >
                    <Tooltip content="Add Spark">
                        <button
                            onClick={handleAddNote}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-theme text-black flex items-center justify-center shadow-lg shadow-theme/30 active:scale-90 transition-all group shrink-0"
                        >
                            <Plus className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </Tooltip>

                    <div className="w-px h-8 bg-white/10 mx-1" />

                    <div className="flex gap-1.5 px-2">
                        <Tooltip content="Precision Select">
                            <button
                                onClick={() => setActiveTool('select')}
                                className={cn("p-3 rounded-xl transition-all", activeTool === 'select' ? "text-theme bg-theme/10 border border-theme/20 shadow-sm" : "text-gray-500 hover:text-white hover:bg-white/5")}
                            >
                                <MousePointer2 className="w-5 h-5" />
                            </button>
                        </Tooltip>

                        <Tooltip content={isGridActive ? "Disable Grid" : "Enable Grid"}>
                            <button
                                onClick={() => setIsGridActive(!isGridActive)}
                                className={cn("p-3 rounded-xl transition-all", isGridActive ? "text-theme bg-theme/10 border border-theme/20 shadow-sm" : "text-gray-500 hover:text-white hover:bg-white/5")}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                        </Tooltip>

                        <Tooltip content="Smart Stack">
                            <button
                                onClick={handleSmartStack}
                                className={cn("p-3 rounded-xl transition-all", activeTool === 'layers' ? "text-theme bg-theme/10 border border-theme/20 shadow-sm" : "text-gray-500 hover:text-white hover:bg-white/5")}
                            >
                                <Wand2 className="w-5 h-5" />
                            </button>
                        </Tooltip>
                    </div>

                    <div className="w-px h-8 bg-white/10 mx-1" />

                    <Tooltip content="Pulse Sync">
                        <button
                            onClick={handleSync}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                        >
                            <RefreshCcw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Sync</span>
                        </button>
                    </Tooltip>
                </motion.nav>
            )}
        </article>
    );
};

export default ProjectWhiteboard;

// Helper icons
const RefreshCw = (props) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
    </svg>
);
