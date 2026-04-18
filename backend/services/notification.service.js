const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const webpush = require('web-push');
const { sendEmail, getIO } = require('../utils/service.utils');
const { logger } = require('../utils/system.utils');

// Initialize WebPush VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_MAIL_TO || 'mailto:support@klivra.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    logger.info('[NOTIFY] WebPush VAPID details configured');
}

/**
 * Service to manage centralized notifications
 */
class NotificationService {
    /**
     * Check if the current time is within the user's quiet hours
     */
    isInQuietHours(user) {
        if (!user?.notificationPrefs?.quietHours) return false;
        const { quietHours } = user.notificationPrefs;
        if (!quietHours.enabled) return false;

        const now = new Date();
        const currentTimeString = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: quietHours.timezone || 'UTC'
        });

        const { start, end } = quietHours;

        if (start < end) {
            return currentTimeString >= start && currentTimeString <= end;
        } else {
            // Overlap midnight (e.g., 22:00 to 08:00)
            return currentTimeString >= start || currentTimeString <= end;
        }
    }

    /**
     * Core method to create and dispatch notifications
     */
    async notify({ recipientId, senderId, type, priority = 'Medium', title, message, link, metadata }) {
        try {
            // 1. Save to Database
            const notification = await Notification.create({
                recipient: recipientId,
                sender: senderId,
                type,
                priority,
                title,
                message,
                link,
                metadata
            });

            // Populate recipient for email logic
            const recipient = await User.findById(recipientId).select('email name notificationPrefs').lean();
            if (!recipient) return notification;

            // 2. Real-time Delivery (Always try if recipient is online)
            const CATEGORY_MAP = {
                'Assignment': 'assignments',
                'Mention': 'mentions',
                'Deadline': 'deadlines',
                'StatusUpdate': 'statusUpdates',
                'MetadataUpdate': 'updates',
                'Comment': 'comments',
                'Chat': 'messages'
            };
            const prefKey = CATEGORY_MAP[type];

            try {
                // Channel Check: In-App
                const inAppGlobal = recipient?.notificationPrefs?.inApp ?? true;
                const categoryPrefs = recipient?.notificationPrefs?.categories?.[prefKey];
                
                // Robust check: if categoryPrefs is an object, check .inApp, otherwise fallback to legacy boolean or true
                const isInAppEnabled = typeof categoryPrefs === 'object' 
                    ? (categoryPrefs.inApp ?? true) 
                    : (categoryPrefs ?? true);

                const isSelf = senderId?.toString() === recipientId?.toString();

                if (inAppGlobal && isInAppEnabled && !isSelf) {
                    const io = getIO();
                    if (io) {
                        io.to(`user_${recipientId}`).emit('newNotification', {
                            ...notification.toObject(),
                            sender: senderId
                        });
                    }
                }
            } catch (socketError) {
                logger.warn(`[NOTIFY] Real-time socket delivery skipped: ${socketError.message}`);
            }

            // 3. Email Delivery Logic
            const isSelf = senderId?.toString() === recipientId?.toString();
            const categoryPrefsRecipient = recipient?.notificationPrefs?.categories?.[prefKey];

            const isEmailEnabledForCategory = typeof categoryPrefsRecipient === 'object' 
                ? (categoryPrefsRecipient.email ?? true) 
                : (categoryPrefsRecipient ?? true);

            const isEmailActiveGlobal = recipient?.notificationPrefs?.email ?? true;

            if (isEmailActiveGlobal && isEmailEnabledForCategory && !isSelf) {
                const inQuietHours = this.isInQuietHours(recipient);
                const isDigest = recipient?.notificationPrefs?.frequency === 'digest';

                // --- Emergency Command Bypass ---
                // Strategic types like Security/Compliance and High/Urgent priority bypass all restrictions
                const taskType = metadata?.taskType || '';
                const isEmergencyType = ['Security', 'Compliance'].includes(taskType);
                const isHighPriority = priority === 'Urgent' || priority === 'High';
                const isMentionOrDeadline = type === 'Mention' || type === 'Deadline';
                
                const isUrgent = isEmergencyType || isHighPriority || isMentionOrDeadline;

                console.log(`[NOTIFY] Evaluating delivery for ${recipient.email}: Category(${prefKey}): ${isEmailEnabledForCategory}, Emergency: ${isUrgent}, Digest: ${isDigest}, QuietHours: ${inQuietHours}`);

                if (isUrgent || (!isDigest && !inQuietHours)) {
                    const { projectName } = metadata || {};
                    const displayProject = projectName || 'Workspace';
                    
                    logger.info(`[NOTIFY] Dispatching ${type} email to: ${recipient.email} (Urgent: ${isUrgent})`);
                    
                    // Premium Responsive HTML Template
                    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #ffffff; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background-color: #121214; border: 1px solid #27272a; border-radius: 24px; padding: 40px; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .badge-urgent { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .badge-normal { background-color: rgba(0, 229, 160, 0.1); color: #00e5a0; border: 1px solid rgba(0, 229, 160, 0.2); }
        .project-name { font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight: 800; }
        .title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 16px 0; letter-spacing: -1px; }
        .message { font-size: 16px; color: #a1a1aa; line-height: 1.6; margin-bottom: 32px; }
        .btn { display: inline-block; background-color: #00e5a0; color: #000000; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; transition: transform 0.2s; }
        .footer { margin-top: 32px; padding-top: 32px; border-top: 1px solid #27272a; font-size: 12px; color: #52525b; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="project-name">${displayProject}</div>
            <h1 class="title">${title}</h1>
            <div style="margin-bottom: 24px;">
                <span class="badge ${isUrgent ? 'badge-urgent' : 'badge-normal'}">${priority} Alert</span>
            </div>
            <p class="message">${message}</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}${link || '/'}" class="btn">View in Klivra</a>
        </div>
        <div class="footer">
            Sent via Klivra Strategic Command • ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>
                    `;

                    await sendEmail({
                        to: recipient.email,
                        subject: `[Klivra] ${isUrgent ? 'Urgent: ' : ''}${title} in ${displayProject}`,
                        html
                    });
                    
                    notification.isEmailed = true;
                    await notification.save();
                } else {
                    logger.info(`[NOTIFY] Email deferred for ${recipient.email} (Reason: ${inQuietHours ? 'Quiet Hours' : 'Digest Preference'})`);
                }
            }

            // 4. Browser Push Delivery Logic
            const isPushActiveGlobal = recipient?.notificationPrefs?.push ?? true;
            const isPushEnabledForCategory = typeof categoryPrefsRecipient === 'object' 
                ? (categoryPrefsRecipient.push ?? true) 
                : (categoryPrefsRecipient ?? true);

            if (isPushActiveGlobal && isPushEnabledForCategory && !isSelf && recipient.pushSubscriptions?.length > 0) {
                const inQuietHours = this.isInQuietHours(recipient);
                const isUrgent = priority === 'Urgent' || priority === 'High' || type === 'Mention' || type === 'Deadline';

                if (isUrgent || !inQuietHours) {
                    const pushPayload = JSON.stringify({
                        title: title,
                        body: message,
                        icon: '/logo.png', // Assuming logo is in public folder
                        data: {
                            url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}${link || '/'}`
                        }
                    });

                    // Send to all registered subscriptions
                    recipient.pushSubscriptions.forEach(sub => {
                        webpush.sendNotification(sub, pushPayload).catch(err => {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                // Subscription has expired or is no longer valid, remove it
                                logger.info(`[NOTIFY] Removing expired push subscription for user: ${recipientId}`);
                                User.updateOne(
                                    { _id: recipientId },
                                    { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
                                ).exec();
                            } else {
                                logger.error(`[NOTIFY] WebPush error for device: ${err.message}`);
                            }
                        });
                    });
                }
            }

            return notification;
        } catch (error) {
            console.error(error);
            logger.error(`[NOTIFY] Failed to send notification: ${error.message}`);
        }
    }
}

module.exports = new NotificationService();
