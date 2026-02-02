const { sendError, sendNotFound } = require('../utils/responseHelper');
const logger = require('../config/logger');
const {
    getNotificationsService,
    markAsReadService,
    markAllAsReadService,
    deleteNotificationService,
    clearAllNotificationsService
} = require('../services/notificationService');
const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
    try {
        const result = await getNotificationsService(req.user, req.query);
        res.json(result);
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Get unread notification count
// @route  GET /api/notifications/unread-count
// @access Private
const getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({ unreadCount });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Mark a notification as read
// @route  PUT /api/notifications/:id/read
// @access Private
const markAsRead = async (req, res) => {
    try {
        const notification = await markAsReadService(req.user, req.params.id);
        if (!notification) {
            return sendNotFound(res, 'Notification');
        }
        res.json({ message: 'Notification marked as read', notification });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Mark all notifications as read
// @route  PUT /api/notifications/read-all
// @access Private
const markAllAsRead = async (req, res) => {
    try {
        const result = await markAllAsReadService(req.user);
        res.json({ 
            message: 'All notifications marked as read', 
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Delete a notification
// @route  DELETE /api/notifications/:id
// @access Private
const deleteNotification = async (req, res) => {
    try {
        const notification = await deleteNotificationService(req.user, req.params.id);
        if (!notification) {
            return sendNotFound(res, 'Notification');
        }
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Clear all notifications
// @route  DELETE /api/notifications/clear-all
// @access Private
const clearAllNotifications = async (req, res) => {
    try {
        const result = await clearAllNotificationsService(req.user);
        res.json({ 
            message: 'All notifications cleared', 
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// Helper function to create a notification (used by other controllers)
const createNotification = async (data) => {
    try {
        const notification = new Notification(data);
        await notification.save();
        return notification;
    } catch (error) {
        logger.error('Error creating notification:', error);
        return null;
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    createNotification
};
