/**
 * Production-grade email utility using Brevo (formerly Sendinblue) HTTP API.
 * 
 * Why Brevo? Render's free tier blocks ALL outbound SMTP ports (587, 465).
 * Brevo's HTTP API sends via HTTPS (port 443), which Render allows.
 * Free tier: 300 emails/day, no custom domain required.
 *
 * Uses Node's built-in fetch API (Node 18+) — zero extra dependencies.
 *
 * Required environment variables:
 * - BREVO_API_KEY (get one at https://app.brevo.com/settings/keys/api)
 * - EMAIL_USER   (your verified sender email on Brevo, e.g. klivramailer@gmail.com)
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async ({ to, subject, html, attachments }) => {
    if (!process.env.BREVO_API_KEY) {
        throw new Error('BREVO_API_KEY is not set in environment variables!');
    }

    const senderEmail = process.env.EMAIL_USER || 'klivramailer@gmail.com';

    console.log(`[EMAIL] Sending to: ${to}, Subject: "${subject}", via Brevo HTTP API`);

    const body = JSON.stringify({
        sender: { name: 'Klivra', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        attachment: attachments, // Brevo API expects 'attachment' (array of { name, content, contentId })
    });

    const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body,
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`[EMAIL] ❌ Brevo API error: ${JSON.stringify(data)}`);
        throw new Error(`Brevo API error: ${data.message || response.statusText}`);
    }

    console.log(`[EMAIL] ✅ Sent to ${to}. MessageId: ${data.messageId}`);
    return data;
};

module.exports = sendEmail;
