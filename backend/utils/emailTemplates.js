/**
 * Email Template Utilities
 * Reusable components for email templates
 */

/**
 * Get the current year for copyright
 * @returns {number} Current year
 */
const getCurrentYear = () => new Date().getFullYear();

/**
 * Get common email CSS styles
 * @returns {string} CSS styles
 */
const getBaseStyles = () => `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; font-weight: bold; }
`;

/**
 * Generate header section with gradient
 * @param {string} title - Header title
 * @param {string} gradient - CSS gradient (default: orange to yellow)
 * @param {string} emoji - Optional emoji
 * @returns {string} Header HTML
 */
const getHeader = (title, gradient = 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)', emoji = '') => `
    <div class="header" style="background: ${gradient}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1>${emoji ? emoji + ' ' : ''}${title}</h1>
    </div>
`;

/**
 * Generate footer section
 * @param {string} customText - Optional custom text before copyright
 * @returns {string} Footer HTML
 */
const getFooter = (customText = 'This is an automated email. Please do not reply.') => `
    <div class="footer">
        <p>${customText}</p>
        <p>&copy; ${getCurrentYear()} Work Track. All rights reserved.</p>
    </div>
`;

/**
 * Generate OTP display box
 * @param {string} otp - OTP code
 * @param {string} color - Border/text color (default: primary orange)
 * @returns {string} OTP box HTML
 */
const getOTPBox = (otp, color = '#fc4a1a') => `
    <div class="otp-box" style="background: white; border: 2px dashed ${color}; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
        <div class="otp-code" style="font-size: 32px; font-weight: bold; color: ${color}; letter-spacing: 5px;">${otp}</div>
    </div>
    <p><strong>This OTP is valid for 10 minutes.</strong></p>
`;

/**
 * Generate warning/danger box
 * @param {string} title - Warning title
 * @param {string} message - Warning message
 * @param {string} type - 'warning' | 'danger' | 'info'
 * @returns {string} Warning box HTML
 */
const getAlertBox = (title, message, type = 'warning') => {
    const colors = {
        warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
        danger: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
        info: { bg: '#e0f2fe', border: '#0ea5e9', text: '#0c4a6e' },
    };
    const color = colors[type] || colors.warning;
    
    return `
        <div style="background: ${color.bg}; border-left: 4px solid ${color.border}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; color: ${color.text};">
            <strong>${title}</strong>
            <p style="margin: 5px 0 0 0;">${message}</p>
        </div>
    `;
};

/**
 * Generate a button
 * @param {string} text - Button text
 * @param {string} url - Button URL
 * @param {string} gradient - CSS gradient
 * @returns {string} Button HTML
 */
const getButton = (text, url, gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)') => `
    <center>
        <a href="${url}" class="btn" style="background: ${gradient}; color: white; display: inline-block; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px;">${text}</a>
    </center>
`;

/**
 * Generate task card for emails
 * @param {Object} options - Task options
 * @param {string} options.title - Task title
 * @param {Date} options.dueDate - Due date
 * @param {string} options.priority - Priority level
 * @returns {string} Task card HTML
 */
const getTaskCard = ({ title, dueDate, priority }) => {
    const priorityColors = {
        High: '#ef4444',
        Medium: '#f59e0b',
        Low: '#22c55e'
    };
    const priorityColor = priorityColors[priority] || '#6b7280';
    
    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 15px;">📋 ${title}</div>
            
            <div style="display: flex; align-items: center; margin: 10px 0;">
                <span style="color: #6b7280; font-size: 14px; min-width: 80px;">Due Date:</span>
                <span style="font-weight: 500; color: #ef4444;">${formattedDate}</span>
            </div>
            
            <div style="display: flex; align-items: center; margin: 10px 0;">
                <span style="color: #6b7280; font-size: 14px; min-width: 80px;">Priority:</span>
                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; background: ${priorityColor};">${priority}</span>
            </div>
        </div>
    `;
};

/**
 * Generate complete email HTML
 * @param {Object} options - Email options
 * @param {string} options.headerTitle - Header title
 * @param {string} options.headerGradient - Header gradient
 * @param {string} options.headerEmoji - Header emoji
 * @param {string} options.content - Main content HTML
 * @param {string} options.footerText - Custom footer text
 * @returns {string} Complete email HTML
 */
const buildEmailTemplate = ({ headerTitle, headerGradient, headerEmoji, content, footerText }) => `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            ${getBaseStyles()}
        </style>
    </head>
    <body>
        <div class="container">
            ${getHeader(headerTitle, headerGradient, headerEmoji)}
            <div class="content">
                ${content}
                ${getFooter(footerText)}
            </div>
        </div>
    </body>
    </html>
`;

// Predefined gradients for consistency
const GRADIENTS = {
    primary: 'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)',
    purple: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    danger: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
    success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
};

module.exports = {
    getCurrentYear,
    getBaseStyles,
    getHeader,
    getFooter,
    getOTPBox,
    getAlertBox,
    getButton,
    getTaskCard,
    buildEmailTemplate,
    GRADIENTS,
};
