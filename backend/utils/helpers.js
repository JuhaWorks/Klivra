const fs = require('fs');
const path = require('path');
const sendEmail = require('./sendEmail');

/**
 * Gets the frontend URL based on the environment.
 * @returns {string} The frontend URL.
 */
const getFrontendUrl = () => {
    const isProd = process.env.NODE_ENV === 'production';
    return process.env.FRONTEND_URL || (isProd ? 'https://klivra.vercel.app' : 'http://localhost:5173');
};

/**
 * Formats a user object for standard API responses.
 * @param {Object} user - The mongoose user document.
 * @returns {Object} The formatted user object.
 */
const formatUserResponse = (user) => {
    return {
        _id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
        customMessage: user.customMessage
    };
};

/**
 * Sends a standardized HTML email using a common template.
 * @param {Object} options - Email options.
 * @param {string} options.to - Recipient email.
 * @param {string} options.subject - Email subject.
 * @param {string} options.title - Header title in the email body.
 * @param {string} options.body - Main body text of the email.
 * @param {string} [options.ctaText] - Text for the call-to-action button.
 * @param {string} [options.ctaUrl] - URL for the call-to-action button.
 * @param {string} [options.footer] - Small footer text.
 * @param {string} [options.customHtml] - Optional custom HTML to inject into the body.
 */
const sendStandardEmail = async ({ to, subject, title, body, ctaText, ctaUrl, footer, customHtml }) => {
    const frontendUrl = getFrontendUrl();
    // Fallback to a stable public URL if on localhost, as email clients can't reach localhost
    const isLocal = frontendUrl.includes('localhost');
    const publicLogoFallback = 'https://ui-avatars.com/api/?name=K&background=008c64&color=fff&size=128&bold=true&format=png';
    const logoUrl = process.env.PUBLIC_LOGO_URL || (isLocal ? publicLogoFallback : `${frontendUrl}/logo.png`);
    const accentColor = '#008c64'; // Klivra Emerald

    let ctaHtml = '';
    if (ctaText && ctaUrl) {
        ctaHtml = `
            <div style="margin-top: 30px;">
                <a href="${ctaUrl}" style="display: inline-block; padding: 14px 32px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 140, 100, 0.2); transition: all 0.2s ease;">
                    ${ctaText}
                </a>
            </div>`;
    }

    let footerHtml = '';
    if (footer) {
        footerHtml = `<p style="color: #9ca3af; font-size: 12px; margin-top: 35px; line-height: 1.5; border-top: 1px solid #f3f4f6; padding-top: 20px;">${footer}</p>`;
    }

    // Use a Public URL for the logo for maximum reliability across all email clients
    // CID (cid:logo_img) often shows up as an attachment or breaks in Gmail/Outlook.
    const finalLogoUrl = logoUrl;
    const attachments = []; // No longer need CID attachments for the logo

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);">
                            <!-- Header / Logo -->
                            <tr>
                                <td align="center" style="padding: 40px 40px 20px 40px;">
                                    <img src="${finalLogoUrl}" alt="Klivra Logo" width="64" height="64" style="display: block; border-radius: 16px; background-color: ${accentColor};">
                                    <h1 style="margin: 20px 0 0 0; color: #111827; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">klivra</h1>
                                </td>
                            </tr>
                            <!-- Content -->
                            <tr>
                                <td style="padding: 20px 40px 40px 40px;">
                                    <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">${title}</h2>
                                    <div style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                                        ${body}
                                    </div>
                                    ${customHtml || ''}
                                    ${ctaHtml}
                                    ${footerHtml}
                                    <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                                        &copy; ${new Date().getFullYear()} Klivra. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;

    return sendEmail({ to, subject, html, attachments });
};

/**
 * Options for secure cookies.
 * @param {boolean} [rememberMe=false] - Whether to extend the cookie lifetime.
 * @returns {Object} The cookie options.
 */
const getCookieOptions = (rememberMe = false) => {
    const isProd = process.env.NODE_ENV === 'production';
    const options = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
    };
    if (rememberMe) {
        options.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    return options;
};

/**
 * Robustly checks if maintenance mode is effectively active.
 * @param {Object} maintenanceValue - The value object from SystemConfig (key: 'maintenance_mode')
 * @returns {Object} { isMaintenance: boolean, endTime: Date|null, autoRepairNeeded: boolean }
 */
const checkMaintenanceStatus = (maintenanceValue) => {
    const details = maintenanceValue || { enabled: false, endTime: null };
    const enabled = !!details.enabled;
    const endTime = details.endTime ? new Date(details.endTime) : null;
    
    // Auto-disable if end time has passed
    const isPast = endTime && endTime.getTime() < Date.now();
    const isMaintenance = enabled && !isPast;
    const autoRepairNeeded = enabled && isPast;

    return { isMaintenance, endTime, autoRepairNeeded };
};

module.exports = {
    getFrontendUrl,
    formatUserResponse,
    sendStandardEmail,
    getCookieOptions,
    checkMaintenanceStatus
};
