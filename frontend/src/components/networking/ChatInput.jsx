import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, Smile, ThumbsUp, X, Reply, Film, FileText, ImageIcon, Loader2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useSocketStore } from '../../store/useSocketStore';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Client-side image compression (no extra deps) ───────────────────────────
const MAX_IMAGE_PX = 1200;
const IMAGE_QUALITY = 0.82;
const MAX_FILE_MB = 50;

const compressImage = (file) =>
    new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const ratio = Math.min(MAX_IMAGE_PX / img.width, MAX_IMAGE_PX / img.height, 1);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
                'image/jpeg',
                IMAGE_QUALITY
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });

const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (type) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Film className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
};

// ─── Component ────────────────────────────────────────────────────────────────
const ChatInput = ({ onSend, disabled, placeholder = 'Type a message…', replyTo, onCancelReply }) => {
    const [input, setInput] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [attachments, setAttachments] = useState([]);   // { id, file, preview, name, size, type }
    const [uploading, setUploading] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiRef = useRef(null);

    const { socket } = useSocketStore();
    const { activeChat } = useChatStore();
    const { user } = useAuthStore();
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    // Typing emission logic
    const emitTyping = useCallback((isTyping) => {
        if (!socket || !activeChat) return;
        const participantIds = activeChat.participants.map(p => p._id || p);
        socket.emit('typing', {
            chatId: activeChat._id,
            isTyping,
            participantIds
        });
        isTypingRef.current = isTyping;
    }, [socket, activeChat]);

    useEffect(() => {
        if (!input.trim()) {
            if (isTypingRef.current) emitTyping(false);
            return;
        }

        if (!isTypingRef.current) {
            emitTyping(true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            emitTyping(false);
        }, 3000);

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [input, emitTyping]);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    // Focus on reply
    useEffect(() => { if (replyTo) textareaRef.current?.focus(); }, [replyTo]);

    // Close emoji on outside click
    useEffect(() => {
        const h = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // Only revoke URLs when user explicitly removes an attachment before sending
    // DO NOT revoke on unmount/state change — the blob URL may still be live in a temp message

    const handleFiles = useCallback(async (rawFiles) => {
        const processed = await Promise.all(
            Array.from(rawFiles).map(async (raw) => {
                if (raw.size > MAX_FILE_MB * 1024 * 1024) {
                    alert(`"${raw.name}" exceeds the ${MAX_FILE_MB} MB limit and was skipped.`);
                    return null;
                }
                const file = raw.type.startsWith('image/') ? await compressImage(raw) : raw;
                return {
                    id: Math.random().toString(36).slice(2),
                    file,
                    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                };
            })
        );
        setAttachments(prev => [...prev, ...processed.filter(Boolean)]);
        // Reset file input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const removeAttachment = (id) => {
        setAttachments(prev => {
            const a = prev.find(x => x.id === id);
            if (a?.preview) URL.revokeObjectURL(a.preview);
            return prev.filter(x => x.id !== id);
        });
    };

    const handleEmojiClick = (emojiObj) => {
        setInput(prev => prev + emojiObj.emoji);
        textareaRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
        if (e.key === 'Escape' && replyTo) onCancelReply?.();
    };

    const handleSubmit = async () => {
        if ((!input.trim() && !attachments.length) || disabled || uploading) return;
        setUploading(true);
        try {
            // Send one attachment at a time (enterprise pattern: individual messages per file)
            if (attachments.length > 0) {
                for (const att of attachments) {
                    await onSend({ content: input.trim(), attachments: [att] });
                }
                if (!attachments.length && input.trim()) await onSend({ content: input.trim(), attachments: [] });
            } else {
                await onSend({ content: input.trim(), attachments: [] });
            }
        } finally {
            setInput('');
            setAttachments([]);
            setShowEmoji(false);
            setUploading(false);
            if (isTypingRef.current) emitTyping(false);
        }
    };

    const hasContent = input.trim() || attachments.length > 0;

    return (
        <div className="shrink-0 bg-surface border-t border-glass">
            {/* ─── Reply banner ─── */}
            <AnimatePresence>
                {replyTo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-2 px-4 py-2 bg-theme/5 border-b border-theme/10">
                            <Reply className="w-3 h-3 text-theme shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-theme uppercase tracking-widest">
                                    Replying to {replyTo.sender?.name || 'message'}
                                </p>
                                <p className="text-[11px] text-tertiary truncate opacity-60 leading-tight">
                                    {replyTo.deleted ? 'Message removed' : replyTo.content}
                                </p>
                            </div>
                            <button onClick={onCancelReply} className="p-0.5 rounded-full text-tertiary hover:text-primary hover:bg-glass transition-all shrink-0">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Attachment preview strip ─── */}
            <AnimatePresence>
                {attachments.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden border-b border-glass"
                    >
                        <div className="flex gap-2 px-3 py-2 overflow-x-auto custom-scrollbar">
                            {attachments.map(att => (
                                <div key={att.id} className="relative shrink-0 group/att">
                                    {att.preview ? (
                                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-glass bg-sunken">
                                            <img src={att.preview} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl border border-glass bg-sunken flex flex-col items-center justify-center gap-1 px-1">
                                            <span className="text-tertiary">{fileIcon(att.type)}</span>
                                            <p className="text-[8px] font-black text-tertiary truncate w-full text-center leading-none">
                                                {att.name.split('.').pop().toUpperCase()}
                                            </p>
                                        </div>
                                    )}
                                    {/* Size badge */}
                                    <span className="absolute bottom-0.5 left-0.5 right-0.5 text-center text-[7px] font-black bg-black/60 text-white rounded-md px-0.5 leading-tight py-0.5">
                                        {formatBytes(att.size)}
                                    </span>
                                    {/* Remove button */}
                                    <button
                                        onClick={() => removeAttachment(att.id)}
                                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger text-white flex items-center justify-center shadow-md opacity-0 group-hover/att:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Input row ─── */}
            <div className="flex items-center gap-1.5 px-2 pb-3 pt-2 relative">
                {/* Left: add file */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-tertiary hover:bg-glass rounded-full transition-all shrink-0"
                >
                    <Plus className="w-4.5 h-4.5" />
                </button>

                {/* Input capsule */}
                <div className="flex-1 flex items-end bg-sunken/50 hover:bg-sunken border border-glass rounded-[1.5rem] py-1 px-3 transition-all focus-within:bg-sunken/80" ref={emojiRef}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={replyTo ? `Reply to ${replyTo.sender?.name || 'message'}…` : placeholder}
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-[14px] py-1.5 px-0.5 resize-none font-black placeholder:text-tertiary/20 custom-scrollbar max-h-[120px] tracking-tight leading-relaxed"
                    />
                    {/* Emoji */}
                    <div className="relative">
                        {showEmoji && (
                            <div className="absolute bottom-full right-0 mb-3 z-[9999] shadow-2xl animate-in zoom-in-95 fade-in duration-200 origin-bottom-right">
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    theme="dark"
                                    emojiStyle="apple"
                                    lazyLoadEmojis
                                    skinTonesDisabled
                                    height={360}
                                    width={270}
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowEmoji(v => !v)}
                            className={cn('p-1.5 rounded-full transition-all', showEmoji ? 'text-theme' : 'text-tertiary hover:text-theme')}
                        >
                            <Smile className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>

                {/* Right: send / like */}
                {hasContent ? (
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="p-2 bg-theme text-white rounded-full shadow-glow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-60 shrink-0"
                    >
                        {uploading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4 fill-current" />
                        }
                    </button>
                ) : (
                    <button
                        onClick={() => !disabled && onSend({ content: '👍', attachments: [] })}
                        className="p-2 text-theme hover:bg-theme/5 rounded-full transition-all hover:scale-110 active:scale-90 shrink-0"
                    >
                        <ThumbsUp className="w-4.5 h-4.5 fill-current" />
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
            />
        </div>
    );
};

export default ChatInput;
