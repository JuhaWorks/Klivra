const Chat = require('../models/chat.model');
const Message = require('../models/message.model');
const User = require('../models/user.model');
const socketUtil = require('../utils/socket');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

// @desc    Get all chats for current user
// @route   GET /api/chat
// @access  Private
const getUserChats = async (req, res, next) => {
    try {
        const chats = await Chat.find({ participants: req.user._id })
            .populate('participants', 'name avatar status')
            .populate('lastMessage')
            .sort({ updatedAt: -1 })
            .lean();

        // Identify which chats are currently bubbled for this user
        const bubbledChatIds = req.user.interfacePrefs?.bubbledChats?.map(id => id.toString()) || [];
        const formattedChats = chats.map(chat => ({
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

        const messages = await Message.find({ chat: chatId })
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
        chat.lastMessage = message._id;
        
        // Increment unread for all participants except sender
        chat.participants.forEach(pId => {
            if (pId.toString() !== req.user._id.toString()) {
                const current = chat.unreadCounts.get(pId.toString()) || 0;
                chat.unreadCounts.set(pId.toString(), current + 1);
            }
        });

        await chat.save();

        const populatedMessage = await message.populate([
            { path: 'sender', select: 'name avatar' },
            { path: 'replyTo', populate: { path: 'sender', select: 'name' } }
        ]);

        // 4. Emit via Socket.io
        if (socketUtil.isInitialized()) {
            const io = socketUtil.getIO();
            chat.participants.forEach(pId => {
                io.to(pId.toString()).emit('newMessage', {
                    chat: targetChatId,
                    message: populatedMessage
                });
            });
        }

        // 5. Create Database Notifications
        const otherParticipants = chat.participants.filter(p => p.toString() !== req.user._id.toString());
        otherParticipants.forEach(async (pId) => {
            try {
                await notificationService.notify({
                    recipientId: pId,
                    senderId: req.user._id,
                    type: 'Chat',
                    priority: 'Medium',
                    title: `New message from ${req.user.name}`,
                    message: content ? (content.length > 50 ? content.substring(0, 47) + '...' : content) : (type === 'image' ? 'Sent a photo' : 'Sent an attachment'),
                    link: '/chat',
                    metadata: { chatId: targetChatId }
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
        message.content = 'This message was removed';
        await message.save();

        // Broadcast deletion to all participants in the chat
        if (socketUtil.isInitialized()) {
            const io = socketUtil.getIO();
            const chat = await require('../models/chat.model').findById(message.chat);
            if (chat) {
                chat.participants.forEach(pId => {
                    io.to(pId.toString()).emit('messageDeleted', {
                        chatId: message.chat.toString(),
                        messageId: message._id.toString()
                    });
                });
            }
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
        const userId = req.user._id;

        // Remove the user from the chat's participants (soft delete - only affects this user)
        await Chat.findByIdAndUpdate(chatId, {
            $pull: { participants: userId }
        });

        res.status(200).json({ status: 'success', message: 'Chat removed' });
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
    deleteUserChat
};
