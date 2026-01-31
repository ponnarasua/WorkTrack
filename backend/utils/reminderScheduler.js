const cron = require('node-cron');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { sendDueDateReminder } = require('./emailService');
const { TASK_STATUS } = require('./constants');
const logger = require('../config/logger');

/**
 * Check for tasks due in the next 24 hours and send reminder emails
 * to all assigned users who haven't received a reminder yet
 */
const checkDueDateReminders = async () => {
    try {
        const now = new Date();
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Find tasks that:
        // 1. Are not completed
        // 2. Have a due date within the next 24 hours
        // 3. Haven't had a reminder sent yet
        // 4. Due date is still in the future
        const tasksNeedingReminders = await Task.find({
            status: { $ne: TASK_STATUS.COMPLETED },
            dueDate: {
                $gt: now,
                $lte: twentyFourHoursFromNow
            },
            reminderSent: { $ne: true }
        }).populate('assignedTo', 'name email');

        logger.info(`[Reminder Scheduler] Found ${tasksNeedingReminders.length} tasks needing reminders`);

        for (const task of tasksNeedingReminders) {
            // Send reminder to each assigned user
            const reminderPromises = task.assignedTo.map(async (user) => {
                if (!user.email) return null;

                const taskUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/user/task-details/${task._id}`;

                try {
                    // Create in-app notification
                    await Notification.create({
                        recipient: user._id,
                        type: 'reminder',
                        title: 'Task Due Soon',
                        message: `"${task.title}" is due in less than 24 hours!`,
                        task: task._id
                    });

                    // Send email notification
                    await sendDueDateReminder(
                        user.email,
                        user.name,
                        task.title,
                        task.dueDate,
                        task.priority,
                        taskUrl
                    );
                    return { success: true, email: user.email, userId: user._id };
                } catch (error) {
                    logger.error(`[Reminder Scheduler] Failed to send reminder to ${user.email}:`, error.message);
                    return { success: false, email: user.email, error: error.message };
                }
            });

            const results = await Promise.all(reminderPromises);
            const successCount = results.filter(r => r?.success).length;

            // Mark task as reminder sent if at least one email was sent successfully
            if (successCount > 0) {
                await Task.findByIdAndUpdate(task._id, {
                    reminderSent: true,
                    reminderSentAt: new Date()
                });
                logger.info(`[Reminder Scheduler] Sent ${successCount} reminders for task: "${task.title}"`);
            }
        }

        return {
            success: true,
            tasksProcessed: tasksNeedingReminders.length
        };
    } catch (error) {
        logger.error('[Reminder Scheduler] Error checking due date reminders:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Initialize the reminder scheduler
 * Runs every hour to check for tasks due in 24 hours
 */
const initializeReminderScheduler = () => {
    // Run every hour at minute 0
    // Cron pattern: minute hour day-of-month month day-of-week
    // '0 * * * *' = At minute 0 of every hour
    const schedule = cron.schedule('0 * * * *', async () => {
        logger.info('[Reminder Scheduler] Running due date reminder check...');
        const result = await checkDueDateReminders();
        logger.info('[Reminder Scheduler] Check complete:', result);
    }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'UTC'
    });

    console.log('[Reminder Scheduler] Initialized - running hourly checks for due date reminders');

    // Also run immediately on startup to catch any pending reminders
    setTimeout(async () => {
        console.log('[Reminder Scheduler] Running initial check on startup...');
        const result = await checkDueDateReminders();
        console.log('[Reminder Scheduler] Initial check complete:', result);
    }, 5000); // Wait 5 seconds after server start

    return schedule;
};

/**
 * Manually trigger a reminder check (useful for testing or admin actions)
 */
const triggerReminderCheck = async () => {
    logger.info('[Reminder Scheduler] Manual trigger initiated...');
    return await checkDueDateReminders();
};

module.exports = {
    initializeReminderScheduler,
    checkDueDateReminders,
    triggerReminderCheck
};
