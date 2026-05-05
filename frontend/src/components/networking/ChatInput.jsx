import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, Smile, ThumbsUp, X, Reply, Film, FileText, ImageIcon, Loader2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useSocketStore } from '../../store/useSocketStore';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import MentionInput from '../ui/MentionInput';

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
    const [mentionedIds, setMentionedIds] = useState([]);
    const typingTimeoutRef = useRef(null);
    const isTypingRef = useRef(false);

    // Typing emission logic
    const { sendTypingIndicator } = useChatStore();
    
    const emitTyping = useCallback((isTyping) => {
        if (!activeChat) return;
        sendTypingIndicator(activeChat._id, isTyping);
        isTypingRef.current = isTyping;
    }, [activeChat, sendTypingIndicator]);

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
            const payload = { content: input.trim(), mentionedIds };
            
            // Send one attachment at a time (enterprise pattern: individual messages per file)
            if (attachments.length > 0) {
                for (const att of attachments) {
                    await onSend({ ...payload, attachments: [att] });
                }
                if (!attachments.length && input.trim()) await onSend({ ...payload, attachments: [] });
            } else {
                await onSend({ ...payload, attachments: [] });
            }
        } finally {
            setInput('');
            setMentionedIds([]);
            setAttachments([]);
            setShowEmoji(false);
            setUploading(false);
            if (isTypingRef.current) emitTyping(false);
        }
    };

    const hasContent = input.trim() || attachments.length > 0;

    return (
        <div className="shrink-0 bg-black/20 border-t border-white/5 px-4">
            {/* ─── Reply banner ─── */}
            <AnimatePresence>
                {replyTo && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-3 px-6 py-2.5 bg-white/[0.03] border-b border-white/5 backdrop-blur-3xl">
                            <Reply className="w-3.5 h-3.5 text-theme shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-theme uppercase tracking-[0.2em] mb-0.5">
                                    Replying to {replyTo.sender?.name || 'message'}
                                </p>
                                <p className="text-[11px] text-tertiary truncate opacity-40 leading-tight font-medium">
                                    {replyTo.deleted ? 'Message removed' : replyTo.content}
                                </p>
                            </div>
                            <button onClick={onCancelReply} className="p-1.5 rounded-lg text-tertiary hover:text-primary hover:bg-white/5 transition-all shrink-0 active:scale-90">
                                <X className="w-3.5 h-3.5" />
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
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden border-b border-white/5 bg-black/10"
                    >
                        <div className="flex gap-3 px-4 py-3 overflow-x-auto no-scrollbar">
                            {attachments.map(att => (
                                <div key={att.id} className="relative shrink-0 group/att">
                                    {att.preview ? (
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-sunken group-hover:scale-105 transition-transform duration-500">
                                            <img src={att.preview} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col items-center justify-center gap-2 px-3 group-hover:scale-105 transition-transform duration-500 shadow-md">
                                            <span className="text-theme/70">{fileIcon(att.type)}</span>
                                            <p className="text-[10px] font-black text-tertiary truncate w-full text-center leading-none uppercase tracking-widest">
                                                {att.name.split('.').pop().toUpperCase()}
                                            </p>
                                        </div>
                                    )}
                                    {/* Size badge */}
                                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-center text-[8px] font-black bg-black/80 backdrop-blur-md text-white rounded-lg px-1 py-1 leading-none shadow-sm opacity-0 group-hover/att:opacity-100 transition-opacity">
                                        {formatBytes(att.size)}
                                    </span>
                                    {/* Remove button */}
                                    <button
                                        onClick={() => removeAttachment(att.id)}
                                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center shadow-lg opacity-0 group-hover/att:opacity-100 transition-opacity border-2 border-surface"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Input row ─── */}
            <div className="flex items-center gap-4 pb-6 pt-4 relative">
                {/* Left: add file */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-theme hover:bg-theme/10 rounded-2xl transition-all shrink-0 active:scale-90"
                >
                    <Plus className="w-6 h-6" />
                </button>

                {/* Input capsule */}
                <div className="flex-1 flex items-end bg-white/[0.04] hover:bg-white/[0.06] border border-white/5 rounded-[1.5rem] py-2 px-5 transition-all focus-within:bg-white/[0.08] focus-within:border-white/10 shadow-inner-sm" ref={emojiRef}>
                    <MentionInput
                        ref={textareaRef}
                        value={input}
                        onChange={setInput}
                        onMentionChange={setMentionedIds}
                        onKeyDown={handleKeyDown}
                        placeholder={replyTo ? `Reply...` : placeholder}
                        members={activeChat?.participants || []}
                        disabled={disabled || uploading}
                        className="flex-1 bg-transparent border-none !border-none outline-none !outline-none ring-0 !ring-0 focus:ring-0 focus:outline-none text-[14px] py-2 px-0.5 resize-none font-semibold text-primary placeholder:text-white/20 custom-scrollbar max-h-[160px] tracking-tight leading-relaxed"
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
                            className={cn('p-2 rounded-xl transition-all active:scale-90', showEmoji ? 'text-theme bg-theme/5' : 'text-tertiary hover:text-theme')}
                        >
                            <Smile className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Right: send / like */}
                {hasContent ? (
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="p-3 bg-theme text-white rounded-2xl shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-60 shrink-0 relative overflow-hidden group/send"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/send:opacity-100 transition-opacity" />
                        {uploading
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : <Send className="w-5 h-5 fill-current relative z-10" />
                        }
                    </button>
                ) : (
                    <button
                        onClick={() => !disabled && onSend({ content: '👍', attachments: [] })}
                        className="p-3 text-theme hover:bg-theme/5 rounded-2xl transition-all hover:scale-110 active:scale-90 shrink-0"
                    >
                        <ThumbsUp className="w-5 h-5 fill-current" />
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
