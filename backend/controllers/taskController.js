const Task = require('../models/Task');
const User = require('../models/User');
const logger = require('../config/logger');
const { sendMentionNotification } = require('../utils/emailService');
const { triggerReminderCheck } = require('../utils/reminderScheduler');
const { createNotification } = require('./notificationController');
const { getOrgDomain, isPublicDomain, getFrontendUrl, buildTaskUrl } = require('../utils/domainHelper');
const { sendError, sendNotFound, sendForbidden, sendBadRequest } = require('../utils/responseHelper');
const { isAdmin } = require('../utils/authHelper');
const { sanitizeInput, validateName } = require('../utils/validation');

// Helper function to add activity log
const addActivityLog = (task, userId, action, details = '', oldValue = '', newValue = '') => {
    task.activityLog.push({
        user: userId,
        action,
        details,
        oldValue,
        newValue
    });
};


// @desc   Get all tasks (Admin: all, User: only assigned tasks)
// @route  GET /api/tasks
// @access Private
const { getTasksService } = require('../services/taskService');
const getTasks = async (req, res) => {
    try {
        // Parse query params
        const q = req.query.q || '';
        const status = req.query.status || '';
        const priority = req.query.priority || '';
        const assignee = req.query.assignee || '';
        const dueDateFrom = req.query.dueDateFrom || '';
        const dueDateTo = req.query.dueDateTo || '';
        const pageNum = parseInt(req.query.page) || 1;
        const limitNum = parseInt(req.query.limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        let filter = {};
        let tasks = [];
        let totalTasks = 0;

        // Build filter
        if (q) {
            filter.title = { $regex: q, $options: 'i' };
        }
        if (status) {
            filter.status = status;
        }
        if (priority) {
            filter.priority = priority;
        }
        if (assignee) {
            filter.assignedTo = assignee;
        }
        if (dueDateFrom || dueDateTo) {
            filter.dueDate = {};
            if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
            if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
        }

        if (isAdmin(req.user)) {
            const domain = getOrgDomain(req.user.email);
            if (isPublicDomain(domain)) {
                return sendForbidden(res, 'Admin access restricted for public domains.');
            }
            totalTasks = await Task.countDocuments(filter);
            tasks = await Task.find(filter)
                .populate({
                    path: 'assignedTo',
                    select: 'name email profileImageUrl',
                    match: { email: { $regex: `@${domain}$`, $options: 'i' } },
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();
            tasks = tasks.filter(task => task.assignedTo && task.assignedTo.length > 0);
        } else {
            // Non-admin can only search their own tasks
            filter.assignedTo = req.user._id;
            totalTasks = await Task.countDocuments(filter);
            tasks = await Task.find(filter)
                .populate('assignedTo', 'name email profileImageUrl')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();
        }

        // Add completed checklist count
        tasks = tasks.map((task) => {
            const completedCount = task.todoChecklist?.filter(item => item.completed).length || 0;
            return { ...task, completedCount };
        });

        const totalPages = Math.ceil(totalTasks / limitNum);

        res.json({
            tasks,
            query: q,
            filters: { status, priority, assignee, dueDateFrom, dueDateTo },
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: totalTasks,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
            },
        });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Get task by ID
// @route  GET /api/tasks/:id
// @access Private
const getTaskById = async (req, res) => {
    try {
        const taskId = sanitizeInput(req.params.id);
        const task = await Task.findById(taskId).populate("assignedTo", "name email profileImageUrl");

        if (!task) return sendNotFound(res, 'Task');

        if (isAdmin(req.user)) {
            const domain = getOrgDomain(req.user.email);
            if (
                isPublicDomain(domain) ||
                !task.assignedTo?.some(user => user.email.endsWith(`@${domain}`))
            ) {
                return sendForbidden(res, 'Unauthorized for this task');
            }
        } else if (!task.assignedTo.some(user => user._id.equals(req.user._id))) {
            return sendForbidden(res, 'Unauthorized');
        }

        res.json(task);
    } catch (error) {
        logger.error('❌ Error in getTaskById:', error);
        sendError(res, 'Server error', 500, error);
    }
};


// @desc   Create a new task (Admin only)
// @route  POST /api/tasks/
// @access Private (Admin only)
const createTask = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return sendForbidden(res, 'Only admins can create tasks.');
        }

        const domain = getOrgDomain(req.user.email);
        if (isPublicDomain(domain)) {
            return sendForbidden(res, 'Admins from public domains cannot assign tasks.');
        }

        // Sanitize and validate input
        let { title, description, priority, dueDate, assignedTo, attachments, todoChecklist, labels } = req.body;
        title = sanitizeInput(title);
        description = sanitizeInput(description);
        priority = sanitizeInput(priority);
        dueDate = sanitizeInput(dueDate);
        if (!Array.isArray(assignedTo)) {
            return sendBadRequest(res, 'assignedTo must be an array of user IDs');
        }
        assignedTo = assignedTo.map(id => sanitizeInput(id));
        if (labels) labels = labels.map(l => sanitizeInput(l));
        if (attachments) attachments = attachments.map(a => sanitizeInput(a));
        if (todoChecklist) todoChecklist = todoChecklist.map(item => ({
            text: sanitizeInput(item.text),
            completed: !!item.completed
        }));

        const users = await require('../models/User').find({ _id: { $in: assignedTo } });

        // Check if all assigned users belong to the same domain
        const invalidUsers = users.filter(u => !u.email.endsWith(`@${domain}`));
        if (invalidUsers.length > 0) {
            return sendBadRequest(res, 'One or more users do not belong to your organization');
        }

        const task = await Task.create({
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            createdBy: req.user._id,
            todoChecklist,
            attachments,
            labels: labels || []
        });

        // Add activity log for task creation
        addActivityLog(task, req.user._id, 'created', `Task "${title}" was created`);
        await task.save();

        // Create notifications for assigned users
        const assigner = await User.findById(req.user._id).select('name');
        for (const userId of assignedTo) {
                if (userId.toString() !== req.user._id.toString()) {
                        createNotification({
                                recipient: userId,
                                type: 'task_assigned',
                                title: 'New Task Assigned',
                                message: `${assigner.name} assigned you to "${title}"`,
                                task: task._id,
                                sender: req.user._id
                        });
                }
        }

        res.status(201).json({ message: 'Task created successfully', task });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Update a task
// @route  PUT /api/tasks/:id
// @access Private
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return sendNotFound(res, 'Task');

        // Track changes for activity log
        const changes = [];
        
        if (req.body.title && req.body.title !== task.title) {
            changes.push({ field: 'title', old: task.title, new: req.body.title });
        }
        if (req.body.priority && req.body.priority !== task.priority) {
            addActivityLog(task, req.user._id, 'priority_changed', 'Priority was changed', task.priority, req.body.priority);
        }
        if (req.body.status && req.body.status !== task.status) {
            addActivityLog(task, req.user._id, 'status_changed', 'Status was changed', task.status, req.body.status);
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attachments = req.body.attachments || task.attachments;

        // Handle labels update
        if (req.body.labels !== undefined) {
            task.labels = req.body.labels;
        }

        if (req.body.assignedTo) {
            if (!Array.isArray(req.body.assignedTo)) {
                return sendBadRequest(res, 'assignedTo must be an array');
            }
            addActivityLog(task, req.user._id, 'assigned', 'Task assignment was updated');
            task.assignedTo = req.body.assignedTo;
        }

        if (changes.length > 0) {
            addActivityLog(task, req.user._id, 'updated', 'Task was updated');
        }

        const updatedTask = await task.save();
        res.json({ message: 'Task updated successfully', updatedTask });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Delete a task (Admin only)
// @route  DELETE /api/tasks/:id
// @access Private (Admin only)
const deleteTask = async (req, res) => {
    try{
        const task = await Task.findById(req.params.id);

        if (!task) return sendNotFound(res, 'Task');

        await task.deleteOne();
        res.json({ message: 'Task deleted successfully' });

    }catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Update task status
// @route  PUT /api/tasks/:id/status
// @access Private
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return sendNotFound(res, 'Task');

        const isAssigned = task.assignedTo?.toString() === req.user._id.toString();

        if (!isAssigned && !isAdmin(req.user)) {
            return sendForbidden(res, 'You are not authorized to update this task');
        }

        const oldStatus = task.status;
        task.status = req.body.status || task.status;

        // Log status change
        if (oldStatus !== task.status) {
            addActivityLog(task, req.user._id, 'status_changed', 'Status was changed', oldStatus, task.status);
        }

        if (task.status === 'Completed') {
            task.todoChecklist.forEach((item) => (item.completed = true));
            task.progress = 100;
        }

        const updatedTask = await task.save();

        res.json({ message: 'Task updated successfully', updatedTask });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};



// @desc   Update task checklist
// @route  PUT /api/tasks/:id/todo
// @access Private
const updateTaskChecklist = async (req, res) => {
    try{
        const { todoChecklist } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return sendNotFound(res, 'Task');

        if(!task.assignedTo.includes(req.user._id) && !isAdmin(req.user)){
            return sendForbidden(res, 'You are not authorized to update this task');
        }   
        task.todoChecklist = todoChecklist ;

        // Auto-update progress based on checklist completion
        const completedCount = task.todoChecklist.filter(
            (item) => item.completed
        ).length;
        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? Math.round((completedCount/totalItems)*100):0 ; 

        // Auto-mark task as completed if all items are checked
        if(task.progress === 100){
            task.status = "Completed";
        }else if(task.progress > 0){
            task.status = "In Progress";
        }else{
            task.status = "Pending";
        }

        await task.save();
        const updatedTask = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        )

        res.json({message : "Task checklist updated", task : updatedTask});
    }catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   dashboard data (Admin Only)
// @route  GET /api/tasks/dashboard-data
// @access Private (Admin only)
const getDashboardData = async (req, res) => {
  try {
    const domain = getOrgDomain(req.user.email);
    if (!isAdmin(req.user) || isPublicDomain(domain)) {
      return sendForbidden(res, 'Unauthorized to access dashboard data');
    }

    const tasks = await Task.find()
      .populate({
        path: 'assignedTo',
        select: 'email',
        match: { email: { $regex: `@${domain}$`, $options: 'i' } }
      });

    const filteredTasks = tasks.filter(t => t.assignedTo);

    const totalTasks = filteredTasks.length;
    const pendingTasks = filteredTasks.filter(t => t.status === 'Pending').length;
    const completedTasks = filteredTasks.filter(t => t.status === 'Completed').length;
    const overdueTasks = filteredTasks.filter(t =>
      t.status !== 'Completed' && t.dueDate && t.dueDate < new Date()).length;

    const taskStatuses = ['Pending', 'In Progress', 'Completed'];
    const taskDistribution = taskStatuses.reduce((acc, status) => {
      acc[status.replace(/\s/g, '')] = filteredTasks.filter(t => t.status === status).length;
      return acc;
    }, { All: totalTasks });

    const taskPriorities = ['Low', 'Medium', 'High'];
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] = filteredTasks.filter(t => t.priority === priority).length;
      return acc;
    }, {});

    const recentTasks = filteredTasks
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
      }));

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });

  } catch (error) {
    sendError(res, 'Server error', 500, error);
  }
};

// @desc   dashboard data (User-specific)
// @route  GET /api/tasks/user-dashboard-data
// @access Private
const getUserDashboardData = async (req, res) => {
    try{
        const userId = req.user._id;

        // Fetch statistics for user-specific tasks
        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: 'Pending' });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: 'Completed' });
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: 'Completed' },
            dueDate: { $lt: new Date() },
        });

        // Task Distribution by status
        const taskStatuses = ['Pending', 'In Progress', 'Completed']; 
        const taskDistributionRaw = await Task.aggregate([
            { $match : { assignedTo : userId } },
            { $group : { _id : '$status', count : { $sum : 1 } } },
        ]);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedkey = status.replace(/\s+/g, '');
            acc[formattedkey]= taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});
        taskDistribution["All"]= totalTasks;

        // Task Distribution by Priority 
        const taskPriorities = ['Low', 'Medium', 'High'];
        const taskPriorityLevelsRaw = await Task.aggregate([
            { $match : { assignedTo : userId } },
            { $group : { _id : '$priority', count : { $sum : 1 } } },
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority]= taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        //Fetch recently 10 tasks for the logged-in user 
        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                completedTasks,
                overdueTasks,
            },
            charts : {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });
    }catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Add a comment to a task
// @route  POST /api/tasks/:id/comments
// @access Private
const addComment = async (req, res) => {
    try {
        let { text, mentions = [] } = req.body;
        text = sanitizeInput(text);
        mentions = Array.isArray(mentions) ? mentions.map(id => sanitizeInput(id)) : [];
        const taskId = sanitizeInput(req.params.id);
        const task = await Task.findById(taskId);

        if (!task) return sendNotFound(res, 'Task');

        // Check authorization
        const isAssigned = task.assignedTo.some(id => id.equals(req.user._id));
        if (!isAssigned && !isAdmin(req.user)) {
            return sendForbidden(res, 'You are not authorized to comment on this task');
        }

        if (!text || text.trim() === '') {
            return sendBadRequest(res, 'Comment text is required');
        }

        const comment = {
            user: req.user._id,
            text: text.trim(),
            mentions: mentions // Array of user IDs
        };

        task.comments.push(comment);
        addActivityLog(task, req.user._id, 'comment_added', 'A comment was added');

        await task.save();

        // Send notification emails to mentioned users (async, don't wait)
        if (mentions.length > 0) {
            const mentionedUsers = await User.find({ _id: { $in: mentions } }).select('name email');
            const commenter = await User.findById(req.user._id).select('name');
            
            mentionedUsers.forEach(mentionedUser => {
                // Don't notify yourself
                if (mentionedUser._id.toString() !== req.user._id.toString()) {
                    // Create in-app notification
                    createNotification({
                        recipient: mentionedUser._id,
                        type: 'mention',
                        title: 'You were mentioned in a comment',
                        message: `${commenter.name} mentioned you in a comment on "${task.title}"`,
                        task: task._id,
                        sender: req.user._id
                    });

                    // Send email notification
                    sendMentionNotification(
                        mentionedUser.email,
                        mentionedUser.name,
                        commenter.name,
                        task.title,
                        text.trim(),
                        buildTaskUrl(task._id)
                    ).catch(err => logger.error('Error sending mention notification:', err));
                }
            });
        }

        // Populate the user info for the response
        const updatedTask = await Task.findById(taskId)
            .populate('comments.user', 'name email profileImageUrl')
            .populate('comments.mentions', 'name email profileImageUrl')
            .populate('activityLog.user', 'name email profileImageUrl');

        res.status(201).json({ 
            message: 'Comment added successfully', 
            comments: updatedTask.comments 
        });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Get comments for a task
// @route  GET /api/tasks/:id/comments
// @access Private
const getComments = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('comments.user', 'name email profileImageUrl')
            .populate('comments.mentions', 'name email profileImageUrl');

        if (!task) return sendNotFound(res, 'Task');

        res.json({ comments: task.comments });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Delete a comment from a task
// @route  DELETE /api/tasks/:id/comments/:commentId
// @access Private
const deleteComment = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) return sendNotFound(res, 'Task');

        const comment = task.comments.id(req.params.commentId);

        if (!comment) return sendNotFound(res, 'Comment');

        // Only the comment author or admin can delete
        if (!comment.user.equals(req.user._id) && !isAdmin(req.user)) {
            return sendForbidden(res, 'You can only delete your own comments');
        }

        task.comments.pull(req.params.commentId);
        await task.save();

        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Get activity log for a task
// @route  GET /api/tasks/:id/activity
// @access Private
const getActivityLog = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('activityLog.user', 'name email profileImageUrl');

        if (!task) return sendNotFound(res, 'Task');

        res.json({ activityLog: task.activityLog });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Add labels to a task
// @route  POST /api/tasks/:id/labels
// @access Private (Admin only)
const addLabels = async (req, res) => {
    try {
        let { labels } = req.body;
        labels = Array.isArray(labels) ? labels.map(l => sanitizeInput(l)) : [];
        const taskId = sanitizeInput(req.params.id);
        const task = await Task.findById(taskId);

        if (!task) return sendNotFound(res, 'Task');

        if (!Array.isArray(labels)) {
            return sendBadRequest(res, 'Labels must be an array');
        }

        // Add new labels without duplicates
        const newLabels = labels.filter(label => !task.labels.includes(label.trim()));
        task.labels.push(...newLabels.map(l => l.trim()));

        if (newLabels.length > 0) {
            addActivityLog(task, req.user._id, 'label_added', `Labels added: ${newLabels.join(', ')}`);
        }

        await task.save();

        res.json({ message: 'Labels added successfully', labels: task.labels });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Remove a label from a task
// @route  DELETE /api/tasks/:id/labels/:label
// @access Private (Admin only)
const removeLabel = async (req, res) => {
    try {
        const taskId = sanitizeInput(req.params.id);
        const labelToRemove = sanitizeInput(decodeURIComponent(req.params.label));
        const task = await Task.findById(taskId);

        if (!task) return sendNotFound(res, 'Task');

        const labelIndex = task.labels.indexOf(labelToRemove);
        if (labelIndex === -1) {
            return sendNotFound(res, 'Label');
        }

        task.labels.splice(labelIndex, 1);
        addActivityLog(task, req.user._id, 'label_removed', `Label removed: ${labelToRemove}`);

        await task.save();

        res.json({ message: 'Label removed successfully', labels: task.labels });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Get all unique labels used in tasks
// @route  GET /api/tasks/labels/all
// @access Private
const getAllLabels = async (req, res) => {
    try {
        const labels = await Task.distinct('labels');
        res.json({ labels: labels.filter(l => l) }); // Filter out null/empty
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Manually trigger due date reminder check (Admin only)
// @route  POST /api/tasks/reminders/trigger
// @access Private (Admin)
const triggerReminders = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return sendForbidden(res, 'Access denied. Admin only.');
        }

        const result = await triggerReminderCheck();
        res.json({
            message: 'Reminder check triggered successfully',
            result
        });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Send reminder for a specific task
// @route  POST /api/tasks/:id/send-reminder
// @access Private (Admin)
const sendTaskReminder = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return sendForbidden(res, 'Access denied. Admin only.');
        }

        const task = await Task.findById(req.params.id).populate('assignedTo', 'name email');
        
        if (!task) {
            return sendNotFound(res, 'Task');
        }

        if (task.status === 'Completed') {
            return sendBadRequest(res, 'Cannot send reminder for completed task');
        }

        const { sendDueDateReminder } = require('../utils/emailService');
        const Notification = require('../models/Notification');
        
        let sentCount = 0;
        const taskUrl = buildTaskUrl(task._id);

        for (const user of task.assignedTo) {
            if (!user.email) continue;

            try {
                // Create in-app notification
                await Notification.create({
                    recipient: user._id,
                    type: 'reminder',
                    title: 'Task Reminder',
                    message: `Reminder: "${task.title}" needs your attention!`,
                    task: task._id,
                    sender: req.user._id
                });

                // Send email
                await sendDueDateReminder(
                    user.email,
                    user.name,
                    task.title,
                    task.dueDate,
                    task.priority,
                    taskUrl
                );
                sentCount++;
            } catch (error) {
                logger.error(`Failed to send reminder to ${user.email}:`, error.message);
            }
        }

        res.json({
            message: `Reminder sent to ${sentCount} user(s)`,
            sentCount
        });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Duplicate a task (Admin only)
// @route  POST /api/tasks/:id/duplicate
// @access Private (Admin only)
const duplicateTask = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return sendForbidden(res, 'Only admins can duplicate tasks.');
        }

        const originalTask = await Task.findById(req.params.id);
        if (!originalTask) return sendNotFound(res, 'Task');

        const domain = getOrgDomain(req.user.email);
        if (isPublicDomain(domain)) {
            return sendForbidden(res, 'Admins from public domains cannot duplicate tasks.');
        }

        // Create new due date (7 days from now)
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + 7);

        // Duplicate the task with reset status and checklist
        const duplicatedTask = await Task.create({
            title: `${originalTask.title} (Copy)`,
            description: originalTask.description,
            priority: originalTask.priority,
            dueDate: newDueDate,
            assignedTo: originalTask.assignedTo,
            createdBy: req.user._id,
            todoChecklist: originalTask.todoChecklist?.map(item => ({
                text: item.text,
                completed: false // Reset checklist items
            })) || [],
            attachments: [], // Don't copy attachments
            labels: originalTask.labels || [],
            status: 'Pending', // Reset status
            progress: 0, // Reset progress
            reminderSent: false
        });

        // Add activity log for task creation
        addActivityLog(duplicatedTask, req.user._id, 'created', `Task duplicated from "${originalTask.title}"`);
        await duplicatedTask.save();

        res.status(201).json({ 
            message: 'Task duplicated successfully', 
            task: duplicatedTask 
        });
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Get user productivity statistics
// @route  GET /api/tasks/productivity-stats
// @access Private
const getProductivityStats = async (req, res) => {
    try {
        const { period = '30', userId: targetUserId } = req.query; // Days to analyze (7, 14, 30, 90)
        
        // If targetUserId is provided and user is admin, get stats for that user
        // Otherwise get stats for the current user
        let userId = req.user._id;
        if (targetUserId && isAdmin(req.user)) {
            userId = targetUserId;
        }
        const daysToAnalyze = parseInt(period) || 30;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysToAnalyze);
        startDate.setHours(0, 0, 0, 0);

        // Get all user's tasks
        const allTasks = await Task.find({ assignedTo: userId }).lean();
        
        // Get tasks completed in the period
        const completedInPeriod = allTasks.filter(task => 
            task.status === 'Completed' && 
            task.updatedAt >= startDate
        );

        // Get tasks created in the period
        const createdInPeriod = allTasks.filter(task => 
            task.createdAt >= startDate
        );

        // Calculate weekly breakdown for the period
        const weeklyData = [];
        const weeksToShow = Math.ceil(daysToAnalyze / 7);
        
        for (let i = 0; i < weeksToShow; i++) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - ((i + 1) * 7));
            weekStart.setHours(0, 0, 0, 0);
            
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - (i * 7));
            weekEnd.setHours(23, 59, 59, 999);

            const tasksCompletedThisWeek = allTasks.filter(task =>
                task.status === 'Completed' &&
                task.updatedAt >= weekStart &&
                task.updatedAt <= weekEnd
            ).length;

            const tasksCreatedThisWeek = allTasks.filter(task =>
                task.createdAt >= weekStart &&
                task.createdAt <= weekEnd
            ).length;

            weeklyData.unshift({
                week: `Week ${weeksToShow - i}`,
                weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                completed: tasksCompletedThisWeek,
                created: tasksCreatedThisWeek
            });
        }

        // Calculate average completion time (for completed tasks with activity log)
        let avgCompletionTime = 0;
        const completedTasksWithTime = allTasks.filter(task => 
            task.status === 'Completed' && task.createdAt && task.updatedAt
        );
        
        if (completedTasksWithTime.length > 0) {
            const totalTime = completedTasksWithTime.reduce((sum, task) => {
                const created = new Date(task.createdAt);
                const completed = new Date(task.updatedAt);
                return sum + (completed - created);
            }, 0);
            avgCompletionTime = Math.round(totalTime / completedTasksWithTime.length / (1000 * 60 * 60 * 24)); // Days
        }

        // On-time completion rate
        const completedTasks = allTasks.filter(t => t.status === 'Completed');
        const onTimeCompletions = completedTasks.filter(task => 
            task.dueDate && new Date(task.updatedAt) <= new Date(task.dueDate)
        ).length;
        const onTimeRate = completedTasks.length > 0 
            ? Math.round((onTimeCompletions / completedTasks.length) * 100) 
            : 0;

        // Current streak (consecutive days with at least one task completed)
        let currentStreak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        while (true) {
            const dayStart = new Date(checkDate);
            const dayEnd = new Date(checkDate);
            dayEnd.setHours(23, 59, 59, 999);
            
            const completedOnDay = allTasks.some(task =>
                task.status === 'Completed' &&
                new Date(task.updatedAt) >= dayStart &&
                new Date(task.updatedAt) <= dayEnd
            );
            
            if (completedOnDay) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
            
            // Don't check more than 365 days
            if (currentStreak > 365) break;
        }

        // Tasks by priority completed
        const completedByPriority = {
            High: completedInPeriod.filter(t => t.priority === 'High').length,
            Medium: completedInPeriod.filter(t => t.priority === 'Medium').length,
            Low: completedInPeriod.filter(t => t.priority === 'Low').length
        };

        // Checklist completion rate
        let checklistStats = { total: 0, completed: 0 };
        allTasks.forEach(task => {
            if (task.todoChecklist && task.todoChecklist.length > 0) {
                checklistStats.total += task.todoChecklist.length;
                checklistStats.completed += task.todoChecklist.filter(item => item.completed).length;
            }
        });
        const checklistCompletionRate = checklistStats.total > 0 
            ? Math.round((checklistStats.completed / checklistStats.total) * 100)
            : 0;

        // Overdue tasks
        const overdueTasks = allTasks.filter(task =>
            task.status !== 'Completed' &&
            task.dueDate &&
            new Date(task.dueDate) < new Date()
        ).length;

        // Productivity score (0-100) - weighted calculation
        const totalTaskWeight = Math.min(allTasks.length / 10, 1) * 20; // Up to 20 points for task volume
        const completionRateWeight = (completedTasks.length / Math.max(allTasks.length, 1)) * 25; // Up to 25 points
        const onTimeWeight = onTimeRate * 0.25; // Up to 25 points
        const streakWeight = Math.min(currentStreak / 7, 1) * 15; // Up to 15 points for week streak
        const checklistWeight = checklistCompletionRate * 0.15; // Up to 15 points
        
        const productivityScore = Math.min(100, Math.round(
            totalTaskWeight + completionRateWeight + onTimeWeight + streakWeight + checklistWeight
        ));

        res.json({
            period: daysToAnalyze,
            summary: {
                totalTasks: allTasks.length,
                completedTasks: completedTasks.length,
                pendingTasks: allTasks.filter(t => t.status === 'Pending').length,
                inProgressTasks: allTasks.filter(t => t.status === 'In Progress').length,
                overdueTasks,
                productivityScore
            },
            periodStats: {
                tasksCompleted: completedInPeriod.length,
                tasksCreated: createdInPeriod.length,
                avgCompletionTime, // in days
                onTimeRate,
                currentStreak
            },
            completedByPriority,
            checklistStats: {
                total: checklistStats.total,
                completed: checklistStats.completed,
                rate: checklistCompletionRate
            },
            weeklyTrend: weeklyData
        });

    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc   Get team productivity statistics (Admin only)
// @route  GET /api/tasks/team-productivity-stats
// @access Private (Admin)
const getTeamProductivityStats = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return sendForbidden(res, 'Admin access required');
        }

        const { period = '30' } = req.query;
        const daysToAnalyze = parseInt(period) || 30;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysToAnalyze);
        startDate.setHours(0, 0, 0, 0);

        // Get organization domain
        const domain = getOrgDomain(req.user.email);
        if (isPublicDomain(domain)) {
            return sendForbidden(res, 'Admin access restricted for public domains.');
        }

        // Get all users in the organization (excluding admin)
        const orgUsers = await User.find({
            email: { $regex: `@${domain}$`, $options: 'i' },
            role: { $ne: 'admin' }
        }).select('_id name email profileImageUrl').lean();

        // Get productivity stats for each user
        const teamStats = await Promise.all(orgUsers.map(async (user) => {
            const allTasks = await Task.find({ assignedTo: user._id }).lean();
            
            const completedTasks = allTasks.filter(t => t.status === 'Completed');
            const completedInPeriod = allTasks.filter(task => 
                task.status === 'Completed' && 
                task.updatedAt >= startDate
            );

            // On-time completion rate
            const onTimeCompletions = completedTasks.filter(task => 
                task.dueDate && new Date(task.updatedAt) <= new Date(task.dueDate)
            ).length;
            const onTimeRate = completedTasks.length > 0 
                ? Math.round((onTimeCompletions / completedTasks.length) * 100) 
                : 0;

            // Overdue tasks
            const overdueTasks = allTasks.filter(task =>
                task.status !== 'Completed' &&
                task.dueDate &&
                new Date(task.dueDate) < new Date()
            ).length;

            // Checklist stats
            let checklistTotal = 0;
            let checklistCompleted = 0;
            allTasks.forEach(task => {
                if (task.todoChecklist && task.todoChecklist.length > 0) {
                    checklistTotal += task.todoChecklist.length;
                    checklistCompleted += task.todoChecklist.filter(item => item.completed).length;
                }
            });

            // Current streak
            let currentStreak = 0;
            let checkDate = new Date();
            checkDate.setHours(0, 0, 0, 0);
            
            while (currentStreak < 365) {
                const dayStart = new Date(checkDate);
                const dayEnd = new Date(checkDate);
                dayEnd.setHours(23, 59, 59, 999);
                
                const completedOnDay = allTasks.some(task =>
                    task.status === 'Completed' &&
                    new Date(task.updatedAt) >= dayStart &&
                    new Date(task.updatedAt) <= dayEnd
                );
                
                if (completedOnDay) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }

            // Calculate productivity score
            const totalTaskWeight = Math.min(allTasks.length / 10, 1) * 20;
            const completionRateWeight = (completedTasks.length / Math.max(allTasks.length, 1)) * 25;
            const onTimeWeight = onTimeRate * 0.25;
            const streakWeight = Math.min(currentStreak / 7, 1) * 15;
            const checklistRate = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;
            const checklistWeight = checklistRate * 0.15;
            
            const productivityScore = Math.min(100, Math.round(
                totalTaskWeight + completionRateWeight + onTimeWeight + streakWeight + checklistWeight
            ));

            return {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    profileImageUrl: user.profileImageUrl
                },
                totalTasks: allTasks.length,
                completedTasks: completedTasks.length,
                completedInPeriod: completedInPeriod.length,
                pendingTasks: allTasks.filter(t => t.status === 'Pending').length,
                inProgressTasks: allTasks.filter(t => t.status === 'In Progress').length,
                overdueTasks,
                onTimeRate,
                currentStreak,
                productivityScore
            };
        }));

        // Sort by productivity score (highest first)
        teamStats.sort((a, b) => b.productivityScore - a.productivityScore);

        // Calculate team averages
        const teamAverage = {
            avgProductivityScore: teamStats.length > 0 
                ? Math.round(teamStats.reduce((sum, s) => sum + s.productivityScore, 0) / teamStats.length) 
                : 0,
            totalCompleted: teamStats.reduce((sum, s) => sum + s.completedInPeriod, 0),
            avgOnTimeRate: teamStats.length > 0 
                ? Math.round(teamStats.reduce((sum, s) => sum + s.onTimeRate, 0) / teamStats.length) 
                : 0,
            totalOverdue: teamStats.reduce((sum, s) => sum + s.overdueTasks, 0)
        };

        res.json({
            period: daysToAnalyze,
            teamSize: teamStats.length,
            teamAverage,
            members: teamStats
        });

    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

const { searchTasksService } = require('../services/taskSearchService');

// Controller for searching tasks (delegates to service)
const searchTasks = async (req, res) => {
    try {
        const { tasks, totalTasks } = await searchTasksService(req.user, req.query);
        res.json({ tasks, totalTasks });
    } catch (error) {
        if (error.message && error.message.includes('Admin access restricted')) {
            return sendForbidden(res, error.message);
        }
        sendError(res, 'Server error', 500, error);
    }
};

module.exports = {
    getTasks,
    searchTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData,
    getProductivityStats,
    getTeamProductivityStats,
    addComment,
    getComments,
    deleteComment,
    getActivityLog,
    addLabels,
    removeLabel,
    getAllLabels,
    triggerReminders,
    sendTaskReminder,
    duplicateTask,
};