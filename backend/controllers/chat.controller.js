const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');
const { getIO } = require('../utils/service.utils');
const { logger } = require('../utils/system.utils');

const notificationService = require('../services/notification.service');
const { catchAsync } = require('../utils/core.utils');
const { PROJECT_ROLES, NOTIFICATION_TYPES, TASK_PRIORITIES, SYSTEM_MESSAGES, CHAT_MESSAGES } = require('../constants');
const getUserChats = async (req, res, next) => {
    try {
        const chats = await Chat.find({ participants: req.user._id })
            .populate('participants', 'name avatar status')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
            .lean();

        // Identify which chats are currently bubbled for this user
        const bubbledChatIds = req.user.interfacePrefs?.bubbledChats?.map(id => id.toString()) || [];
        
        const formattedChats = chats.filter(chat => {
            const userDeletedAt = chat.deletedAt instanceof Map && chat.deletedAt.has(req.user._id.toString()) 
                ? chat.deletedAt.get(req.user._id.toString()) 
                : null;
            
            if (!userDeletedAt) return true;
            if (!chat.lastMessage) return false;
            
            // Re-appear if last message is newer than the deletion date
            return new Date(chat.lastMessage.createdAt) > new Date(userDeletedAt);
        }).map(chat => ({
            ...chat,
            isBubbled: bubbledChatIds.includes(chat._id.toString())
        }));

        res.status(200).json({ status: 'success', data: formattedChats });
    } catch (error) { next(error); }
};

// @desc    Get message history for a chat
// @route   GET /api/chat/:chatId/messages
// @access  Private
const getChatMessageHistory = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // IDOR FIX: Verify membership BEFORE fetching history
        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ status: 'error', message: 'Chat not found' });
        
        const isParticipant = chat.participants.some(p => p.toString() === req.user._id.toString());
        if (!isParticipant && req.user.role !== PROJECT_ROLES.ADMIN) {
            return res.status(403).json({ status: 'error', message: 'Access denied. You are not a participant in this chat.' });
        }

        const clearedAt = chat.clearedAt?.get(req.user._id.toString()) || new Date(0);
        
        const messages = await Message.find({ 
            chat: chatId,
            createdAt: { $gt: clearedAt }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'name avatar')
            .populate({ path: 'replyTo', populate: { path: 'sender', select: 'name' } })
            .lean();

        // Mark as read when history is fetched
        await Chat.findByIdAndUpdate(chatId, {
            $set: { [`unreadCounts.${req.user._id}`]: 0 }
        });

        res.status(200).json({ 
            status: 'success', 
            data: messages.reverse(),
            page,
            hasMore: messages.length === limit
        });
    } catch (error) { next(error); }
};

// @desc    Send a message
// @route   POST /api/chat/send
// @access  Private
const sendMessage = async (req, res, next) => {
    try {
        const { chatId, recipientId, content, type, metadata, replyTo } = req.body;
        let targetChatId = chatId;

        // 1. If no chatId but has recipientId, find/create private chat
        if (!targetChatId && recipientId) {
            let chat = await Chat.findOne({
                type: 'private',
                participants: { $all: [req.user._id, recipientId] }
            });

            if (!chat) {
                chat = await Chat.create({
                    type: 'private',
                    participants: [req.user._id, recipientId]
                });
            }
            targetChatId = chat._id;
        }

        if (!targetChatId) {
             res.status(400);
             throw new Error('Chat ID or Recipient ID required');
        }

        // 2. Create the message
        const message = await Message.create({
            chat: targetChatId,
            sender: req.user._id,
            content,
            type: type || 'text',
            metadata,
            replyTo: replyTo || null
        });

        // 3. Update Chat state
        const chat = await Chat.findById(targetChatId);
        if (!chat) return res.status(404).json({ status: 'error', message: SYSTEM_MESSAGES.CHAT_NOT_FOUND });

        // IDOR FIX: Verify membership BEFORE allowing message injection
        const isParticipant = chat.participants.some(p => p.toString() === req.user._id.toString());
        if (!isParticipant && req.user.role !== PROJECT_ROLES.ADMIN) {
            return res.status(403).json({ status: 'error', message: 'Access denied. You are not a participant in this chat.' });
        }

        chat.lastMessage = message._id;
        
        // Increment unread for all participants except sender
        chat.participants.forEach(pId => {
            const sId = pId.toString();
            // Clear deletedAt for everyone so it reappears in their inbox
            if (chat.deletedAt instanceof Map && chat.deletedAt.has(sId)) {
                chat.deletedAt.delete(sId);
            }

            if (sId !== req.user._id.toString()) {
                const current = chat.unreadCounts.get(sId) || 0;
                chat.unreadCounts.set(sId, current + 1);
            }
        });

        await chat.save();

        const populatedMessage = await message.populate([
            { path: 'sender', select: 'name avatar' },
            { path: 'replyTo', populate: { path: 'sender', select: 'name' } }
        ]);

        // 4. Emit via Socket.io
        try {
            const io = getIO();
            // High-performance broadcast to the dedicated chat room
            io.to(`chat_${targetChatId}`).emit('newMessage', {
                chat: targetChatId,
                message: populatedMessage
            });
            
            // Legacy/Push fallback to individual user rooms (for notifications)
            chat.participants.forEach(pId => {
                const sId = pId.toString();
                if (sId !== req.user._id.toString()) {
                    io.to(`user_${sId}`).emit('newMessage', {
                        chat: targetChatId,
                        message: populatedMessage
                    });
                }
            });
        } catch (sErr) {
            logger.warn(`Socket dispatch failed for newMessage: ${sErr.message}`);
        }

        // 5. Create Database Notifications & Handle Mentions
        const uniqueParticipants = [...new Set(chat.participants.map(p => p.toString()))];
        const otherParticipants = uniqueParticipants.filter(pId => pId !== req.user._id.toString());
        
        // Mention Detection Regex: @[name](id) or @name
        const mentions = [];
        if (content && typeof content === 'string') {
            const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
            let match;
            while ((match = mentionRegex.exec(content)) !== null) {
                mentions.push(match[2]);
            }
        }

        otherParticipants.forEach(async (pId) => {
            try {
                const isMentioned = mentions.includes(pId);
                await notificationService.notify({
                    recipientId: pId,
                    senderId: req.user._id,
                    type: isMentioned ? NOTIFICATION_TYPES.MENTION : NOTIFICATION_TYPES.CHAT,
                    priority: isMentioned ? TASK_PRIORITIES[2] : TASK_PRIORITIES[1],
                    title: isMentioned ? `Mentioned by ${req.user.name}` : `New message from ${req.user.name}`,
                    message: content ? (content.length > 50 ? content.substring(0, 47) + '...' : content) : (type === 'image' ? 'Sent a photo' : 'Sent an attachment'),
                    link: '/chat',
                    metadata: { chatId: targetChatId, messageId: message._id }
                });
            } catch (err) {
                logger.error(`Failed to dispatch chat notification: ${err.message}`);
            }
        });

        res.status(201).json({ status: 'success', data: populatedMessage });
    } catch (error) { next(error); }
};

// @desc    Unsend (soft-delete) a message
// @route   PATCH /api/chats/messages/:messageId/unsend
// @access  Private
const unsendMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);

        if (!message) return res.status(404).json({ status: 'error', message: 'Message not found' });
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ status: 'error', message: 'Not your message' });
        }

        message.deleted = true;
        message.content = CHAT_MESSAGES.MESSAGE_REMOVED;
        await message.save();

        // Broadcast deletion to all participants in the chat
        try {
            const io = getIO();
            const chat = await Chat.findById(message.chat);
            if (chat) {
                // Room broadcast
                io.to(`chat_${message.chat}`).emit('messageDeleted', {
                    chat: message.chat,
                    messageId: messageId
                });

                // Individual user room fallback
                chat.participants.forEach(pId => {
                    io.to(`user_${pId.toString()}`).emit('messageDeleted', {
                        chat: message.chat,
                        messageId: messageId
                    });
                });
            }
        } catch (sErr) {
            logger.warn(`Socket dispatch failed for messageDeleted: ${sErr.message}`);
        }

        res.status(200).json({ status: 'success', messageId: message._id });
    } catch (error) { next(error); }
};

// @desc    Helper to find or create a project group chat
const ensureProjectChat = async (project) => {
    try {
        const participants = project.members.map(m => m.userId?._id || m.userId);
        
        let chat = await Chat.findOne({ project: project._id });
        
        if (chat) {
            // Update participants in case they changed
            chat.participants = participants;
            chat.name = project.name;
            chat.avatar = project.coverImage;
            await chat.save();
        } else {
            chat = await Chat.create({
                type: 'group',
                project: project._id,
                participants,
                name: project.name,
                avatar: project.coverImage
            });
        }
        return chat;
    } catch (error) {
        logger.error(`Failed to sync project chat: ${error.message}`);
    }
};

// @desc    Toggle chat bubble status (pin/unpin)
// @route   PATCH /api/chat/:chatId/bubble
// @access  Private
const toggleBubble = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const user = await User.findById(userId);
        if (!user.interfacePrefs) user.interfacePrefs = {};
        if (!user.interfacePrefs.bubbledChats) user.interfacePrefs.bubbledChats = [];

        const index = user.interfacePrefs.bubbledChats.indexOf(chatId);
        let isBubbled = false;

        if (index > -1) {
            user.interfacePrefs.bubbledChats.splice(index, 1);
        } else {
            user.interfacePrefs.bubbledChats.push(chatId);
            isBubbled = true;
        }

        await user.save();
        res.status(200).json({ status: 'success', isBubbled });
    } catch (error) { next(error); }
};

// @desc    Archive a chat for current user
// @route   PATCH /api/chats/:chatId/archive
// @access  Private
const archiveChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const user = await User.findById(req.user._id);
        if (!user.interfacePrefs) user.interfacePrefs = {};
        if (!user.interfacePrefs.archivedChats) user.interfacePrefs.archivedChats = [];

        const index = user.interfacePrefs.archivedChats.indexOf(chatId);
        let isArchived = false;

        if (index > -1) {
            user.interfacePrefs.archivedChats.splice(index, 1); // Unarchive
        } else {
            user.interfacePrefs.archivedChats.push(chatId); // Archive
            isArchived = true;
        }

        await user.markModified('interfacePrefs');
        await user.save();
        res.status(200).json({ status: 'success', isArchived });
    } catch (error) { next(error); }
};

// @desc    Delete (leave) a chat for current user
// @route   DELETE /api/chats/:chatId
// @access  Private
const deleteUserChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id.toString();

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ status: 'error', message: 'Chat not found' });
        
        if (!chat.deletedAt) chat.deletedAt = new Map();
        if (!chat.clearedAt) chat.clearedAt = new Map();
        
        const now = new Date();
        chat.deletedAt.set(userId, now);
        chat.clearedAt.set(userId, now); // Also clear history for this user
        
        await chat.save();
        res.status(200).json({ status: 'success', message: CHAT_MESSAGES.REMOVED_FOR_YOU });
    } catch (error) { next(error); }
};
// @desc    Clear chat history for current user
// @route   POST /api/chats/:chatId/clear
// @access  Private
const clearChatHistory = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id.toString();

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ status: 'error', message: 'Chat not found' });
        
        if (!chat.participants.some(p => p.toString() === userId)) {
            return res.status(403).json({ status: 'error', message: 'Not a participant' });
        }

        if (!chat.clearedAt) chat.clearedAt = new Map();
        chat.clearedAt.set(userId, new Date());
        await chat.save();

        res.status(200).json({ status: 'success', message: CHAT_MESSAGES.HISTORY_CLEARED });
    } catch (error) { next(error); }
};

module.exports = {
    getUserChats,
    getChatMessageHistory,
    sendMessage,
    unsendMessage,
    ensureProjectChat,
    toggleBubble,
    archiveChat,
    deleteUserChat,
    clearChatHistory
};
