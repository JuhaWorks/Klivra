import React, { useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Link2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getOptimizedAvatar } from '../../utils/avatar';

/**
 * DependencyMapView — Custom SVG dependency graph
 * No external library dependency. Uses canvas-like SVG rendering.
 * Nodes = tasks, Edges = blockedBy relationships
 */

const PRIORITY_COLORS = {
    Urgent: '#ef4444',
    High: '#f59e0b',
    Medium: 'var(--theme)',
    Low: '#6b7280',
};

const STATUS_RING = {
    Completed: '#10b981',
    'In Progress': 'var(--theme)',
    Pending: '#6b7280',
    Canceled: '#374151',
};

// Simple force-directed layout (static, no simulation needed for small graphs)
const layoutNodes = (tasks) => {
    const COLS = Math.ceil(Math.sqrt(tasks.length));
    const H_GAP = 260;
    const V_GAP = 140;
    return tasks.map((task, i) => ({
        ...task,
        x: (i % COLS) * H_GAP + 80 + (Math.floor(i / COLS) % 2 === 0 ? 0 : H_GAP / 2),
        y: Math.floor(i / COLS) * V_GAP + 80,
    }));
};

const TaskNode = ({ node, isBlocked, isBlocker, isCompleted, onOpen }) => {
    const color = PRIORITY_COLORS[node.priority] || '#6b7280';
    const ring = STATUS_RING[node.status] || '#6b7280';

    return (
        <foreignObject
            x={node.x - 100}
            y={node.y - 36}
            width={200}
            height={72}
            style={{ overflow: 'visible' }}
        >
            <div
                onClick={() => onOpen(node)}
                className="group relative w-[200px] cursor-pointer"
                title={node.title}
            >
                {/* Node card */}
                <div
                    className="relative p-3 rounded-2xl border transition-all duration-200 hover:scale-105"
                    style={{
                        background: 'rgba(13,13,16,0.95)',
                        borderColor: isBlocked ? '#ef444440'
                            : isCompleted ? '#10b98140'
                            : `${color}30`,
                        boxShadow: isBlocked ? '0 0 16px rgba(239,68,68,0.15)'
                            : isCompleted ? '0 0 16px rgba(16,185,129,0.15)'
                            : `0 0 16px ${color}15`,
                    }}
                >
                    {/* Status ring */}
                    <div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0d0d10]"
                        style={{ backgroundColor: ring }}
                    />

                    <div className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                        />
                        <p className="text-[10px] font-black text-white truncate leading-tight flex-1">
                            {node.title}
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                        <span
                            className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                            style={{ color, background: `${color}15` }}
                        >
                            {node.priority}
                        </span>
                        <span className="text-[7px] font-black text-gray-600 uppercase">{node.status}</span>
                    </div>

                    {/* Assignees */}
                    {(node.assignees?.length > 0 || node.assignee) && (
                        <div className="flex items-center -space-x-1 mt-1.5">
                            {(node.assignees?.length > 0 ? node.assignees : (node.assignee ? [node.assignee] : [])).slice(0, 3).map((a, i) => {
                                if (!a) return null;
                                return (
                                    <div key={a._id || i} className="w-4 h-4 rounded-md overflow-hidden border border-black bg-theme/10">
                                        {a.avatar
                                            ? <img src={getOptimizedAvatar(a.avatar, 'xs')} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-[6px] font-black text-theme">{a.name?.charAt(0)}</div>
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {isBlocked && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10">
                            <AlertCircle className="w-2 h-2 text-rose-400" />
                            <span className="text-[7px] font-black text-rose-400">Blocked</span>
                        </div>
                    )}
                </div>
            </div>
        </foreignObject>
    );
};

const DependencyEdge = ({ fromNode, toNode, isResolved }) => {
    if (!fromNode || !toNode) return null;
    const x1 = fromNode.x;
    const y1 = fromNode.y;
    const x2 = toNode.x;
    const y2 = toNode.y;

    // Curved bezier path
    const mx = (x1 + x2) / 2;
    const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    const color = isResolved ? '#10b981' : '#ef4444';

    return (
        <g>
            <defs>
                <marker id={`arrow-${fromNode._id}-${toNode._id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill={color} opacity="0.7" />
                </marker>
            </defs>
            <path
                d={d}
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.4"
                fill="none"
                strokeDasharray={isResolved ? "none" : "6 3"}
                markerEnd={`url(#arrow-${fromNode._id}-${toNode._id})`}
                className="transition-all"
            />
        </g>
    );
};

const DependencyMapView = ({ tasks = [], onOpenTask }) => {
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    const layouted = useMemo(() => layoutNodes(tasks), [tasks]);
    const nodeMap = useMemo(() => Object.fromEntries(layouted.map(n => [n._id, n])), [layouted]);

    const edges = useMemo(() => {
        const result = [];
        layouted.forEach(task => {
            (task.dependencies?.blockedBy || []).forEach(dep => {
                const depId = dep._id || dep;
                result.push({
                    from: depId,
                    to: task._id,
                    isResolved: nodeMap[depId]?.status === 'Completed',
                });
            });
        });
        return result;
    }, [layouted, nodeMap]);

    const svgWidth = useMemo(() => Math.max(800, ...layouted.map(n => n.x + 200)), [layouted]);
    const svgHeight = useMemo(() => Math.max(600, ...layouted.map(n => n.y + 200)), [layouted]);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
    }, []);

    const handleMouseDown = useCallback((e) => {
        isPanning.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isPanning.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);

    const blockedTaskIds = useMemo(() => new Set(edges.map(e => e.to)), [edges]);
    const blockerTaskIds = useMemo(() => new Set(edges.map(e => e.from)), [edges]);

    if (tasks.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-subtle flex items-center justify-center mx-auto">
                        <Link2 className="w-8 h-8 text-tertiary" />
                    </div>
                    <p className="text-sm font-black text-tertiary uppercase tracking-widest">No Tasks</p>
                    <p className="text-[11px] text-tertiary/50">Add tasks with dependencies to see the map</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-2 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[9px] font-black text-tertiary uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                            <div className="w-6 h-px bg-danger/60" style={{ background: 'repeating-linear-gradient(90deg,#ef4444 0,#ef4444 4px,transparent 4px,transparent 8px)' }} />
                            Blocked
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-6 h-px bg-success/60" />
                            Resolved
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-7 h-7 rounded-lg bg-white/5 border border-subtle flex items-center justify-center text-tertiary hover:text-primary transition-all">
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="w-7 h-7 rounded-lg bg-white/5 border border-subtle flex items-center justify-center text-tertiary hover:text-primary transition-all">
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-7 h-7 rounded-lg bg-white/5 border border-subtle flex items-center justify-center text-tertiary hover:text-primary transition-all">
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-black text-tertiary ml-1">{Math.round(zoom * 100)}%</span>
                </div>
            </div>

            {/* Canvas */}
            <div
                className="flex-1 overflow-hidden rounded-[2rem] bg-black/20 border border-white/5 cursor-grab active:cursor-grabbing relative"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <svg
                    width="100%"
                    height="100%"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.05s' }}
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                >
                    {/* Subtle grid dots */}
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.04)" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Edges */}
                    {edges.map((edge, i) => (
                        <DependencyEdge
                            key={i}
                            fromNode={nodeMap[edge.from]}
                            toNode={nodeMap[edge.to]}
                            isResolved={edge.isResolved}
                        />
                    ))}

                    {/* Nodes */}
                    {layouted.map(node => (
                        <TaskNode
                            key={node._id}
                            node={node}
                            isBlocked={blockedTaskIds.has(node._id)}
                            isBlocker={blockerTaskIds.has(node._id)}
                            isCompleted={node.status === 'Completed'}
                            onOpen={onOpenTask}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};

export default DependencyMapView;
