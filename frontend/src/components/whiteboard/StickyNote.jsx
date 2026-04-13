import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Trash2, CheckSquare, Heart } from 'lucide-react';
import { cn } from '../../utils/cn';

const COLORS = [
    { key: 'yellow', bg: 'bg-[#fefce8]', border: 'border-yellow-100', text: 'text-yellow-900/75', swatch: 'bg-[#fef08a]', syncBorder: 'border-[#fefce8]' },
    { key: 'blue', bg: 'bg-[#eff6ff]', border: 'border-blue-100', text: 'text-blue-900/75', swatch: 'bg-[#bfdbfe]', syncBorder: 'border-[#eff6ff]' },
    { key: 'rose', bg: 'bg-[#fff1f2]', border: 'border-rose-100', text: 'text-rose-900/75', swatch: 'bg-[#fecdd3]', syncBorder: 'border-[#fff1f2]' },
    { key: 'green', bg: 'bg-[#f0fdf4]', border: 'border-green-100', text: 'text-green-900/75', swatch: 'bg-[#bbf7d0]', syncBorder: 'border-[#f0fdf4]' },
    { key: 'purple', bg: 'bg-[#faf5ff]', border: 'border-purple-100', text: 'text-purple-900/75', swatch: 'bg-[#e9d5ff]', syncBorder: 'border-[#faf5ff]' },
];

const StickyNote = ({
    note,
    onUpdate,
    onDelete,
    onVote,
    onConvertToTask,
    currentUserId,
    isGridActive,
}) => {
    const [localContent, setLocalContent] = useState(note.content);
    const [isTyping, setIsTyping] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const syncTimeoutRef = useRef(null);
    const lastLocalUpdate = useRef({ x: note.x, y: note.y });
    
    // ── Pure Transform Engine ──
    const mvX = useMotionValue(note.x);
    const mvY = useMotionValue(note.y);

    // Sync props to motion values (server-to-local)
    useEffect(() => {
        // Skip sync if we are dragging or if this is an 'echo' of our own move
        if (isDragging) return;

        const isEcho = Math.abs(mvX.get() - note.x) < 1 && Math.abs(mvY.get() - note.y) < 1;
        if (isEcho) return;

        animate(mvX, note.x, { type: "spring", stiffness: 450, damping: 35 });
        animate(mvY, note.y, { type: "spring", stiffness: 450, damping: 35 });
    }, [note.x, note.y, isDragging, mvX, mvY]);

    const hasVoted = note.votes?.includes(currentUserId);
    const activeColor = COLORS.find(c => c.key === note.color) ?? COLORS[0];

    useEffect(() => {
        if (!isTyping) setLocalContent(note.content);
    }, [note.content, isTyping]);

    useEffect(() => () => clearTimeout(syncTimeoutRef.current), []);

    const handleContentChange = (value) => {
        setLocalContent(value);
        setIsTyping(true);
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
            onUpdate(note._id, { content: value });
            setIsTyping(false);
        }, 800);
    };

    const handleFocus = () => {
        onUpdate(note._id, { zIndex: 1000 });
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.04}
            onDragStart={() => {
                setIsDragging(true);
                handleFocus();
            }}
            onDragEnd={() => {
                setIsDragging(false);
                // Precise coordinate extraction from Motion Values
                let nextX = Math.round(mvX.get());
                let nextY = Math.round(mvY.get());
                
                if (isGridActive) {
                    nextX = Math.round(nextX / 32) * 32;
                    nextY = Math.round(nextY / 32) * 32;
                }
                
                lastLocalUpdate.current = { x: nextX, y: nextY };
                onUpdate(note._id, { x: nextX, y: nextY, zIndex: (note.zIndex ?? 1) + 1 });
            }}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                x: mvX,
                y: mvY,
                width: note.width ?? 240,
                zIndex: note.zIndex ?? 1,
            }}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileDrag={{ scale: 1.05, rotate: 2, cursor: 'grabbing' }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
                'group flex flex-col rounded-2xl border overflow-hidden',
                'transition-shadow duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)]',
                activeColor.bg,
                activeColor.border
            )}
        >
            {/* Drag handle + actions */}
            <div className="h-9 flex items-center justify-between px-3 border-b border-black/[0.05] cursor-grab active:cursor-grabbing">
                <div className="flex gap-[3px] items-center">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-[3px] h-[3px] rounded-full bg-black/15" />
                    ))}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onConvertToTask(note);
                        }}
                        title="Convert to task"
                        className="w-6 h-6 flex items-center justify-center rounded-md text-black/30 hover:text-black/70 hover:bg-black/[0.06] transition-colors"
                    >
                        <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(note._id);
                        }}
                        title="Delete"
                        className="w-6 h-6 flex items-center justify-center rounded-md text-black/25 hover:text-red-600 hover:bg-red-500/[0.08] transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-3.5 pt-3 pb-2">
                <textarea
                    value={localContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onFocus={handleFocus}
                    placeholder="Write something…"
                    rows={4}
                    className={cn(
                        'w-full bg-transparent resize-none border-none focus:ring-0 outline-none',
                        'text-[13px] leading-relaxed placeholder-black/20',
                        activeColor.text
                    )}
                />
            </div>

            {/* Footer */}
            <div className="px-3.5 py-2.5 border-t border-black/[0.05] flex items-center justify-between gap-2">
                {/* Author */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-black/[0.07] shrink-0 flex items-center justify-center text-[9px] font-medium text-black/40 ring-[1.5px] ring-white/60">
                        {note.userId?.avatar
                            ? <img src={note.userId.avatar} alt="" className="w-full h-full object-cover" />
                            : (note.userId?.name?.[0] ?? '?')
                        }
                    </div>
                    <span className="text-[11px] text-black/35 truncate max-w-[64px]">
                        {note.userId?.name?.split(' ')[0] ?? 'Member'}
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Color swatches */}
                    <div className="flex gap-[3px]">
                        {COLORS.map((c) => (
                            <button
                                key={c.key}
                                onClick={() => onUpdate(note._id, { color: c.key })}
                                className={cn(
                                    'w-[10px] h-[10px] rounded-full border border-black/10 transition-transform hover:scale-125',
                                    c.swatch,
                                    note.color === c.key ? 'scale-125 ring-[1.5px] ring-black/20 ring-offset-[1px]' : 'opacity-60 hover:opacity-100'
                                )}
                            />
                        ))}
                    </div>

                    {/* Vote */}
                    <button
                        onClick={() => onVote(note._id)}
                        className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] transition-all active:scale-95',
                            hasVoted
                                ? 'bg-rose-50 border-rose-200/60 text-rose-500'
                                : 'bg-transparent border-black/[0.09] text-black/35 hover:bg-black/[0.04]'
                        )}
                    >
                        <Heart
                            className="w-2.5 h-2.5"
                            strokeWidth={1.8}
                            fill={hasVoted ? 'currentColor' : 'none'}
                        />
                        {note.votes?.length ?? 0}
                    </button>
                </div>
            </div>

            {/* Sync indicator */}
            {isTyping && (
                <div className={cn(
                    'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 animate-pulse z-50',
                    activeColor.syncBorder
                )} />
            )}
        </motion.div>
    );
};

export default StickyNote;