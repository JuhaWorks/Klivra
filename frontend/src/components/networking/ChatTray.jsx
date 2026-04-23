import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    MessageSquare, X, Search, 
    ArrowLeft, Pin, PinOff,
    MoreVertical, Plus, Archive, Trash2,
    ChevronDown, ChevronUp, Bell, BellOff
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore, api } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';
import { useSmartScroll } from '../../hooks/useSmartScroll';
import { cn } from '../../utils/cn';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ConfirmModal from '../common/ConfirmModal';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { isSameDay, format } from 'date-fns';
import { getOptimizedAvatar } from '../../utils/avatar';
import { toast } from 'react-hot-toast';

// ─── Notification Utility ─────────────────────────────────────────────────────
const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
};

const fireChatNotification = (message, chat, currentUser, onOpen) => {
    const msgPrefs = currentUser?.notificationPrefs?.categories?.messages;
    if (msgPrefs?.inApp === false) return; // Respect user setting

    const sender = message.sender;
    const chatName = chat?.type === 'group' 
        ? chat.name
        : sender?.name || 'Someone';
    const preview = (message.content || '').slice(0, 50);

    // In-app toast
    toast.custom((t) => (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
                "flex items-center gap-3 bg-elevated border border-glass rounded-2xl shadow-modal px-4 py-3 cursor-pointer max-w-[320px] pointer-events-auto",
                t.visible ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => { toast.dismiss(t.id); onOpen?.(); }}
        >
            <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-sunken">
                    <img src={getOptimizedAvatar(sender?.avatar, 'sm', sender?.name)} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-theme border-2 border-elevated" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-primary truncate">{chatName}</p>
                <p className="text-[10px] text-tertiary truncate opacity-60">{preview}</p>
            </div>
            <Bell className="w-3 h-3 text-theme shrink-0 opacity-60" />
        </motion.div>
    ), { duration: 4000, position: 'top-right' });

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(chatName, {
            body: preview,
            icon: sender?.avatar || '/icon.png',
        });
    }
};

// ─── Main ChatTray ────────────────────────────────────────────────────────────
const ChatTray = ({ isPageMode = false }) => {
    const navigate = useNavigate();
    const { 
        chats, fetchChats, addIncomingMessage, setTyping,
        isDrawerOpen, setDrawerOpen, bubbledChatIds, setActiveChat, activeChat,
        handleMessageDeleted
    } = useChatStore();
    const { user } = useAuthStore();
    const [openBubbleId, setOpenBubbleId] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState(null);

    useEffect(() => {
        if (user) {
            fetchChats();
            requestNotificationPermission();
            const { socket } = useSocketStore.getState();
            if (socket) {
                socket.on('newMessage', ({ chat, message }) => {
                    addIncomingMessage(chat, message);
                    const isFromMe = message.sender?._id === user._id || message.sender === user._id;
                    const isCurrentChatOpen = useChatStore.getState().activeChat?._id === chat && isDrawerOpen;
                    if (!isFromMe && !isCurrentChatOpen) {
                        const chatObj = useChatStore.getState().chats.find(c => c._id === chat);
                        fireChatNotification(message, chatObj, user, () => {
                            setDrawerOpen(true);
                            setActiveChat(chatObj);
                        });
                    }
                });
                socket.on('typing', ({ chat, userId, isTyping }) => {
                    setTyping(chat, userId, isTyping);
                });
                socket.on('messageDeleted', ({ chat, messageId }) => {
                    handleMessageDeleted(chat, messageId);
                });
                socket.on('chatCleared', ({ chat, userId }) => {
                    if (userId === user?._id) {
                        fetchChats(); // Refresh to update previews
                        if (useChatStore.getState().activeChat?._id === chat) {
                            useChatStore.getState().fetchMessages(chat);
                        }
                    }
                });
            }
        }
        return () => {
            const { socket } = useSocketStore.getState();
            if (socket) {
                socket.off('newMessage');
                socket.off('typing');
                socket.off('messageDeleted');
            }
        };
    }, [user, fetchChats, addIncomingMessage, setTyping, isDrawerOpen, setDrawerOpen, setActiveChat, handleMessageDeleted]);

    const isMobile = useMediaQuery('(max-width: 768px)');
    const bubbledChats = chats.filter(c => bubbledChatIds.includes(c._id));

    const handleClose = useCallback(() => {
        if (isPageMode && navigate) {
            navigate(-1);
        } else {
            setDrawerOpen(false);
        }
    }, [isPageMode, navigate, setDrawerOpen]);

    const DashboardContent = (
        <motion.div
            initial={isPageMode ? { opacity: 0, y: 10 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isPageMode ? { opacity: 0, y: 10 } : { opacity: 0, y: 20 }}
            className={cn(
                "flex-1 flex flex-row overflow-hidden relative transition-all duration-500",
                isPageMode 
                    ? "rounded-none border-none bg-transparent shadow-none" 
                    : "rounded-[3rem] border border-white/5 bg-black/20 shadow-huge h-full"
            )}
        >
            {/* Background depth for page mode */}
            {isPageMode && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
                    <div className="absolute top-0 left-0 w-[460px] h-full bg-white/[0.01] border-r border-white/5" />
                </div>
            )}
            {/* Panel 1: Chat List */}
            <AnimatePresence mode="wait">
                {(!isMobile || !activeChat) && (
                    <motion.div 
                        initial={isMobile ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        exit={isMobile ? { opacity: 0 } : false}
                        className={cn(
                            "h-full shrink-0 flex flex-col relative z-20 transition-all duration-700 ease-in-out",
                            isPageMode ? "bg-black/20 border-r border-white/5" : "bg-black/10",
                            isMobile ? "w-full" : (activeChat ? "w-[460px] border-r border-white/5 shadow-2xl" : "w-full")
                        )}
                    >
                        <ChatList 
                            chats={chats} 
                            activeChat={activeChat}
                            setConfirmConfig={setConfirmConfig}
                            onSelectChat={(chat) => {
                                setActiveChat(chat);
                                setOpenBubbleId(null);
                            }} 
                            onClose={handleClose} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Panel 2: Chat Box */}
            <AnimatePresence mode="wait">
                {(activeChat) && (
                    <motion.div 
                        initial={isMobile ? { x: '100%' } : { opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={isMobile ? { x: '100%' } : { opacity: 0, x: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.2 }}
                        className={cn(
                            "h-full relative transition-opacity duration-300 bg-surface flex flex-col",
                            isMobile ? "absolute inset-0 z-30" : "flex-1"
                        )}
                    >
                        <ChatBox 
                            chat={activeChat} 
                            setConfirmConfig={setConfirmConfig}
                            onBack={() => setActiveChat(null)} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>


            
            {/* Global Close Button (Only in drawer mode) */}
            {!isPageMode && (
                <button 
                    onClick={handleClose}
                    className="absolute top-8 right-8 z-[100] p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-tertiary hover:text-white transition-all active:scale-90 shadow-2xl backdrop-blur-xl"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
        </motion.div>
    );

    if (isPageMode) {
        return (
            <div className="flex-1 flex flex-col h-full relative z-10">
                {DashboardContent}
                
                <ConfirmModal 
                    {...confirmConfig}
                    isOpen={!!confirmConfig}
                    onClose={() => setConfirmConfig(null)}
                    onConfirm={() => {
                        confirmConfig?.onConfirm?.();
                        setConfirmConfig(null);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Main Chat Drawer */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <div className="absolute inset-0 flex pointer-events-none">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="absolute inset-0 bg-black/60 backdrop-blur-xl pointer-events-auto"
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] bg-[#0a0a0c] pointer-events-auto flex flex-col pt-8 sm:pt-16 px-4 sm:px-12 pb-8"
                        >
                            {DashboardContent}
                        </motion.div>
                </div>
            )}
        </AnimatePresence>

            <ConfirmModal 
                {...confirmConfig}
                isOpen={!!confirmConfig}
                onClose={() => setConfirmConfig(null)}
                onConfirm={() => {
                    confirmConfig?.onConfirm?.();
                    setConfirmConfig(null);
                }}
            />

            {/* Floating Bubbles */}
            {user?.interfacePrefs?.showChatBubbles !== false && (
                <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 pointer-events-none">
                    <div className="flex flex-col-reverse gap-4">
                        {bubbledChats.map(chat => (
                            <BubbleItem 
                                key={chat._id} 
                                chat={chat} 
                                isOpened={openBubbleId === chat._id}
                                onToggle={() => setOpenBubbleId(openBubbleId === chat._id ? null : chat._id)}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Floating Chat Window */}
            <AnimatePresence mode="wait">
                {openBubbleId && user?.interfacePrefs?.showChatBubbles !== false && (
                    <motion.div
                        key={openBubbleId}
                        initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="absolute bottom-28 right-8 w-[380px] h-[580px] bg-elevated/90 border border-strong shadow-modal rounded-[2.5rem] overflow-hidden pointer-events-auto flex flex-col noise backdrop-blur-xl transition-colors duration-500"
                    >
                        <ChatBox 
                            chat={chats.find(c => c._id === openBubbleId)} 
                            onBack={() => setOpenBubbleId(null)} 
                            setConfirmConfig={setConfirmConfig}
                            isBubbleMode
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Bubble Item ───────────────────────────────────────────────────────────────
const BubbleItem = ({ chat, isOpened, onToggle }) => {
    const { user } = useAuthStore();
    const other = chat.type === 'private' ? chat.participants.find(p => p._id !== user?._id) : null;
    const unreadCount = chat.unreadCounts?.[user?._id] || 0;

    return (
        <motion.button
            layout
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggle}
            className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lift pointer-events-auto transition-all relative group border-2",
                isOpened ? "bg-neutral-900 border-neutral-900" : "bg-surface border-strong hover:border-theme/50"
            )}
        >
            <div className="w-full h-full p-0.5 overflow-hidden rounded-2xl">
                <img 
                    src={getOptimizedAvatar(chat.type === 'group' ? chat.avatar : other?.avatar, 'sm', chat.type === 'group' ? chat.name : other?.name)} 
                    className="w-full h-full object-cover rounded-[calc(var(--radius-2xl)-2px)]"
                    referrerPolicy="no-referrer"
                    alt=""
                />
            </div>
            
            {unreadCount > 0 && !isOpened && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-danger rounded-full border-[3px] border-surface text-[10px] font-black text-white flex items-center justify-center shadow-glow-sm">
                    {unreadCount}
                </div>
            )}
            
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileHover={{ opacity: 1, x: -10 }}
                className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl text-[11px] font-black text-white whitespace-nowrap pointer-events-none shadow-float uppercase tracking-widest"
            >
                {chat.type === 'group' ? chat.name : other?.name}
            </motion.div>
        </motion.button>
    );
};


// ─── Chat List ────────────────────────────────────────────────────────────────
const ChatList = ({ chats, activeChat, onSelectChat, onClose, setConfirmConfig }) => {
    const [search, setSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [view, setView] = useState('list'); // 'list' | 'new'
    const [contextMenu, setContextMenu] = useState(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedChatIds, setSelectedChatIds] = useState([]);
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();
    const { archiveChat, deleteChat, clearChatHistory, sendMessage, startPrivateChat, toggleBubble, bubbledChatIds } = useChatStore();
    const menuRef = useRef(null);
    const memberInputRef = useRef(null);

    // Auto-focus member search input
    useEffect(() => {
        if (view === 'new') {
            setTimeout(() => memberInputRef.current?.focus(), 150);
        }
    }, [view]);

    // Debounced member search — connections only
    useEffect(() => {
        if (view !== 'new') return;
        const timer = setTimeout(async () => {
            setMembersLoading(true);
            try {
                const res = await api.get(`/connections?q=${encodeURIComponent(memberSearch)}&limit=30`);
                // /connections returns { data: [{ _id, user, connectedAt }] }
                // Normalise to the shape the list expects
                const connections = res.data.data || [];
                setMembers(connections.map(c => c.user));
            } catch (e) {
                console.error(e);
            } finally {
                setMembersLoading(false);
            }
        }, 280);
        return () => clearTimeout(timer);
    }, [memberSearch, view]);

    // Close context menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setContextMenu(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleStartNewConversation = async (member) => {
        try {
            await startPrivateChat(member._id);
            setView('list');
            setMemberSearch('');
        } catch (e) {
            console.error(e);
            toast.error('Could not start conversation');
        }
    };

    const { visibleChats, archivedChats } = useMemo(() => {
        const query = search.toLowerCase();
        const filtered = chats.filter(chat => {
            if (chat.type === 'group') return chat.name?.toLowerCase().includes(query);
            const other = chat.participants.find(p => p._id !== user?._id);
            return other?.name?.toLowerCase().includes(query);
        });
        return {
            visibleChats: filtered.filter(c => !c.isArchived),
            archivedChats: filtered.filter(c => c.isArchived)
        };
    }, [chats, search, user]);

    const handleContextMenu = (e, chatId) => { e.preventDefault(); setContextMenu({ chatId, x: e.clientX, y: e.clientY }); };
    const handleArchive = async (chatId) => { 
        setContextMenu(null); 
        await archiveChat(chatId); 
        const chat = chats.find(c => c._id === chatId);
        toast.success(chat?.isArchived ? 'Chat unarchived' : 'Chat archived'); 
    };
    const handleClear = (chatId) => {
        setContextMenu(null);
        setConfirmConfig({
            title: 'Clear My History?',
            message: 'Are you sure? Messages will be removed from your view only. The other participant will still see the full conversation.',
            confirmText: 'Clear for Me',
            onConfirm: () => {
                clearChatHistory(chatId);
                toast.success('History cleared locally');
            }
        });
    };
    const handleDelete = (chatId) => {
        setContextMenu(null);
        setConfirmConfig({
            title: 'Delete Conversation?',
            message: 'This will permenantly remove this conversation from your inbox. You can start a new one anytime.',
            confirmText: 'Delete Forever',
            type: 'danger',
            onConfirm: () => {
                deleteChat(chatId);
                toast.success('Conversation removed');
            }
        });
    };

    const handleToggleSelect = (chatId) => {
        setSelectedChatIds(prev => 
            prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
        );
    };

    const handleSelectAll = () => {
        const allIds = visibleChats.map(c => c._id);
        setSelectedChatIds(selectedChatIds.length === allIds.length ? [] : allIds);
    };

    const handleBatchBubble = async () => {
        const toBubble = selectedChatIds.filter(id => !bubbledChatIds.includes(id));
        const toUnbubble = selectedChatIds.filter(id => bubbledChatIds.includes(id));
        
        // Simple sequential processing for now
        toast.promise(
            Promise.all(selectedChatIds.map(id => toggleBubble(id))),
            {
                loading: `Updating ${selectedChatIds.length} chats...`,
                success: 'Bubble status updated',
                error: 'Failed to update some chats'
            }
        );
        
        setIsSelectMode(false);
        setSelectedChatIds([]);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-surface/50 relative overflow-hidden">

            {/* ─── Unified Header — swaps between 'list' and 'new' ─── */}
            <AnimatePresence mode="wait" initial={false}>
                {view === 'list' ? (
                    <motion.div
                        key="header-list"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.18 }}
                        className="p-8 pb-4 flex items-start justify-between shrink-0"
                    >
                        <div>
                            <h2 className="text-2xl font-black text-primary tracking-[-0.04em] flex items-center gap-3">
                                Messages
                                <div className="flex items-center gap-1.5 bg-theme/10 px-2.5 py-1 rounded-full border border-theme/20 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-theme animate-pulse" />
                                    <span className="text-theme text-[9px] font-black uppercase tracking-[0.15em]">Sync</span>
                                </div>
                            </h2>
                            <p className="text-[10px] font-black text-tertiary mt-1 opacity-40 uppercase tracking-[0.25em]">Network Infrastructure</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {isSelectMode ? (
                                <div className="flex items-center gap-1 bg-sunken rounded-xl p-1 animate-in fade-in zoom-in duration-300">
                                    <button
                                        onClick={handleSelectAll}
                                        className="px-2.5 py-1.5 hover:bg-glass rounded-lg text-theme text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        {selectedChatIds.length === visibleChats.length ? 'None' : 'All'}
                                    </button>
                                    <button
                                        onClick={() => { setIsSelectMode(false); setSelectedChatIds([]); }}
                                        className="px-2.5 py-1.5 hover:bg-glass rounded-lg text-tertiary text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsSelectMode(true)}
                                    className="p-2 hover:bg-theme/10 hover:text-theme rounded-xl text-tertiary transition-all"
                                    title="Select Messages"
                                >
                                    <div className="w-4 h-4 border-2 border-current rounded-[4px] relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-current rounded-[1px] opacity-20" />
                                    </div>
                                </button>
                            )}
                            <button
                                onClick={() => setView('new')}
                                className="p-2 hover:bg-theme/10 hover:text-theme rounded-xl text-tertiary transition-all"
                                title="New Conversation"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-glass rounded-xl text-tertiary transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="header-new"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.18 }}
                        className="px-4 pt-5 pb-4 shrink-0"
                    >
                        {/* Title row */}
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={() => { setView('list'); setMemberSearch(''); }}
                                className="p-1.5 hover:bg-glass rounded-xl text-tertiary hover:text-primary transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h2 className="text-[15px] font-black text-primary tracking-tighter">New Message</h2>
                                <p className="text-[9px] font-bold text-tertiary opacity-40 uppercase tracking-widest">Select a team member</p>
                            </div>
                        </div>
                        {/* Prominent search input */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme opacity-40 group-focus-within:opacity-100 transition-all" />
                            <input
                                ref={memberInputRef}
                                type="text"
                                placeholder="Search by name or email..."
                                value={memberSearch}
                                onChange={e => setMemberSearch(e.target.value)}
                                className="w-full bg-sunken/40 hover:bg-sunken border border-glass rounded-[1.25rem] py-3 pl-11 pr-4 text-[13px] font-semibold text-primary placeholder:text-tertiary/20 outline-none focus:border-theme/30 focus:bg-surface/50 transition-all shadow-inner-sm"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Content area — swaps between chat list and member list ─── */}
            <AnimatePresence mode="wait" initial={false}>
                {view === 'list' ? (
                    <motion.div
                        key="content-list"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.18 }}
                        className="flex-1 flex flex-col min-h-0"
                    >
                        {/* Online Now Pulse */}
                        <OnlinePulse 
                            users={onlineUsers} 
                            currentUser={user}
                            onSelectUser={handleStartNewConversation} 
                        />

                        {/* Search bar */}
                        <div className="px-8 mb-6">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme opacity-20 group-focus-within:opacity-100 transition-all" />
                                <input
                                    type="text"
                                    placeholder="Find a conversation..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-sunken/30 border border-glass/10 rounded-[1.25rem] py-3 pl-11 pr-4 text-[13px] placeholder:text-tertiary/30 focus:outline-none focus:bg-surface/80 transition-all font-semibold tracking-tight shadow-inner-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                            {visibleChats.length > 0 ? (
                                <div className="space-y-0.5">
                                    {visibleChats.map(chat => (
                                        <ChatListItem 
                                            key={chat._id} 
                                            chat={chat} 
                                            activeChat={activeChat} 
                                            user={user} 
                                            onSelect={isSelectMode ? () => handleToggleSelect(chat._id) : onSelectChat} 
                                            onContextMenu={handleContextMenu} 
                                            isSelected={selectedChatIds.includes(chat._id)}
                                            isSelectMode={isSelectMode}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-sunken rounded-[1.5rem] flex items-center justify-center mb-3 opacity-40">
                                        <MessageSquare className="w-6 h-6 text-tertiary" />
                                    </div>
                                    <h3 className="text-xs font-black text-primary">No conversations</h3>
                                    <p className="text-[9px] text-tertiary mt-1 px-8 opacity-60">Click <strong>+</strong> to message a team member.</p>
                                </div>
                            )}

                            {archivedChats.length > 0 && (
                                <div className="mt-2 border-t border-glass pt-2">
                                    <button onClick={() => setShowArchived(v => !v)} className="w-full flex items-center justify-between px-2 py-1 text-left text-tertiary hover:text-primary transition-all">
                                        <span className="text-[8px] font-black uppercase tracking-widest flex items-center gap-2 opacity-40">
                                            <Archive className="w-3 h-3" />
                                            Archived ({archivedChats.length})
                                        </span>
                                        {showArchived ? <ChevronUp className="w-3 h-3 opacity-40" /> : <ChevronDown className="w-3 h-3 opacity-40" />}
                                    </button>
                                    <AnimatePresence>
                                        {showArchived && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-0.5 mt-1">
                                                {archivedChats.map(chat => (
                                                    <ChatListItem 
                                                        key={chat._id} 
                                                        chat={chat} 
                                                        activeChat={activeChat} 
                                                        user={user} 
                                                        onSelect={isSelectMode ? () => handleToggleSelect(chat._id) : onSelectChat} 
                                                        onContextMenu={handleContextMenu} 
                                                        dimmed 
                                                        isSelected={selectedChatIds.includes(chat._id)}
                                                        isSelectMode={isSelectMode}
                                                    />
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="content-new"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.18 }}
                        className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2"
                    >
                        {membersLoading ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <div className="w-5 h-5 border-2 border-theme border-t-transparent rounded-full animate-spin" />
                                <p className="text-[9px] font-bold text-tertiary opacity-40 uppercase tracking-widest">Searching...</p>
                            </div>
                        ) : members.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                <div className="w-12 h-12 bg-sunken rounded-[1.25rem] flex items-center justify-center mb-3">
                                    <Search className="w-5 h-5 text-tertiary" />
                                </div>
                                <p className="text-[11px] font-black text-primary">{memberSearch ? 'No results' : 'Search your connections'}</p>
                                <p className="text-[9px] text-tertiary mt-0.5">{memberSearch ? 'Try a different name' : 'Type a name to find your connections'}</p>
                            </div>
                        ) : (
                            <div className="space-y-0.5 pb-4">
                                <p className="text-[8px] font-black text-tertiary uppercase tracking-widest px-1 mb-2 opacity-40">
                                    {members.length} member{members.length !== 1 ? 's' : ''} found
                                </p>
                                {members.map(member => (
                                    <button
                                        key={member._id}
                                        onClick={() => handleStartNewConversation(member)}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-theme/5 active:bg-theme/10 transition-all text-left group"
                                    >
                                        <div className="relative shrink-0">
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-sunken group-hover:scale-105 transition-transform duration-300">
                                                <img src={getOptimizedAvatar(member.avatar, 'sm', member.name)} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                                            </div>
                                            <div className={cn(
                                                "absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-surface",
                                                member.status === 'Online' ? "bg-success" : "bg-neutral-400"
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-black text-primary truncate">{member.name}</p>
                                            <p className="text-[9px] text-tertiary opacity-50 truncate uppercase tracking-wider">{member.role}</p>
                                        </div>
                                        <div className={cn(
                                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                            member.status === 'Online' ? "bg-success/10 text-success" : "bg-neutral-400/10 text-neutral-400"
                                        )}>
                                            {member.status || 'Offline'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
                        className="z-[9999] bg-elevated border border-glass rounded-2xl shadow-modal py-1.5 overflow-hidden min-w-[140px]"
                    >
                        {(() => {
                            const chat = chats.find(c => c._id === contextMenu.chatId);
                            const isBubbled = bubbledChatIds.includes(contextMenu.chatId);
                            return (
                                <>
                                    <button
                                        onClick={() => handleArchive(contextMenu.chatId)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[10px] font-bold text-secondary hover:bg-theme/5 hover:text-primary transition-all"
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                        {chat?.isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                                    </button>
                                    <button
                                        onClick={() => { setContextMenu(null); toggleBubble(contextMenu.chatId); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[10px] font-bold text-secondary hover:bg-theme/5 hover:text-primary transition-all"
                                    >
                                        {isBubbled ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                        {isBubbled ? 'Unpin from Bubble' : 'Pin to Bubble'}
                                    </button>
                                    <button
                                        onClick={() => { setContextMenu(null); setIsSelectMode(true); setSelectedChatIds([contextMenu.chatId]); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[10px] font-bold text-secondary hover:bg-theme/5 hover:text-primary transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Select Conversation
                                    </button>
                                    <button
                                        onClick={() => handleClear(contextMenu.chatId)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[10px] font-bold text-secondary hover:bg-theme/5 hover:text-primary transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Clear My History
                                    </button>
                                    <button
                                        onClick={() => handleDelete(contextMenu.chatId)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[10px] font-bold text-danger hover:bg-danger/5 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete Conversation
                                    </button>
                                </>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Online Pulse ─────────────────────────────────────────────────────────────
const OnlinePulse = ({ users, currentUser, onSelectUser }) => {
    const displayUsers = users.filter(u => u.userId !== currentUser?._id);
    
    if (displayUsers.length === 0) return null;

    return (
        <div className="px-8 mb-8 shrink-0 transition-all animate-in fade-in slide-in-from-top-3 duration-700">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[8px] font-black text-tertiary uppercase tracking-[0.3em] opacity-40">Active Now</h3>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[8px] font-black text-success uppercase tracking-widest">{displayUsers.length}</span>
                </div>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
                {displayUsers.map((u) => (
                    <div key={u.userId} className="relative group/user shrink-0">
                        <button
                            onClick={() => onSelectUser({ _id: u.userId, name: u.name, avatar: u.avatar })}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-[1.25rem] overflow-hidden border-[1.5px] border-glass bg-sunken group-hover:border-theme transition-all duration-500 group-active:scale-90 shadow-lg group-hover:shadow-theme/20">
                                    <img 
                                        src={getOptimizedAvatar(u.avatar, 'md', u.name)} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        referrerPolicy="no-referrer"
                                        alt="" 
                                    />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-[2.5px] border-surface shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-status-pulse" />
                            </div>
                            <span className="text-[9px] font-black text-primary truncate w-12 text-center opacity-40 group-hover:opacity-100 transition-all uppercase tracking-tighter">
                                {u.name.split(' ')[0]}
                            </span>
                        </button>

                        {/* Professional Quick Card on Hover */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 z-50 opacity-0 pointer-events-none group-hover/user:opacity-100 group-hover/user:pointer-events-auto transition-all duration-500 translate-y-2 group-hover/user:translate-y-0">
                            <div className="bg-elevated/90 backdrop-blur-3xl border border-glass rounded-3xl p-3 shadow-modal overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-theme/5 to-transparent pointer-events-none" />
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-glass shadow-sm">
                                        <img src={getOptimizedAvatar(u.avatar, 'sm', u.name)} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] font-black text-primary truncate w-full">{u.name}</p>
                                        <div className="flex items-center justify-center my-2 gap-1.5 mt-0.5">
                                            <div className="w-1.5 h-1.5 bg-success rounded-full animate-status-pulse" />
                                            <span className="text-[8px] font-black text-success uppercase tracking-[0.2em]">Active</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onSelectUser({ _id: u.userId, name: u.name, avatar: u.avatar })}
                                        className="w-full py-1.5 rounded-xl bg-theme text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-glow-sm active:scale-95"
                                    >
                                        Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// ─── Helper: human-readable last message preview ─────────────────────────────
const formatLastMessage = (msg, currentUserId, chatType) => {
    if (!msg) return 'No messages yet.';
    const isMe = (msg.sender?._id || msg.sender) === currentUserId;
    
    let prefix = '';
    if (isMe) {
        prefix = 'You: ';
    } else if (chatType === 'group') {
        // Show first name of sender in group chats
        const name = msg.sender?.name?.split(' ')[0] || 'Member';
        prefix = `${name}: `;
    }

    if (msg.deleted) return `${prefix}Message removed`;
    if (msg.type === 'image') return `${prefix}📷 Photo`;
    if (msg.type === 'video') return `${prefix}🎬 Video`;
    if (msg.type === 'file') return `${prefix}📎 File`;
    return `${prefix}${msg.content || ''}`;
};

// ─── Chat List Item ────────────────────────────────────────────────────────────
const ChatListItem = ({ chat, activeChat, user, onSelect, onContextMenu, dimmed, isSelected, isSelectMode }) => {
    const { onlineUsers } = useSocketStore();
    const { bubbledChatIds } = useChatStore();
    const other = chat.type === 'private' 
        ? chat.participants.find(p => p._id !== user?._id)
        : null;
    const unreadCount = chat.unreadCounts?.[user?._id] || 0;
    const isBubbled = bubbledChatIds.includes(chat._id);
    
    // Use ground-truth socket presence state
    const isOnline = other && onlineUsers.some(u => u.userId === other._id);


    return (
        <button
            onContextMenu={(e) => onContextMenu(e, chat._id)}
            onClick={() => onSelect(chat)}
            className={cn(
                "w-full p-2.5 rounded-2xl flex items-center gap-3 hover:bg-theme/5 transition-all text-left group relative",
                chat._id === activeChat?._id ? "bg-theme/5 before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:bg-theme before:rounded-full" : "",
                dimmed && "opacity-40 grayscale-[0.5]",
                isSelected && "bg-theme/10"
            )}
        >
            <div className="relative shrink-0 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {isSelectMode ? (
                        <motion.div
                            key="select"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={cn(
                                "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all",
                                isSelected ? "bg-theme border-theme" : "bg-sunken border-glass"
                            )}
                        >
                            {isSelected && <div className="w-2 h-2 bg-elevated rounded-full" />}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="avatar"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-9 h-9 rounded-full overflow-hidden shadow-sm bg-sunken group-hover:scale-105 transition-transform duration-300"
                        >
                            <img 
                                src={getOptimizedAvatar(chat.type === 'group' ? chat.avatar : other?.avatar, 'md', chat.type === 'group' ? chat.name : other?.name)} 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                                alt="" 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {chat.type === 'private' && !isSelectMode && (
                    <div className={cn(
                        "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface shadow-sm",
                        isOnline ? "bg-success" : "bg-neutral-400"
                    )} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] font-black text-primary truncate tracking-[-0.02em] group-hover:text-theme transition-colors">
                            {chat.type === 'group' ? chat.name : other?.name}
                        </span>
                        {isBubbled && <Pin size={10} className="text-theme shrink-0 opacity-70" />}
                    </div>
                    <span className="text-[11px] font-black text-secondary opacity-60 tabular-nums uppercase tracking-tighter">
                        {chat.lastMessage ? format(new Date(chat.lastMessage.createdAt), 'h:mm a') : ''}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-[11px] truncate text-tertiary font-medium opacity-50 flex-1 pr-4 tracking-tight leading-none">
                        {formatLastMessage(chat.lastMessage, user?._id, chat.type)}
                    </p>
                    {unreadCount > 0 && (
                        <div className="px-1.5 py-0 min-w-[18px] h-[18px] bg-theme rounded-full flex items-center justify-center shadow-glow-sm">
                            <span className="text-[9px] font-black text-white">{unreadCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};

// ─── Chat Box ─────────────────────────────────────────────────────────────────
const ChatBox = ({ chat, onBack, isBubbleMode, setConfirmConfig }) => {
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();
    const { messages, sendMessage, unsendMessage, toggleBubble, bubbledChatIds, typingUsers, clearChatHistory } = useChatStore();
    const { scrollRef, checkScroll, scrollToBottom } = useSmartScroll(messages[chat._id]);
    const [replyTo, setReplyTo] = useState(null);

    const isBubbled = bubbledChatIds.includes(chat._id);
    const chatMessages = messages[chat._id] || [];
    const otherUser = chat.type === 'private' ? chat.participants.find(p => p._id !== user?._id) : null;
    
    // Status resolution
    const isOnline = otherUser && onlineUsers.some(u => u.userId === otherUser._id);
    const typers = (typingUsers[chat._id] || []).filter(id => id !== user?._id);

    const groupedMessages = useMemo(() => {
        const groups = [];
        chatMessages.forEach((msg, idx) => {
            const prevMsg = chatMessages[idx - 1];
            const senderId = (msg.sender?._id || msg.sender)?.toString();
            const myId = user?._id?.toString();
            const isMe = !!(senderId && myId && senderId === myId);
            const sameSenderAsPrev = prevMsg && (prevMsg.sender?._id || prevMsg.sender)?.toString() === senderId;
            
            const showDate = !prevMsg || !isSameDay(new Date(prevMsg.createdAt), new Date(msg.createdAt));
            if (showDate) {
                groups.push({ type: 'date', date: msg.createdAt });
            }

            groups.push({
                ...msg,
                layoutType: 'message',
                isMe,
                isFirstInGroup: !sameSenderAsPrev || showDate,
                isLastInGroup: !chatMessages[idx + 1] || (chatMessages[idx + 1].sender?._id || chatMessages[idx + 1].sender) !== (msg.sender?._id || msg.sender)
            });
        });
        return groups;
    }, [chatMessages, user?._id]);

    const handleSend = (data) => {
        sendMessage(chat._id, { ...data, replyTo: replyTo?._id || null });
        setReplyTo(null);
        // Force scroll to bottom immediately and after layout shifts (keyboard hide, textarea shrink)
        requestAnimationFrame(() => scrollToBottom('smooth'));
        setTimeout(() => scrollToBottom('smooth'), 150);
        setTimeout(() => scrollToBottom('smooth'), 400);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0c] relative">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-glass rounded-xl transition-all text-tertiary hover:text-primary active:scale-90">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <div className="w-9 h-9 rounded-[1.25rem] overflow-hidden border border-glass shadow-md bg-sunken group-hover:scale-105 transition-transform duration-500">
                                <img 
                                    src={getOptimizedAvatar(chat.type === 'group' ? chat.avatar : otherUser?.avatar, 'md', chat.type === 'group' ? chat.name : otherUser?.name)} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                    alt="" 
                                />
                            </div>
                            {chat.type === 'private' && (
                                <div className={cn(
                                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[3px] border-surface shadow-sm",
                                    isOnline ? "bg-success" : "bg-neutral-400"
                                )} />
                            )}
                         </div>
                         <div className="leading-tight">
                            <p className="text-[13px] font-black text-primary tracking-[-0.03em] uppercase">
                                {chat.type === 'group' ? chat.name : otherUser?.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-success animate-pulse" : "bg-neutral-400")} />
                                <span className="text-[8px] font-black text-tertiary uppercase tracking-[0.2em] opacity-50">
                                    {isOnline ? 'Active Now' : 'Offline'}
                                </span>
                            </div>
                         </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => toggleBubble(chat._id)}
                        className={cn("p-2 rounded-xl transition-all active:scale-90", isBubbled ? "text-theme bg-theme/10" : "text-tertiary hover:bg-glass hover:text-primary")}
                        title="Toggle Chat Bubble"
                    >
                        {isBubbled ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <div className="relative group/menu">
                        <button className="p-2 hover:bg-glass rounded-xl transition-all text-tertiary hover:text-primary active:scale-90">
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute top-full right-0 mt-3 w-44 bg-elevated/95 backdrop-blur-3xl border border-glass rounded-[1.25rem] shadow-huge opacity-0 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:pointer-events-auto transition-all z-50 overflow-hidden py-1.5">
                            <button 
                                onClick={() => {
                                    setConfirmConfig({
                                        title: 'Clear My History?',
                                        message: 'Messages will be removed from your view only. The other participant will still see the full conversation.',
                                        confirmText: 'Clear for Me',
                                        onConfirm: () => clearChatHistory(chat._id)
                                    });
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left text-[10px] font-black text-secondary hover:bg-danger/10 hover:text-danger transition-all uppercase tracking-[0.1em]"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear My History
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex-1 min-h-0 overflow-y-auto pb-4 custom-scrollbar scroll-smooth"
            >
                {groupedMessages.map((item, idx) => {
                    if (item.type === 'date') {
                        return (
                            <div key={`date-${item.date}`} className="flex justify-center my-3 relative">
                                <div className="absolute inset-0 flex items-center px-12">
                                    <div className="w-full h-px bg-glass" />
                                </div>
                                <span className="bg-surface px-4 py-1 rounded-full text-[9px] font-black text-tertiary uppercase tracking-widest border border-glass relative z-10 shadow-sm">
                                    {isSameDay(new Date(item.date), new Date()) ? 'Today' : format(new Date(item.date), 'MMMM dd, yyyy')}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <ChatMessage 
                            key={item._id || idx}
                            message={item} 
                            isMe={item.isMe}
                            showAvatar={!item.isMe}
                            showName={item.isFirstInGroup && chat.type === 'group'} 
                            isFirstInGroup={item.isFirstInGroup}
                            isLastInGroup={item.isLastInGroup}
                            onReply={() => setReplyTo(item)}
                            onUnsend={() => unsendMessage(chat._id, item._id)}
                        />
                    );
                })}
                
                {/* Typing Indicator */}
                <AnimatePresence>
                    {typers.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-3 px-8 mt-4"
                        >
                            <div className="flex gap-1 bg-sunken rounded-full px-3 py-2 border border-glass shadow-sm">
                                <div className="w-1 h-1 bg-theme rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1 h-1 bg-theme rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1 h-1 bg-theme rounded-full animate-bounce" />
                            </div>
                            <span className="text-[10px] font-black text-theme uppercase tracking-widest opacity-80">
                                {(() => {
                                    const names = typers.map(id => {
                                        const p = chat.participants.find(p => (p._id || p) === id);
                                        return p?.name?.split(' ')[0] || 'Someone';
                                    });
                                    if (names.length === 1) return `${names[0]} is typing...`;
                                    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
                                    return `${names[0]} and ${names.length - 1} others are typing...`;
                                })()}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ChatInput onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        </div>
    );
};

export default ChatTray;


