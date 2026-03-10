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
    let ctaHtml = '';
    if (ctaText && ctaUrl) {
        ctaHtml = `<a href="${ctaUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #7B52FF; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">${ctaText}</a>`;
    }

    let footerHtml = '';
    if (footer) {
        footerHtml = `<p style="color: #8888aa; font-size: 13px; margin-top: 25px;">${footer}</p>`;
    }

    const html = `
        <div style="font-family: inherit; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #060612;">${title}</h2>
            <p style="color: #44445a; line-height: 1.6;">${body}</p>
            ${customHtml || ''}
            ${ctaHtml}
            ${footerHtml}
        </div>
    `;

    return sendEmail({ to, subject, html });
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

module.exports = {
    getFrontendUrl,
    formatUserResponse,
    sendStandardEmail,
    getCookieOptions
};
