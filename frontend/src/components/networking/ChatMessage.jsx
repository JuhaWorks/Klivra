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

// ─── Lightbox (Enterprise Grade: a11y, Escape key binding) ─────────────────────
const LightboxComponent = ({ src, type, name, onClose }) => {
    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <button
                onClick={onClose}
                aria-label="Close fullscreen view"
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
                <X className="w-6 h-6" />
            </button>
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-[95vw] max-h-[95vh] overflow-hidden rounded-2xl shadow-2xl"
            >
                {type === 'image' ? (
                    <img src={src} alt={name || 'Fullscreen media'} className="max-w-[95vw] max-h-[95vh] object-contain" referrerPolicy="no-referrer" />
                ) : (
                    <video src={src} controls autoPlay className="max-w-[95vw] max-h-[95vh] rounded-2xl" />
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
    const [videoPlaying, setVideoPlaying] = useState(false);

    const src = message.localPreview || message.content;
    const isUploading = message.status === 'sending';
    const fileName = message.metadata?.name || 'File';

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isUploading) setLightbox(true);
        }
    }, [isUploading]);

    if (message.type === 'image') {
        return (
            <>
                <div
                    role="button"
                    tabIndex={isUploading ? -1 : 0}
                    onKeyDown={handleKeyDown}
                    className="relative overflow-hidden rounded-[inherit] cursor-zoom-in max-w-[280px] sm:max-w-[320px] focus:outline-none focus:ring-2 focus:ring-theme/50"
                    onClick={() => !isUploading && setLightbox(true)}
                >
                    <img
                        src={src}
                        alt={fileName}
                        className="block w-full h-auto max-h-[300px] object-cover transition-transform duration-300 hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                    />
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                    {!isUploading && (
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                            <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
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
                {videoPlaying ? (
                    <video
                        src={src}
                        controls
                        autoPlay
                        className="block max-w-[280px] max-h-[220px] rounded-[inherit] object-cover bg-black"
                        onEnded={() => setVideoPlaying(false)}
                    />
                ) : (
                    <div
                        role="button"
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                        className="relative cursor-pointer group/video rounded-[inherit] overflow-hidden focus:outline-none focus:ring-2 focus:ring-theme/50"
                        onClick={() => setLightbox(true)}
                    >
                        <video
                            src={src}
                            className="block max-w-[280px] max-h-[220px] rounded-[inherit] object-cover bg-neutral-900"
                            preload="metadata"
                            muted
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover/video:bg-black/40 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg transform group-hover/video:scale-110 transition-transform">
                                <Play className="w-6 h-6 text-white fill-white ml-1" />
                            </div>
                        </div>
                    </div>
                )}
                <AnimatePresence>
                    {lightbox && <Lightbox src={message.content} type="video" name={fileName} onClose={() => setLightbox(false)} />}
                </AnimatePresence>
            </>
        );
    }

    // Generic file card
    const ext = fileName.split('.').pop().toUpperCase().slice(0, 4);
    const fileSize = message.metadata?.size
        ? message.metadata.size < 1024 * 1024
            ? `${(message.metadata.size / 1024).toFixed(1)} KB`
            : `${(message.metadata.size / (1024 * 1024)).toFixed(1)} MB`
        : '';

    return (
        <div className="flex items-center gap-3 px-3.5 py-3 min-w-[200px] max-w-[280px]">
            <div className={cn(
                'w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-[9px] font-bold gap-0.5 shadow-sm',
                isMe ? 'bg-white/20 text-white' : 'bg-theme/10 text-theme'
            )}>
                <FileText className="w-4 h-4" />
                <span>{ext}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate leading-tight">{fileName}</p>
                <p className="text-[11px] opacity-70 leading-tight mt-0.5">{fileSize}</p>
            </div>
            {message.content?.startsWith('http') && (
                <a
                    href={message.content}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className={cn(
                        'p-2 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2',
                        isMe ? 'hover:bg-white/20 focus:ring-white/50' : 'hover:bg-theme/10 focus:ring-theme/50'
                    )}
                    aria-label="Download file"
                >
                    <Download className="w-4 h-4" />
                </a>
            )}
        </div>
    );
};

const MediaContent = React.memo(MediaContentComponent);
MediaContent.displayName = 'MediaContent';

// ─── Main Chat Bubble ─────────────────────────────────────────────────────────
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

    // Messenger-Perfect Bubble Radii Logic
    // Groups calculate corners based on message position to create seamless "stacks"
    const bubbleRadius = useMemo(() => {
        const baseRadius = 'rounded-[1.25rem]'; // 20px baseline
        const tightRadius = '0.25rem'; // 4px tight corner for stacked messages

        if (isMe) {
            return cn(
                baseRadius,
                !isFirstInGroup && !isLastInGroup && `rounded-tr-[${tightRadius}] rounded-br-[${tightRadius}]`, // Middle
                isFirstInGroup && !isLastInGroup && `rounded-br-[${tightRadius}]`, // Top of stack
                !isFirstInGroup && isLastInGroup && `rounded-tr-[${tightRadius}]`  // Bottom of stack
            );
        } else {
            return cn(
                baseRadius,
                !isFirstInGroup && !isLastInGroup && `rounded-tl-[${tightRadius}] rounded-bl-[${tightRadius}]`, // Middle
                isFirstInGroup && !isLastInGroup && `rounded-bl-[${tightRadius}]`, // Top of stack
                !isFirstInGroup && isLastInGroup && `rounded-tl-[${tightRadius}]`  // Bottom of stack
            );
        }
    }, [isMe, isFirstInGroup, isLastInGroup]);

    // Swipe to Reply Logic
    const x = useMotionValue(0);
    const snapX = useSpring(x, { stiffness: 600, damping: 40 });

    // Icon animation values
    const threshold = 60;
    const iconScale = useTransform(x, [0, threshold], [0.5, 1.2]);
    const iconOpacity = useTransform(x, [0, threshold / 2, threshold], [0, 0, 1]);
    const iconRotate = useTransform(x, [0, threshold], [-45, 0]);

    const handleDragEnd = (_, info) => {
        if (info.offset.x > threshold && onReply && !isDeleted) {
            onReply(message);
            // Visual feedback "pop"
            animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
        } else {
            animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
        }
    };

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={cn(
                'group flex w-full gap-2 px-3 sm:px-4 select-none',
                isMe ? 'flex-row-reverse' : 'flex-row',
                isFirstInGroup ? 'mt-2 sm:mt-3' : 'mt-[1.5px] sm:mt-[2px]',
                isLastInGroup ? 'mb-0.5 sm:mb-1' : 'mb-0'
            )}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            {/* Avatar Column */}
            {!isMe && (
                <div className="w-7 sm:w-8 shrink-0 flex flex-col justify-end">
                    <div className={cn(
                        'w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-surface shadow-sm transition-opacity duration-200 mb-0.5',
                        isLastInGroup ? 'opacity-100' : 'opacity-0'
                    )}>
                        <img
                            src={getOptimizedAvatar(message.sender?.avatar, 'sm', message.sender?.name)}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            alt={message.sender?.name || 'User'}
                        />
                    </div>
                </div>
            )}

            {/* Message Column */}
            <div className={cn('flex flex-col flex-1', isMe ? 'items-end' : 'items-start', 'max-w-[85%]')}>
                {showName && !isMe && isFirstInGroup && (
                    <span className="text-[10px] sm:text-[11px] font-semibold text-tertiary mb-0.5 sm:mb-1 ml-1 tracking-wide">
                        {message.sender?.name}
                    </span>
                )}

                <div className={cn('flex items-end gap-1.5 w-full', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    {/* Action Buttons (Hover State) - Shifted up to align with bubble center better */}
                    <AnimatePresence>
                        {hovering && !isDeleted && (
                            <motion.div
                                initial={{ opacity: 0, x: isMe ? 10 : -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isMe ? 5 : -5 }}
                                transition={{ duration: 0.15 }}
                                className="flex items-center gap-1 shrink-0 px-1 mb-2"
                            >
                                {onReply && (
                                    <button
                                        onClick={onReply}
                                        className="p-1.5 rounded-full text-tertiary hover:text-theme hover:bg-theme/10 transition-colors"
                                        aria-label="Reply to message"
                                    >
                                        <CornerUpLeft className="w-4 h-4" />
                                    </button>
                                )}
                                {isMe && onUnsend && (
                                    <button
                                        onClick={onUnsend}
                                        className="p-1.5 rounded-full text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                                        aria-label="Unsend message"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Chat Bubble Layout */}
                    <div className="flex flex-col max-w-[92%] sm:max-w-[75%]">
                        {/* Reply Quote Block */}
                        {message.replyTo && !isDeleted && (
                            <div className={cn(
                                'px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl mb-1 border-l-[3px] bg-theme/5 max-w-[240px]',
                                isMe ? 'self-end border-theme/50' : 'self-start border-theme/30'
                            )}>
                                <p className="text-[9px] sm:text-[10px] font-bold text-theme uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                    <CornerUpLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {message.replyTo.sender?.name || 'Reply'}
                                </p>
                                <p className="text-[11px] sm:text-[12px] text-primary truncate opacity-80">
                                    {message.replyTo.deleted ? 'Message removed' : message.replyTo.content}
                                </p>
                            </div>
                        )}

                        {/* Main Bubble Content Container with Drag */}
                        <div className="relative group/bubble-container">
                            {/* Under-layer Reply Icon */}
                            {!isMe && !isDeleted && onReply && (
                                <motion.div
                                    style={{ x: snapX, opacity: iconOpacity, scale: iconScale, rotate: iconRotate }}
                                    className="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-theme"
                                >
                                    <CornerUpLeft className="w-5 h-5 shadow-glow-sm" />
                                </motion.div>
                            )}

                            {/* Similar icon for Me messages (if we want swipe right-to-left) */}
                            {/* But usually swipe-to-reply is always swipe-right regardless of side */}
                            {isMe && !isDeleted && onReply && (
                                <motion.div
                                    style={{ x: snapX, opacity: iconOpacity, scale: iconScale, rotate: iconRotate }}
                                    className="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-theme"
                                >
                                    <CornerUpLeft className="w-5 h-5 shadow-glow-sm" />
                                </motion.div>
                            )}

                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: threshold + 20 }}
                                dragElastic={0.15}
                                style={{ x }}
                                onDragEnd={handleDragEnd}
                                className="cursor-grab active:cursor-grabbing touch-none"
                            >
                                {isDeleted ? (
                                    <div className="px-4 py-2 rounded-[1.25rem] border border-glass/50 bg-sunken/50">
                                        <p className="text-[13px] italic text-tertiary">🚫 Message removed</p>
                                    </div>
                                ) : isMedia ? (
                                    <div className={cn(
                                        'overflow-hidden shadow-sm transition-all',
                                        bubbleRadius,
                                        isMe
                                            ? cn('bg-theme text-white', isSending && 'opacity-70', isError && 'ring-2 ring-danger')
                                            : cn('bg-surface border border-glass text-primary', isError && 'ring-2 ring-danger')
                                    )}>
                                        <MediaContent message={message} isMe={isMe} />
                                    </div>
                                ) : (
                                    <div className={cn(
                                        'px-3.5 py-1.5 sm:px-4 sm:py-2.5 text-[13.5px] sm:text-[15px] leading-[1.4] transition-all',
                                        bubbleRadius,
                                        isMe
                                            ? cn('bg-blue-600 text-white shadow-sm font-medium', isSending && 'opacity-70', isError && 'ring-2 ring-danger')
                                            : cn('bg-gray-100 dark:bg-[#2A2B32] text-gray-900 dark:text-gray-100 shadow-sm font-medium', isError && 'ring-2 ring-danger')
                                    )}>
                                        <p className="whitespace-pre-wrap break-words tracking-tight">{message.content}</p>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Metadata Column - Outside the bubble row for proper vertical alignment of avatar */}
                <div className={cn(
                    'flex items-center gap-1 mt-1 transition-opacity duration-300',
                    isMe ? 'justify-end pr-1' : 'justify-start pl-1',
                    (isLastInGroup || hovering) ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
                )} style={{ marginLeft: !isMe ? '0px' : 'auto' }}>
                    <span className="text-[10px] font-medium text-tertiary tracking-wide tabular-nums">
                        {format(new Date(message.createdAt), 'h:mm a')}
                    </span>
                    {isMe && !isSending && !isDeleted && (
                        <span className="ml-0.5">
                            {isRead
                                ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" aria-label="Read" />
                                : <Check className="w-3.5 h-3.5 text-tertiary" aria-label="Delivered" />
                            }
                        </span>
                    )}
                    {isSending && <Clock className="w-3 h-3 text-tertiary animate-spin-slow" />}
                    {isError && <AlertCircle className="w-3.5 h-3.5 text-danger" title="Failed to send" />}
                </div>
            </div>
        </motion.div>
    );
};

const ChatMessage = React.memo(ChatMessageComponent);
ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;