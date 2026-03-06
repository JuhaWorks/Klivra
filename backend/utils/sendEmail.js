const nodemailer = require('nodemailer');

/**
 * Production-grade email utility with connection pooling and retry logic.
 *
 * Required environment variables:
 * - EMAIL_USER  (e.g., klivramailer@gmail.com)
 * - EMAIL_PASS  (Gmail App Password — NOT your regular password)
 * - EMAIL_HOST  (default: smtp.gmail.com)
 * - EMAIL_PORT  (default: 587)
 */

// Singleton transporter — reuse TCP connection pool across all emails
let transporter = null;

function getTransporter() {
    if (!transporter) {
        const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
        const port = Number(process.env.EMAIL_PORT) || 587;

        transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            // Connection pool for better performance on cloud platforms
            pool: true,
            maxConnections: 3,
            maxMessages: 100,
            // Timeouts to prevent hanging on Render/cloud environments
            connectionTimeout: 10000,  // 10s to establish connection
            greetingTimeout: 10000,    // 10s for SMTP greeting
            socketTimeout: 15000,      // 15s for socket inactivity
            // TLS settings for cloud environments
            tls: {
                rejectUnauthorized: true,
                minVersion: 'TLSv1.2',
            },
        });

        console.log(`📧 Email transporter created: ${process.env.EMAIL_USER} via ${host}:${port}`);
    }
    return transporter;
}

/**
 * Send an email with automatic retry (up to 3 attempts).
 * @param {Object} options - { to, subject, html }
 * @returns {Promise<Object>} nodemailer info object
 */
const sendEmail = async ({ to, subject, html }) => {
    // Validate environment
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ EMAIL_USER or EMAIL_PASS not set in environment variables!');
        throw new Error('Email service is not configured. Missing EMAIL_USER or EMAIL_PASS.');
    }

    const transport = getTransporter();

    // Build the "from" address safely (avoid dotenv parsing issues with angle brackets)
    const fromAddress = `"Klivra Team" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
        from: fromAddress,
        to,
        subject,
        html,
    };

    // Retry logic: 3 attempts with exponential backoff
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const info = await transport.sendMail(mailOptions);
            console.log(`✉️  Email sent to ${to} (attempt ${attempt}). MessageID: ${info.messageId}`);
            return info;
        } catch (error) {
            lastError = error;
            console.error(`❌ Email attempt ${attempt}/${MAX_RETRIES} to ${to} failed:`, error.message);

            if (attempt < MAX_RETRIES) {
                // Reset the transporter if it's a connection error
                if (error.code === 'ESOCKET' || error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
                    console.log('🔄 Resetting transporter due to connection error...');
                    transporter = null;
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = 1000 * Math.pow(2, attempt - 1);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries exhausted
    console.error(`❌ All ${MAX_RETRIES} email attempts to ${to} failed. Last error: ${lastError.message}`);
    throw new Error(`Email could not be sent after ${MAX_RETRIES} attempts: ${lastError.message}`);
};

module.exports = sendEmail;
