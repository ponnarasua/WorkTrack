import React, { useState, useEffect, useRef } from 'react';
import { LuBell, LuBellRing, LuCheck, LuCheckCheck, LuTrash2, LuX } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import logger from '../utils/logger';
import moment from 'moment';

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Fetch unread count on mount and periodically
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const response = await axiosInstance.get(API_PATHS.NOTIFICATIONS.GET_UNREAD_COUNT);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            logger.error('Error fetching unread count:', error);
        }
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(API_PATHS.NOTIFICATIONS.GET_ALL, {
                params: { limit: 50 }
            });
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            logger.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_AS_READ(id));
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            logger.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.put(API_PATHS.NOTIFICATIONS.MARK_ALL_READ);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            logger.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id, e) => {
        e.stopPropagation();
        try {
            await axiosInstance.delete(API_PATHS.NOTIFICATIONS.DELETE(id));
            const wasUnread = notifications.find(n => n._id === id)?.isRead === false;
            setNotifications(prev => prev.filter(n => n._id !== id));
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            logger.error('Error deleting notification:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification._id);
        }
        if (notification.task?._id) {
            navigate(`/user/task-details/${notification.task._id}`);
            setIsOpen(false);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'reminder':
                return <LuBellRing className="text-amber-500" />;
            case 'mention':
                return <span className="text-blue-500 font-bold text-sm">@</span>;
            case 'task_assigned':
                return <span className="text-green-500">📋</span>;
            case 'comment':
                return <span className="text-purple-500">💬</span>;
            default:
                return <LuBell className="text-gray-500" />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'reminder': return 'Reminder';
            case 'mention': return 'Mention';
            case 'task_assigned': return 'Assigned';
            case 'comment': return 'Comment';
            default: return 'Notification';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Notifications"
            >
                <LuBell className="text-2xl" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                    title="Mark all as read"
                                >
                                    <LuCheckCheck className="text-sm" />
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                                <LuBell className="text-4xl mb-2 opacity-50" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${
                                        notification.isRead
                                            ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                    }`}
                                >
                                    {/* Icon */}
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0 mt-0.5">
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                        notification.type === 'reminder' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        notification.type === 'mention' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                        {getTypeLabel(notification.type)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {moment(notification.createdAt).fromNow()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {!notification.isRead && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500" title="Unread"></div>
                                                )}
                                                <button
                                                    onClick={(e) => deleteNotification(notification._id, e)}
                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <LuX className="text-sm" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
