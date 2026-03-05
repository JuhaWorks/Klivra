import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const Whiteboard = ({ roomId }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const contextRef = useRef(null);
    const socketRef = useRef(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });

    const [strokeColor, setStrokeColor] = useState('#a78bfa');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [activeTool, setActiveTool] = useState('pen');

    // Setup canvas dimensions properly based on container, not window
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
    }, [strokeColor, strokeWidth]);

    // Socket & Canvas initialization
    useEffect(() => {
        const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://klivra-backend.onrender.com' : 'http://localhost:5000');
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

    // Keep context styles in sync
    useEffect(() => {
        if (contextRef.current) {
            contextRef.current.strokeStyle = activeTool === 'eraser' ? '#0a0a12' : strokeColor;
            contextRef.current.lineWidth = activeTool === 'eraser' ? strokeWidth * 4 : strokeWidth;
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
        const color = activeTool === 'eraser' ? '#0a0a12' : strokeColor;
        const width = activeTool === 'eraser' ? strokeWidth * 4 : strokeWidth;

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

        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (emit && socketRef.current) {
            socketRef.current.emit('clear-board', roomId);
        }
    };

    const colors = [
        { name: 'Violet', hex: '#a78bfa' },
        { name: 'Blue', hex: '#60a5fa' },
        { name: 'Cyan', hex: '#22d3ee' },
        { name: 'Green', hex: '#34d399' },
        { name: 'Yellow', hex: '#fbbf24' },
        { name: 'Red', hex: '#f87171' },
        { name: 'White', hex: '#e5e7eb' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#0a0a12] overflow-hidden relative">
            {/* Floating Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-[#12121e]/90 backdrop-blur-xl shadow-2xl shadow-black/40 rounded-2xl px-5 py-3 border border-white/[0.06] flex items-center gap-4">
                {/* Tools */}
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTool('pen')}
                        className={`p-2 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-violet-500/15 text-violet-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}
                        title="Pen"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button
                        onClick={() => setActiveTool('eraser')}
                        className={`p-2 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-violet-500/15 text-violet-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'}`}
                        title="Eraser"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>

                <div className="w-px h-7 bg-white/[0.06]" />

                {/* Color Picker */}
                <div className="flex gap-1.5 items-center">
                    {colors.map(c => (
                        <button
                            key={c.name}
                            onClick={() => { setStrokeColor(c.hex); setActiveTool('pen'); }}
                            className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${strokeColor === c.hex && activeTool === 'pen' ? 'border-white scale-110 shadow-md' : 'border-transparent'}`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                    ))}
                </div>

                <div className="w-px h-7 bg-white/[0.06]" />

                {/* Stroke Width */}
                <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Size</span>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                        className="w-20 accent-violet-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-gray-500 w-5 text-right">{strokeWidth}</span>
                </div>

                <div className="w-px h-7 bg-white/[0.06]" />

                {/* Clear */}
                <button
                    onClick={() => clearCanvas(true)}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/15 transition-all"
                >
                    Clear
                </button>
            </div>

            {/* Room indicator */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-[#12121e]/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/[0.06]">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-gray-400 font-medium">Room: {roomId}</span>
            </div>

            {/* Canvas Container */}
            <div ref={containerRef} className="flex-1 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full touch-none ${activeTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
        </div>
    );
};

export default Whiteboard;
