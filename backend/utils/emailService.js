const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const { 
    buildEmailTemplate, 
    getOTPBox, 
    getAlertBox, 
    getButton, 
    getTaskCard, 
    GRADIENTS 
} = require('./emailTemplates');

// Create transporter with improved timeout settings
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
        // Connection timeout settings
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,   // 10 seconds
        socketTimeout: 15000,     // 15 seconds
        // Enable connection pooling for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // TLS options for secure connections
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
    });
};

/**
 * Get mail from header
 * @returns {string} Mail from header
 */
const getMailFrom = () => `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`;

/**
 * Send OTP email for registration
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} name - User name
 */
const sendRegistrationOTP = async (email, otp, name = 'User') => {
    const transporter = createTransporter();

    const content = `
        <h2>Hello ${name},</h2>
        <p>Thank you for registering with Work Track. To complete your registration, please use the following OTP:</p>
        ${getOTPBox(otp, '#667eea')}
        <p>If you didn't request this registration, please ignore this email.</p>
    `;

    const mailOptions = {
        from: getMailFrom(),
        to: email,
        subject: 'Verify Your Email - Work Track',
        html: buildEmailTemplate({
            headerTitle: 'Welcome to Work Track!',
            headerGradient: GRADIENTS.purple,
            content,
        }),
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Registration OTP sent to ${email}`);
        return { success: true };
    } catch (error) {
        logger.error('Error sending registration OTP:', error);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Send OTP email for password reset
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} name - User name
 */
const sendPasswordResetOTP = async (email, otp, name = 'User') => {
    const transporter = createTransporter();

    const content = `
        <h2>Hello ${name},</h2>
        <p>We received a request to reset your password. Use the following OTP to proceed:</p>
        ${getOTPBox(otp, '#f5576c')}
        ${getAlertBox('⚠️ Security Notice', "If you didn't request this password reset, please ignore this email and ensure your account is secure.", 'warning')}
    `;

    const mailOptions = {
        from: getMailFrom(),
        to: email,
        subject: 'Password Reset OTP - Work Track',
        html: buildEmailTemplate({
            headerTitle: 'Password Reset Request',
            headerGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            content,
        }),
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Password reset OTP sent to ${email}`);
        return { success: true };
    } catch (error) {
        logger.error('Error sending password reset OTP:', error);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Send OTP email for account deletion
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} name - User name
 */
const sendAccountDeletionOTP = async (email, otp, name = 'User') => {
    const transporter = createTransporter();

    const content = `
        <h2>Hello ${name},</h2>
        <p>We received a request to delete your account. To confirm this action, please use the following OTP:</p>
        ${getOTPBox(otp, '#fc4a1a')}
        ${getAlertBox('⚠️ Warning', 'This action is permanent and cannot be undone. All your data will be permanently deleted.', 'danger')}
        <p>If you didn't request account deletion, please secure your account immediately and change your password.</p>
    `;

    const mailOptions = {
        from: getMailFrom(),
        to: email,
        subject: 'Account Deletion Verification - Work Track',
        html: buildEmailTemplate({
            headerTitle: 'Account Deletion Request',
            headerGradient: GRADIENTS.primary,
            content,
        }),
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Account deletion OTP sent to ${email}`);
        return { success: true };
    } catch (error) {
        logger.error('Error sending account deletion OTP:', error);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Send notification email when user is mentioned in a comment
 * @param {string} email - Recipient email
 * @param {string} recipientName - Name of the mentioned user
 * @param {string} mentionerName - Name of the user who mentioned
 * @param {string} taskTitle - Title of the task
 * @param {string} commentText - The comment text
 * @param {string} taskUrl - URL to the task
 */
const sendMentionNotification = async (email, recipientName, mentionerName, taskTitle, commentText, taskUrl) => {
    const transporter = createTransporter();

    const content = `
        <h2>Hi ${recipientName},</h2>
        <p><strong>${mentionerName}</strong> mentioned you in a comment on the task:</p>
        
        <p style="color: #667eea; font-weight: bold;">📋 ${taskTitle}</p>
        
        <div style="background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #555;">"${commentText}"</p>
        </div>
        
        ${getButton('View Task', taskUrl, GRADIENTS.purple)}
    `;

    const mailOptions = {
        from: getMailFrom(),
        to: email,
        subject: `${mentionerName} mentioned you in a comment - Work Track`,
        html: buildEmailTemplate({
            headerTitle: 'You were mentioned!',
            headerGradient: GRADIENTS.purple,
            headerEmoji: '📢',
            content,
        }),
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Mention notification sent to ${email}`);
        return { success: true };
    } catch (error) {
        logger.error('Error sending mention notification:', error);
        // Don't throw - mention notifications are non-critical
        return { success: false, error: error.message };
    }
};

/**
 * Send due date reminder email (24 hours before deadline)
 * @param {string} email - Recipient email
 * @param {string} recipientName - Name of the assigned user
 * @param {string} taskTitle - Title of the task
 * @param {Date} dueDate - Due date of the task
 * @param {string} priority - Task priority
 * @param {string} taskUrl - URL to the task
 */
const sendDueDateReminder = async (email, recipientName, taskTitle, dueDate, priority, taskUrl) => {
    const transporter = createTransporter();

    const content = `
        <h2>Hi ${recipientName},</h2>
        <p>Just a quick heads up about an upcoming task that needs your attention!</p>
        
        ${getTaskCard({ title: taskTitle, dueDate, priority })}
        
        ${getAlertBox("⚡ Don't forget!", 'Make sure to complete this task before the deadline to stay on track.', 'warning')}
        
        ${getButton('View Task Details', taskUrl, GRADIENTS.purple)}
    `;

    const mailOptions = {
        from: getMailFrom(),
        to: email,
        subject: `⏰ Reminder: "${taskTitle}" needs your attention - Work Track`,
        html: buildEmailTemplate({
            headerTitle: 'Task Deadline Reminder',
            headerGradient: GRADIENTS.warning,
            headerEmoji: '⏰',
            content,
            footerText: 'This is an automated reminder. Please do not reply.',
        }),
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Due date reminder sent to ${email} for task: ${taskTitle}`);
        return { success: true };
    } catch (error) {
        logger.error('Error sending due date reminder:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendRegistrationOTP,
    sendPasswordResetOTP,
    sendAccountDeletionOTP,
    sendMentionNotification,
    sendDueDateReminder,
};
