import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
const ChatTray = () => {
    const { 
        chats, fetchChats, addIncomingMessage, setTyping,
        isDrawerOpen, setDrawerOpen, bubbledChatIds, setActiveChat, activeChat,
        handleMessageDeleted
    } = useChatStore();
    const { user } = useAuthStore();
    const [openBubbleId, setOpenBubbleId] = useState(null);

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
                socket.on('messageDeleted', ({ chatId, messageId }) => {
                    handleMessageDeleted(chatId, messageId);
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

    const bubbledChats = chats.filter(c => bubbledChatIds.includes(c._id));

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Main Chat Drawer */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <div className="absolute inset-0 flex pointer-events-none">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setDrawerOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-auto"
                        />
                        <motion.div
                            initial={{ x: -420, opacity: 0, scale: 0.95 }} 
                            animate={{ 
                                x: 0,
                                opacity: 1,
                                scale: 1,
                                width: activeChat ? 740 : 320,
                                height: 744
                            }} 
                            exit={{ x: -420, opacity: 0, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute top-8 left-8 bg-surface border border-glass shadow-modal pointer-events-auto rounded-[2.5rem] flex flex-row overflow-hidden z-50"
                        >
                            <div className="w-[320px] h-full shrink-0 flex flex-col relative z-20 shadow-[8px_0_24px_-12px_rgba(0,0,0,0.1)]">
                                <ChatList 
                                    chats={chats} 
                                    activeChat={activeChat}
                                    onSelectChat={(chat) => {
                                        setActiveChat(chat);
                                        setOpenBubbleId(null);
                                    }} 
                                    onClose={() => setDrawerOpen(false)} 
                                />
                            </div>
                            
                            <div className={cn(
                                "flex-1 h-full relative transition-opacity duration-300",
                                activeChat ? "opacity-100" : "opacity-0 invisible"
                            )}>
                                <AnimatePresence mode="wait">
                                    {activeChat ? (
                                        <motion.div 
                                            key={activeChat._id}
                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute inset-0 bg-surface flex flex-col"
                                        >
                                            <ChatBox chat={activeChat} onBack={() => setActiveChat(null)} />
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="h-full flex flex-col items-center justify-center p-12 text-center opacity-30 select-none"
                                        >
                                            <div className="w-20 h-20 bg-sunken rounded-[2.5rem] flex items-center justify-center mb-6">
                                                <MessageSquare className="w-10 h-10 text-tertiary" />
                                            </div>
                                            <h3 className="text-lg font-black text-primary">Select a Conversation</h3>
                                            <p className="text-[11px] text-tertiary mt-2 max-w-[200px]">Choose a chat from the sidebar to start collaborating.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-neutral-900 px-3 py-1.5 rounded-xl text-[10px] font-black text-white whitespace-nowrap pointer-events-none shadow-panel"
            >
                {chat.type === 'group' ? chat.name : other?.name}
            </motion.div>
        </motion.button>
    );
};


// ─── Chat List ────────────────────────────────────────────────────────────────
const ChatList = ({ chats, activeChat, onSelectChat, onClose }) => {
    const [search, setSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [view, setView] = useState('list'); // 'list' | 'new'
    const [contextMenu, setContextMenu] = useState(null);
    const { user } = useAuthStore();
    const { archiveChat, deleteChat, sendMessage } = useChatStore();
    const menuRef = useRef(null);
    const memberInputRef = useRef(null);

    // Auto-focus member search input
    useEffect(() => {
        if (view === 'new') {
            setTimeout(() => memberInputRef.current?.focus(), 150);
        }
    }, [view]);

    // Debounced member search
    useEffect(() => {
        if (view !== 'new') return;
        const timer = setTimeout(async () => {
            setMembersLoading(true);
            try {
                const res = await api.get(`/users/workspace?q=${encodeURIComponent(memberSearch)}`);
                setMembers(res.data.data);
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
        setView('list');
        setMemberSearch('');
        try {
            await useChatStore.getState().fetchChats();
            const freshChats = useChatStore.getState().chats;
            // Check if chat with this member already exists
            const existing = freshChats.find(c =>
                c.type === 'private' &&
                c.participants.some(p => (p._id || p) === member._id)
            );
            if (existing) { onSelectChat(existing); return; }
            // Create new chat via send
            await sendMessage(null, { content: '👋' }, member._id);
            await useChatStore.getState().fetchChats();
            const updated = useChatStore.getState().chats;
            const newChat = updated.find(c =>
                c.type === 'private' &&
                c.participants.some(p => (p._id || p) === member._id)
            );
            if (newChat) onSelectChat(newChat);
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
    const handleArchive = async (chatId) => { setContextMenu(null); await archiveChat(chatId); toast.success('Chat archived'); };
    const handleDelete = async (chatId) => {
        setContextMenu(null);
        if (confirm('Remove this conversation?')) { await deleteChat(chatId); toast.success('Conversation removed'); }
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
                        className="p-6 pb-4 flex items-start justify-between shrink-0"
                    >
                        <div>
                            <h2 className="text-xl font-black text-primary tracking-tighter flex items-center gap-2">
                                Messages
                                <span className="bg-theme/10 text-theme text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm">Sync</span>
                            </h2>
                            <p className="text-[10px] font-black text-tertiary mt-0.5 opacity-20 uppercase tracking-[0.2em]">Connected Workspace</p>
                        </div>
                        <div className="flex items-center gap-1.5">
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
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme opacity-50" />
                            <input
                                ref={memberInputRef}
                                type="text"
                                placeholder="Search by name or email..."
                                value={memberSearch}
                                onChange={e => setMemberSearch(e.target.value)}
                                className="w-full bg-sunken border border-glass rounded-2xl py-2.5 pl-10 pr-4 text-[12px] font-semibold text-primary placeholder:text-tertiary/30 outline-none focus:border-theme/40 focus:bg-surface transition-all"
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
                        {/* Search bar */}
                        <div className="px-5 mb-3">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme opacity-30 group-focus-within:opacity-100 transition-all" />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-surface/40 border-none rounded-2xl py-2.5 pl-10 pr-4 text-[12px] placeholder:text-tertiary/20 focus:outline-none focus:bg-surface/80 transition-all font-black tracking-tight"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                            {visibleChats.length > 0 ? (
                                <div className="space-y-0.5">
                                    {visibleChats.map(chat => (
                                        <ChatListItem key={chat._id} chat={chat} activeChat={activeChat} user={user} onSelect={onSelectChat} onContextMenu={handleContextMenu} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 bg-sunken rounded-[2rem] flex items-center justify-center mb-4 opacity-40">
                                        <MessageSquare className="w-8 h-8 text-tertiary" />
                                    </div>
                                    <h3 className="text-sm font-black text-primary">No conversations</h3>
                                    <p className="text-[11px] text-tertiary mt-1 px-10 opacity-60">Click <strong>+</strong> to message a team member.</p>
                                </div>
                            )}

                            {archivedChats.length > 0 && (
                                <div className="mt-4 border-t border-glass pt-3">
                                    <button onClick={() => setShowArchived(v => !v)} className="w-full flex items-center justify-between px-2 py-1.5 text-left text-tertiary hover:text-primary transition-all">
                                        <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2 opacity-40">
                                            <Archive className="w-3 h-3" />
                                            Archived ({archivedChats.length})
                                        </span>
                                        {showArchived ? <ChevronUp className="w-3 h-3 opacity-40" /> : <ChevronDown className="w-3 h-3 opacity-40" />}
                                    </button>
                                    <AnimatePresence>
                                        {showArchived && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-0.5 mt-1">
                                                {archivedChats.map(chat => (
                                                    <ChatListItem key={chat._id} chat={chat} activeChat={activeChat} user={user} onSelect={onSelectChat} onContextMenu={handleContextMenu} dimmed />
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
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="w-6 h-6 border-2 border-theme border-t-transparent rounded-full animate-spin" />
                                <p className="text-[10px] font-bold text-tertiary opacity-40 uppercase tracking-widest">Searching...</p>
                            </div>
                        ) : members.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                                <div className="w-14 h-14 bg-sunken rounded-[1.5rem] flex items-center justify-center mb-4">
                                    <Search className="w-6 h-6 text-tertiary" />
                                </div>
                                <p className="text-[12px] font-black text-primary">{memberSearch ? 'No results' : 'Start searching'}</p>
                                <p className="text-[10px] text-tertiary mt-1">{memberSearch ? 'Try a different name' : 'Type a name to find teammates'}</p>
                            </div>
                        ) : (
                            <div className="space-y-1 pb-4">
                                <p className="text-[9px] font-black text-tertiary uppercase tracking-widest px-1 mb-2 opacity-40">
                                    {members.length} member{members.length !== 1 ? 's' : ''} found
                                </p>
                                {members.map(member => (
                                    <button
                                        key={member._id}
                                        onClick={() => handleStartNewConversation(member)}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-theme/5 active:bg-theme/10 transition-all text-left group"
                                    >
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-sunken group-hover:scale-105 transition-transform duration-300">
                                                <img src={getOptimizedAvatar(member.avatar, 'sm', member.name)} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                                            </div>
                                            <div className={cn(
                                                "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface",
                                                member.status === 'Online' ? "bg-success" : "bg-neutral-400"
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-black text-primary truncate">{member.name}</p>
                                            <p className="text-[10px] text-tertiary opacity-50 truncate uppercase tracking-wider">{member.role}</p>
                                        </div>
                                        <div className={cn(
                                            "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest",
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
                        className="z-[9999] bg-elevated border border-glass rounded-2xl shadow-modal py-1.5 overflow-hidden min-w-[160px]"
                    >
                        <button
                            onClick={() => handleArchive(contextMenu.chatId)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[11px] font-bold text-secondary hover:bg-theme/5 hover:text-primary transition-all"
                        >
                            <Archive className="w-3.5 h-3.5" />
                            Archive Chat
                        </button>
                        <button
                            onClick={() => handleDelete(contextMenu.chatId)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[11px] font-bold text-danger hover:bg-danger/5 transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Chat
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Helper: human-readable last message preview ─────────────────────────────
const formatLastMessage = (msg, currentUserId) => {
    if (!msg) return 'No messages yet.';
    const isMe = (msg.sender?._id || msg.sender) === currentUserId;
    const prefix = isMe ? 'You: ' : '';
    if (msg.deleted) return `${prefix}Message removed`;
    if (msg.type === 'image') return `${prefix}📷 Photo`;
    if (msg.type === 'video') return `${prefix}🎬 Video`;
    if (msg.type === 'file') return `${prefix}📎 File`;
    return `${prefix}${msg.content || ''}`;
};

// ─── Chat List Item ────────────────────────────────────────────────────────────
const ChatListItem = ({ chat, activeChat, user, onSelect, onContextMenu, dimmed }) => {
    const other = chat.type === 'private' 
        ? chat.participants.find(p => p._id !== user?._id)
        : null;
    const unreadCount = chat.unreadCounts?.[user?._id] || 0;
    const isOnline = other?.status === 'Online';


    return (
        <button
            onContextMenu={(e) => onContextMenu(e, chat._id)}
            onClick={() => onSelect(chat)}
            className={cn(
                "w-full p-2.5 rounded-2xl flex items-center gap-3 hover:bg-theme/5 transition-all text-left group relative",
                chat._id === activeChat?._id ? "bg-theme/5 before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:bg-theme before:rounded-full" : "",
                dimmed && "opacity-50"
            )}
        >
            <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm bg-sunken group-hover:scale-105 transition-transform duration-300">
                    <img 
                        src={getOptimizedAvatar(chat.type === 'group' ? chat.avatar : other?.avatar, 'md', chat.type === 'group' ? chat.name : other?.name)} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                        alt="" 
                    />
                </div>
                {chat.type === 'private' && (
                    <div className={cn(
                        "absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-surface shadow-sm",
                        isOnline ? "bg-success" : "bg-neutral-400"
                    )} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[13px] font-black text-primary truncate tracking-tight">
                        {chat.type === 'group' ? chat.name : other?.name}
                    </span>
                    <span className="text-[10px] font-bold text-tertiary opacity-40 tabular-nums lowercase">
                        {chat.lastMessage ? format(new Date(chat.lastMessage.createdAt), 'h:mm a') : ''}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-[11px] truncate text-tertiary font-bold opacity-60 flex-1 pr-4">
                        {formatLastMessage(chat.lastMessage, user?._id)}
                    </p>
                    {unreadCount > 0 && (
                        <div className="px-1.5 py-0.5 min-w-[18px] h-[18px] bg-neutral-900 rounded-full flex items-center justify-center">
                            <span className="text-[9px] font-black text-white">{unreadCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};

// ─── Chat Box ─────────────────────────────────────────────────────────────────
const ChatBox = ({ chat, onBack, isBubbleMode }) => {
    const { user } = useAuthStore();
    const { messages, sendMessage, unsendMessage, toggleBubble, bubbledChatIds, typingUsers } = useChatStore();
    const { scrollRef, checkScroll, scrollToBottom } = useSmartScroll(messages[chat._id]);
    const [replyTo, setReplyTo] = useState(null);

    const isBubbled = bubbledChatIds.includes(chat._id);
    const chatMessages = messages[chat._id] || [];
    const otherUser = chat.type === 'private' ? chat.participants.find(p => p._id !== user?._id) : null;
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
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-surface relative">
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between bg-surface/40 backdrop-blur-xl z-10 border-b border-glass">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-1 hover:bg-glass rounded-lg transition-all text-tertiary hover:text-primary">
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-glass shadow-sm bg-sunken">
                                <img 
                                    src={getOptimizedAvatar(chat.type === 'group' ? chat.avatar : otherUser?.avatar, 'sm', chat.type === 'group' ? chat.name : otherUser?.name)} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                    alt="" 
                                />
                            </div>
                            {chat.type === 'private' && (
                                <div className={cn(
                                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface",
                                    otherUser?.status === 'Online' ? "bg-success" : "bg-neutral-400"
                                )} />
                            )}
                         </div>
                         <div className="leading-tight">
                            <p className="text-[11px] font-black text-primary tracking-tight">
                                {chat.type === 'group' ? chat.name : otherUser?.name}
                            </p>
                            <p className="text-[8px] font-bold text-tertiary uppercase tracking-widest flex items-center gap-1 opacity-40">
                                {otherUser?.status === 'Online' ? 'Online' : 'Away'}
                            </p>
                         </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => toggleBubble(chat._id)}
                        className={cn("p-1.5 rounded-lg transition-all", isBubbled ? "text-theme bg-theme/10" : "text-tertiary hover:bg-glass hover:text-primary")}
                    >
                        {isBubbled ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            <div 
                ref={scrollRef} 
                onScroll={checkScroll}
                className="flex-1 min-h-0 overflow-y-auto pb-6 custom-scrollbar scroll-smooth"
            >
                {groupedMessages.map((item, idx) => {
                    if (item.type === 'date') {
                        return (
                            <div key={`date-${item.date}`} className="flex justify-center my-4 relative">
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
                                <div className="w-1.5 h-1.5 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[10px] font-bold text-tertiary opacity-40 uppercase tracking-widest">typing...</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ChatInput onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        </div>
    );
};

export default ChatTray;


