import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
    Pencil, 
    Eraser, 
    Trash2, 
    Zap, 
    Share2, 
    Download, 
    Maximize2, 
    ChevronDown,
    Palette,
    Layers,
    Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 Whiteboard
 * Collaborative canvas with Glassmorphism 2.0 and Agentic UX
 */
const Whiteboard = ({ roomId }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const contextRef = useRef(null);
    const socketRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });

    const [strokeColor, setStrokeColor] = useState('#22d3ee'); // Default cyan
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [activeTool, setActiveTool] = useState('pen');

    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        contextRef.current = ctx;

        // Visual depth: slightly darker canvas background
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, [strokeColor, strokeWidth]);

    useEffect(() => {
        const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://syncforge-io.onrender.com');
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        if (roomId) {
            socket.emit('join-whiteboard', roomId);
        }

        setupCanvas();

        socket.on('draw-line', (lineData) => {
            drawOnCanvas(lineData.x0, lineData.y0, lineData.x1, lineData.y1, lineData.color, lineData.width, false);
        });

        socket.on('clear-board', () => {
            clearCanvas(false);
        });

        const handleResize = () => setupCanvas();
        window.addEventListener('resize', handleResize);

        return () => {
            socket.off('draw-line');
            socket.off('clear-board');
            socket.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [roomId, setupCanvas]);

    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = activeTool === 'eraser' ? '#09090b' : strokeColor;
            contextRef.current.lineWidth = activeTool === 'eraser' ? strokeWidth * 6 : strokeWidth;
        }
    }, [strokeColor, strokeWidth, activeTool]);

    const drawOnCanvas = (x0, y0, x1, y1, color, width, emit = true) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        const prevColor = ctx.strokeStyle;
        const prevWidth = ctx.lineWidth;

        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.closePath();

        ctx.strokeStyle = prevColor;
        ctx.lineWidth = prevWidth;

        if (emit && socketRef.current) {
            socketRef.current.emit('draw-line', { roomId, lineData: { x0, y0, x1, y1, color, width } });
        }
    };

    const getPos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if (e.touches) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    };

    const startDrawing = (e) => {
        const pos = getPos(e);
        lastPosRef.current = pos;
        isDrawingRef.current = true;
    };

    const draw = (e) => {
        if (!isDrawingRef.current) return;
        if (e.touches) e.preventDefault();

        const pos = getPos(e);
        const color = activeTool === 'eraser' ? '#09090b' : strokeColor;
        const width = activeTool === 'eraser' ? strokeWidth * 6 : strokeWidth;

        drawOnCanvas(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y, color, width, true);
        lastPosRef.current = pos;
    };

    const stopDrawing = () => {
        isDrawingRef.current = false;
    };

    const clearCanvas = (emit = true) => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (!canvas || !ctx) return;

        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (emit && socketRef.current) {
            socketRef.current.emit('clear-board', roomId);
        }
    };

    const colors = [
        { name: 'Violet', hex: '#a78bfa' },
        { name: 'Blue', hex: '#3b82f6' },
        { name: 'Cyan', hex: '#22d3ee' },
        { name: 'Green', hex: '#10b981' },
        { name: 'Amber', hex: '#f59e0b' },
        { name: 'Rose', hex: '#f43f5e' },
        { name: 'Ghost', hex: '#ffffff' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#09090b] overflow-hidden relative selection:bg-cyan-500/30">
            {/* Cinematic Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:32px_32px] pointer-events-none" />

            {/* Premium Header Controls */}
            <header className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <div className="glass-2 bg-[#09090b]/40 border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                            <Layers className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Workspace</span>
                            <span className="text-xs font-black text-white tracking-tight">{roomId || "Autonomous Node"}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-700 hover:text-white transition-colors cursor-pointer" />
                    </div>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <button className="p-3 glass-2 bg-white/5 border border-white/5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-xl">
                        <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-3 glass-2 bg-white/5 border border-white/5 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-xl">
                        <Download className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Sync Active</span>
                    </div>
                </div>
            </header>

            {/* Orchestration Toolbar (Floating Bottom) */}
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 p-2 glass-2 bg-[#09090b]/60 border border-white/10 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
            >
                {/* Primary Tools */}
                <div className="flex gap-2 px-2">
                    <button
                        onClick={() => setActiveTool('pen')}
                        className={twMerge(clsx(
                            "p-4 rounded-2xl transition-all duration-300 relative group",
                            activeTool === 'pen' ? "bg-white text-black shadow-2xl scale-110" : "text-gray-500 hover:text-white hover:bg-white/5"
                        ))}
                        title="Neural Pen"
                    >
                        <Pencil className="w-5 h-5 relative z-10" />
                        {activeTool === 'pen' && (
                            <motion.div layoutId="tool-active" className="absolute inset-0 bg-white rounded-2xl" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTool('eraser')}
                        className={twMerge(clsx(
                            "p-4 rounded-2xl transition-all duration-300 relative group",
                            activeTool === 'eraser' ? "bg-white text-black shadow-2xl scale-110" : "text-gray-500 hover:text-white hover:bg-white/5"
                        ))}
                        title="Neural Eraser"
                    >
                        <Eraser className="w-5 h-5 relative z-10" />
                        {activeTool === 'eraser' && (
                            <motion.div layoutId="tool-active" className="absolute inset-0 bg-white rounded-2xl" />
                        )}
                    </button>
                </div>

                <div className="w-px h-10 bg-white/10" />

                {/* Spectral Palette */}
                <div className="flex gap-2 items-center px-2">
                    {colors.map(c => (
                        <button
                            key={c.name}
                            onClick={() => { setStrokeColor(c.hex); setActiveTool('pen'); }}
                            className={twMerge(clsx(
                                "w-6 h-6 rounded-lg transition-all duration-300 hover:scale-125 hover:rotate-12 relative",
                                strokeColor === c.hex && activeTool === 'pen' 
                                    ? "ring-4 ring-white/20 scale-125 border border-white/40" 
                                    : "border border-white/5"
                            ))}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        >
                            {strokeColor === c.hex && activeTool === 'pen' && (
                                <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="w-px h-10 bg-white/10" />

                {/* Magnitude Modulation */}
                <div className="flex items-center gap-4 px-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-[8px] font-black text-gray-600 uppercase tracking-widest">
                            <span>Magnitude</span>
                            <span className="text-cyan-400">{strokeWidth}px</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="30"
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                            className="w-24 accent-white cursor-pointer h-1.5 bg-white/5 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                </div>

                <div className="w-px h-10 bg-white/10" />

                {/* terminal protocols */}
                <button
                    onClick={() => clearCanvas(true)}
                    className="flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all uppercase tracking-[0.2em] group"
                >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Clear Node</span>
                </button>
            </motion.div>

            {/* Canvas Domain */}
            <div ref={containerRef} className="flex-1 overflow-hidden relative">
                <canvas
                    ref={canvasRef}
                    className={twMerge(clsx(
                        "w-full h-full touch-none",
                        activeTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
                    ))}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* Ambient Interaction Hints */}
            <div className="absolute bottom-6 right-8 pointer-events-none space-y-2 opacity-30">
                <div className="flex items-center gap-3 justify-end text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    <span>Touch Protocol engaged</span>
                    <Monitor className="w-3.5 h-3.5" />
                </div>
            </div>
        </div>
    );
};

export default Whiteboard;
