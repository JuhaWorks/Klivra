const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/access.middleware');
const { upload } = require('../utils/service.utils');
const { cacheMiddleware } = require('../utils/system.utils');

// Controllers
const socialCtrl = require('../controllers/social.controller');
const userCtrl = require('../controllers/user.controller');
const chatCtrl = require('../controllers/chat.controller');

// ─── 1. Connections (Networking) ──────────────────────────────────────────
const connectionRouter = express.Router();
connectionRouter.use(protect);

connectionRouter.get('/', socialCtrl.getMyConnections);
connectionRouter.get('/pending', socialCtrl.getPendingRequests);
connectionRouter.get('/sent', socialCtrl.getSentRequests);
connectionRouter.get('/stats', socialCtrl.getStats);
connectionRouter.get('/suggestions', socialCtrl.getSuggestions);
connectionRouter.get('/search', socialCtrl.searchUsers);
connectionRouter.post('/request', socialCtrl.sendRequest);
connectionRouter.put('/respond', socialCtrl.respondToRequest);
connectionRouter.delete('/withdraw/:connectionId', socialCtrl.withdrawRequest);
connectionRouter.delete('/:connectionId', socialCtrl.removeConnection);

// ─── 2. Endorsements (Skills) ──────────────────────────────────────────────
const endorsementRouter = express.Router();
endorsementRouter.use(protect);

endorsementRouter.post('/', socialCtrl.toggleEndorsement);
endorsementRouter.get('/user/:userId', socialCtrl.getUserEndorsements);

// ─── 3. Notifications (Real-time Alerts) ────────────────────────────────────
const notificationRouter = express.Router();
notificationRouter.use(protect);

notificationRouter.get('/unread/count', userCtrl.getUnreadCount);
notificationRouter.get('/', userCtrl.getNotifications);
notificationRouter.patch('/read-all', userCtrl.markAllAsRead);
notificationRouter.patch('/:id/read', userCtrl.markAsRead);
notificationRouter.delete('/:id', userCtrl.deleteNotification);
notificationRouter.put('/preferences', userCtrl.updateNotificationPreferences);
notificationRouter.post('/test', userCtrl.sendTestNotification);

// ─── 4. Chats (Messaging) ──────────────────────────────────────────────────
const chatRouter = express.Router();
chatRouter.use(protect);

chatRouter.get('/', chatCtrl.getUserChats);
chatRouter.get('/:chatId/messages', chatCtrl.getChatMessageHistory);
chatRouter.post('/send', chatCtrl.sendMessage);
chatRouter.patch('/messages/:messageId/unsend', chatCtrl.unsendMessage);
chatRouter.patch('/:chatId/bubble', chatCtrl.toggleBubble);
chatRouter.patch('/:chatId/archive', chatCtrl.archiveChat);
chatRouter.post('/:chatId/clear', chatCtrl.clearChatHistory);
chatRouter.delete('/:chatId', chatCtrl.deleteUserChat);

chatRouter.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ status: 'success', data: { url, filename: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } });
});

module.exports = {
    connectionRouter,
    endorsementRouter,
    notificationRouter,
    chatRouter
};
