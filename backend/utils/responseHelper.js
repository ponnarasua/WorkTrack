/**
 * Response Helper Utilities
 * Standardizes API responses across all controllers
 */
const logger = require('../config/logger');

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    const response = { success: true, message };
    if (data !== null) {
        // If data is an object, spread it; otherwise, add as 'data' property
        if (typeof data === 'object' && !Array.isArray(data)) {
            Object.assign(response, data);
        } else {
            response.data = data;
        }
    }
    return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Error} error - Original error object (for logging)
 */
const sendError = (res, message = 'Internal Server Error', statusCode = 500, error = null) => {
    if (error) {
        logger.error(`[Error] ${message}:`, error.message || error);
    }
    return res.status(statusCode).json({ success: false, message });
};

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {string} entity - Entity name (e.g., 'Task', 'User')
 */
const sendNotFound = (res, entity = 'Resource') => {
    return res.status(404).json({ success: false, message: `${entity} not found` });
};

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
const sendUnauthorized = (res, message = 'Unauthorized access') => {
    return res.status(401).json({ success: false, message });
};

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
const sendForbidden = (res, message = 'Access denied') => {
    return res.status(403).json({ success: false, message });
};

/**
 * Send a bad request response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendBadRequest = (res, message = 'Bad request') => {
    return res.status(400).json({ success: false, message });
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
const sendValidationError = (res, errors) => {
    return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors 
    });
};

module.exports = {
    sendSuccess,
    sendError,
    sendNotFound,
    sendUnauthorized,
    sendForbidden,
    sendBadRequest,
    sendValidationError,
};
