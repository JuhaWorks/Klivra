import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, animate } from 'framer-motion';
import {
    Check, CheckCheck, Clock, AlertCircle,
    Trash2, CornerUpLeft, FileText, Download,
    Play, X, ZoomIn
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';
import { getOptimizedAvatar } from '../../utils/avatar';

// ─── Lightbox ──────────────────────────────────────────────────────────────────
const LightboxComponent = ({ src, type, name, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center p-6"
        >
            <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all focus:outline-none"
            >
                <X className="w-4 h-4" />
            </button>
            <motion.div
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.97, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="overflow-hidden rounded-xl shadow-2xl"
            >
                {type === 'image' ? (
                    <img src={src} alt={name || 'Media'} className="max-w-[92vw] max-h-[92vh] object-contain" referrerPolicy="no-referrer" />
                ) : (
                    <video src={src} controls autoPlay className="max-w-[92vw] max-h-[92vh] rounded-xl" />
                )}
            </motion.div>
        </motion.div>,
        document.body
    );
};

const Lightbox = React.memo(LightboxComponent);
Lightbox.displayName = 'Lightbox';

// ─── Media Content ─────────────────────────────────────────────────────────────
const MediaContentComponent = ({ message, isMe }) => {
    const [lightbox, setLightbox] = useState(false);

    const src = message.localPreview || message.content;
    const isUploading = message.status === 'sending';
    const fileName = message.metadata?.name || 'File';

    const handleKeyDown = useCallback((e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
            e.preventDefault();
            setLightbox(true);
        }
    }, [isUploading]);

    if (message.type === 'image') {
        return (
            <>
                <div
                    role="button"
                    tabIndex={isUploading ? -1 : 0}
                    onKeyDown={handleKeyDown}
                    className="relative overflow-hidden rounded-[inherit] cursor-pointer max-w-[260px] sm:max-w-[300px] focus:outline-none"
                    onClick={() => !isUploading && setLightbox(true)}
                >
                    <img
                        src={src}
                        alt={fileName}
                        className="block w-full h-auto max-h-[280px] object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-5 h-5 border-[1.5px] border-white/70 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    {!isUploading && (
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                            <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                        </div>
                    )}
                </div>
                <AnimatePresence>
                    {lightbox && <Lightbox src={message.content} type="image" name={fileName} onClose={() => setLightbox(false)} />}
                </AnimatePresence>
            </>
        );
    }

    if (message.type === 'video') {
        return (
            <>
                <div
                    role="button"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    className="relative cursor-pointer group/video rounded-[inherit] overflow-hidden focus:outline-none"
                    onClick={() => setLightbox(true)}
                >
                    <video
                        src={src}
                        className="block max-w-[260px] max-h-[200px] rounded-[inherit] object-cover bg-black"
                        preload="metadata"
                        muted
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover/video:bg-black/40 transition-colors duration-200">
                        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                </div>
                <AnimatePresence>
                    {lightbox && <Lightbox src={message.content} type="video" name={fileName} onClose={() => setLightbox(false)} />}
                </AnimatePresence>
            </>
        );
    }

    // File card
    const ext = fileName.split('.').pop().toUpperCase().slice(0, 4);
    const fileSize = message.metadata?.size
        ? message.metadata.size < 1024 * 1024
            ? `${(message.metadata.size / 1024).toFixed(1)} KB`
            : `${(message.metadata.size / (1024 * 1024)).toFixed(1)} MB`
        : '';

    return (
        <div className="flex items-center gap-3 px-3.5 py-3 min-w-[180px] max-w-[260px]">
            <div className={cn(
                'w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 text-[8px] font-semibold gap-0.5 tracking-wide',
                isMe ? 'bg-white/15 text-white/80' : 'bg-black/6 text-primary/60'
            )}>
                <FileText className="w-3.5 h-3.5" />
                <span>{ext}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium truncate">{fileName}</p>
                {fileSize && <p className="text-[11px] opacity-50 mt-0.5">{fileSize}</p>}
            </div>
            {message.content?.startsWith('http') && (
                <a
                    href={message.content}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-md opacity-50 hover:opacity-100 transition-opacity focus:outline-none shrink-0"
                    aria-label="Download"
                >
                    <Download className="w-3.5 h-3.5" />
                </a>
            )}
        </div>
    );
};

const MediaContent = React.memo(MediaContentComponent);
MediaContent.displayName = 'MediaContent';

// ─── Chat Message ─────────────────────────────────────────────────────────────
const ChatMessageComponent = ({
    message,
    isMe,
    showName,
    isFirstInGroup,
    isLastInGroup,
    onReply,
    onUnsend,
}) => {
    const [hovering, setHovering] = useState(false);

    const isSending = message.status === 'sending';
    const isError = message.status === 'error';
    const isRead = message.status === 'read';
    const isDeleted = message.deleted;
    const isMedia = ['image', 'video', 'file'].includes(message.type);

    // Bubble corner radius — seamless grouping
    const bubbleRadius = useMemo(() => {
        const full = 'rounded-[1.25rem]'; // Slightly tighter for a modern look
        const tight = 'rounded-[0.4rem]';
        if (isMe) {
            return cn(
                full,
                !isFirstInGroup && !isLastInGroup && `!rounded-tr-${tight} !rounded-br-${tight}`,
                isFirstInGroup && !isLastInGroup && `!rounded-br-${tight}`,
                !isFirstInGroup && isLastInGroup && `!rounded-tr-${tight}`
            );
        } else {
            return cn(
                full,
                !isFirstInGroup && !isLastInGroup && `!rounded-tl-${tight} !rounded-bl-${tight}`,
                isFirstInGroup && !isLastInGroup && `!rounded-bl-${tight}`,
                !isFirstInGroup && isLastInGroup && `!rounded-tl-${tight}`
            );
        }
    }, [isMe, isFirstInGroup, isLastInGroup]);

    // Swipe-to-reply
    const x = useMotionValue(0);
    const snapX = useSpring(x, { stiffness: 600, damping: 40 });
    const threshold = 56;
    const iconOpacity = useTransform(x, [0, threshold / 2, threshold], [0, 0, 1]);
    const iconScale = useTransform(x, [0, threshold], [0.6, 1]);

    const handleDragEnd = (_, info) => {
        if (info.offset.x > threshold && onReply && !isDeleted) onReply(message);
        animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
    };

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                'flex w-full gap-2 px-3 sm:px-4 select-none',
                isMe ? 'flex-row-reverse' : 'flex-row',
                isFirstInGroup ? 'mt-2' : 'mt-0.5',
                isLastInGroup ? 'mb-0.5' : 'mb-0'
            )}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            {/* Avatar */}
            {!isMe && (
                <div className="w-8 shrink-0 flex flex-col justify-start">
                    <div className={cn(
                        'w-7 h-7 rounded-[0.85rem] overflow-hidden bg-sunken border border-glass shadow-sm transition-all duration-300',
                        isFirstInGroup ? 'opacity-100' : 'opacity-0 scale-90 h-0'
                    )}>
                        <img
                            src={getOptimizedAvatar(message.sender?.avatar, 'sm', message.sender?.name)}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                            referrerPolicy="no-referrer"
                            alt={message.sender?.name || 'User'}
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={cn('flex flex-col flex-1 min-w-0', isMe ? 'items-end' : 'items-start')}>
                {showName && !isMe && isFirstInGroup && (
                    <span className="text-[10px] font-medium text-tertiary mb-1 ml-0.5 tracking-wide">
                        {message.sender?.name}
                    </span>
                )}

                <div className={cn('flex items-end gap-1.5 w-full relative', isMe ? 'flex-row-reverse' : 'flex-row')}>



                    <div className="flex flex-col max-w-[85%] sm:max-w-[75%]">
                        {/* Reply quote */}
                        {message.replyTo && !isDeleted && (
                            <div className={cn(
                                'px-3 py-2 rounded-xl mb-1 border-l-2 max-w-[240px] backdrop-blur-md transition-all group-hover/bubble:opacity-100 opacity-60',
                                isMe
                                    ? 'self-end border-white/20 bg-white/5'
                                    : 'self-start border-theme/30 bg-theme/5'
                            )}>
                                <p className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.15em] mb-0.5 flex items-center gap-1.5",
                                    isMe ? "text-white/70" : "text-theme"
                                )}>
                                    <CornerUpLeft className="w-2.5 h-2.5" />
                                    {message.replyTo.sender?.name || 'Reply'}
                                </p>
                                <p className={cn(
                                    "text-[11px] truncate font-medium tracking-tight",
                                    isMe ? "text-white/50" : "text-tertiary"
                                )}>
                                    {message.replyTo.deleted ? 'Message removed' : message.replyTo.content}
                                </p>
                            </div>
                        )}

                        {/* Bubble with drag */}
                        <div className="relative w-fit group/bubble">
                            {/* Action buttons */}
                            <AnimatePresence>
                                {hovering && !isDeleted && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.92, x: isMe ? 10 : -10 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.92, x: isMe ? 10 : -10 }}
                                        transition={{ duration: 0.12 }}
                                        className={cn(
                                            'absolute top-1/2 -translate-y-1/2 flex items-center gap-px bg-elevated border border-white/10 rounded-xl p-0.5 shadow-huge z-30',
                                            isMe ? 'right-full mr-3' : 'left-full ml-3'
                                        )}
                                    >
                                        {onReply && (
                                            <button
                                                onClick={() => onReply(message)}
                                                className="p-1.5 rounded-lg text-tertiary hover:text-theme hover:bg-theme/5 transition-all"
                                                title="Reply"
                                            >
                                                <CornerUpLeft className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {isMe && onUnsend && (
                                            <button
                                                onClick={onUnsend}
                                                className="p-1.5 rounded-lg text-tertiary hover:text-danger hover:bg-danger/5 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Swipe icon */}
                            {!isDeleted && onReply && (
                                <motion.div
                                    style={{ opacity: iconOpacity, scale: iconScale }}
                                    className="absolute -left-8 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
                                >
                                    <CornerUpLeft className="w-4 h-4" />
                                </motion.div>
                            )}

                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: threshold + 16 }}
                                dragElastic={0.12}
                                style={{ x }}
                                onDragEnd={handleDragEnd}
                                className="cursor-grab active:cursor-grabbing touch-none"
                            >
                                {isDeleted ? (
                                    <div className="px-5 py-3 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
                                        <p className="text-[13px] italic text-tertiary opacity-30 font-medium">Message removed</p>
                                    </div>
                                ) : isMedia ? (
                                    <div className={cn(
                                        'overflow-hidden shadow-huge border border-white/5 transition-all group-hover/bubble:scale-[1.02] duration-300',
                                        bubbleRadius,
                                        isMe
                                            ? cn('bg-theme text-white shadow-theme/20', isSending && 'opacity-60', isError && 'ring-1 ring-danger/50')
                                            : cn('bg-white/[0.04] backdrop-blur-2xl text-primary border-white/10', isError && 'ring-1 ring-danger/50')
                                    )}>
                                        <MediaContent message={message} isMe={isMe} />
                                    </div>
                                ) : (
                                    <div className={cn(
                                        'px-4 py-2.5 text-[14px] sm:text-[14.5px] leading-relaxed transition-all shadow-panel border border-white/5 group-hover/bubble:shadow-huge duration-300',
                                        bubbleRadius,
                                        isMe
                                            ? cn(
                                                'bg-gradient-to-br from-theme to-theme-dark !text-white font-semibold tracking-tight shadow-glow-sm',
                                                isSending && 'opacity-60',
                                                isError && 'ring-1 ring-danger/50'
                                            )
                                            : cn(
                                                'bg-white/[0.05] backdrop-blur-3xl text-primary font-semibold tracking-tight border-white/10',
                                                isError && 'ring-1 ring-danger/50'
                                            )
                                    )}>
                                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Timestamp + status */}
                <div className={cn(
                    'flex items-center gap-1 mt-0.5 transition-all duration-200',
                    isMe ? 'justify-end pr-0.5' : 'justify-start pl-0.5',
                    (isLastInGroup || hovering) ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'
                )}>
                    <span className="text-[10px] text-tertiary/60 tabular-nums">
                        {format(new Date(message.createdAt), 'h:mm a')}
                    </span>
                    {isMe && !isSending && !isDeleted && (
                        isRead
                            ? <CheckCheck className="w-3 h-3 text-blue-400" aria-label="Read" />
                            : <Check className="w-3 h-3 text-tertiary/50" aria-label="Delivered" />
                    )}
                    {isSending && <Clock className="w-3 h-3 text-tertiary/40 animate-spin-slow" />}
                    {isError && <AlertCircle className="w-3 h-3 text-danger" title="Failed to send" />}
                </div>
            </div>
        </motion.div>
    );
};

const ChatMessage = React.memo(ChatMessageComponent);
ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;