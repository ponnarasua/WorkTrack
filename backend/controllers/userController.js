const Task = require('../models/Task');
const User = require('../models/User');
const logger = require('../config/logger');
const { getOrgDomain, isPublicDomain } = require('../utils/domainHelper');
const { sendError, sendNotFound, sendForbidden } = require('../utils/responseHelper');
const { isAdmin } = require('../utils/authHelper');
const { USER_ROLES } = require('../utils/constants');
const { sanitizeInput, validateName, validateEmail } = require('../utils/validation');

// @desc Get all users (Admin only)
// @route GET /api/users/
// @access Private (Admin)
const { getUsersService } = require('../services/userService');
async function getUsers(req, res) {
    try {
        const usersWithTaskCounts = await getUsersService(req.user);
        res.json(usersWithTaskCounts);
    } catch (error) {
        if (error.message && error.message.includes('Access denied')) {
            return sendForbidden(res, error.message);
        }
        sendError(res, 'Server error', 500, error);
    }
}

// @desc Get user by ID
// @route GET /api/users/:id
// @access Private
const getUserById = async (req, res) => {
    try {
        const userId = sanitizeInput(req.params.id);
        const user =  await User.findById(userId).select("-password");
        if (!user)  return sendNotFound(res, 'User');
        res.json(user);
    } catch (error) {
        sendError(res, 'Server error', 500, error);
    }
};

// @desc Update user profile (own profile)
// @route PUT /api/users/:id
// @access Private
const updateUser = async (req, res) => {
    try {
        let { name, profileImageUrl } = req.body;
        const userId = sanitizeInput(req.params.id);

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return sendNotFound(res, 'User');
        }

        // Only allow users to update their own profile (or admins can update any)
        if (req.user._id.toString() !== userId && !isAdmin(req.user)) {
            return sendForbidden(res, 'Not authorized to update this profile');
        }

        // Validate and sanitize name
        if (name) {
            name = sanitizeInput(name);
            const nameError = validateName(name);
            if (nameError) {
                return res.status(400).json({ message: nameError });
            }
            user.name = name;
        }
        // Sanitize profileImageUrl
        if (profileImageUrl !== undefined) {
            user.profileImageUrl = sanitizeInput(profileImageUrl);
        }

        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(userId).select("-password");
        res.json({ message: "Profile updated successfully", user: updatedUser });

    } catch (error) {
        logger.error('Update user error:', error);
        sendError(res, 'Server error', 500, error);
    }
};

// @desc Search users for @mentions
// @route GET /api/users/search
// @access Private
const searchUsers = async (req, res) => {
    try {
        let { q, taskId } = req.query;
        // Sanitize query params
        q = q ? sanitizeInput(q) : '';
        taskId = taskId ? sanitizeInput(taskId) : undefined;
        const searchTerm = q.trim() || '';

        const userEmail = req.user.email;
        const domain = getOrgDomain(userEmail);

        // Build search query
        let searchFilter = {
            _id: { $ne: req.user._id }, // Exclude current user
        };

        // For non-public domains, restrict to same domain
        if (!isPublicDomain(domain)) {
            searchFilter.email = { $regex: `@${domain}$`, $options: 'i' };
        }

        // Add name search if query provided
        if (searchTerm) {
            searchFilter.name = { $regex: searchTerm, $options: 'i' };
        }

        // If taskId provided, prioritize users assigned to that task
        let users = [];
        if (taskId) {
            const Task = require('../models/Task');
            const task = await Task.findById(taskId).populate('assignedTo', 'name email profileImageUrl');
            
            if (task && task.assignedTo) {
                // Get assigned users that match the search
                const assignedUsers = task.assignedTo.filter(u => 
                    u._id.toString() !== req.user._id.toString() &&
                    (!searchTerm || u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                );

                // Get other users
                const otherUsers = await User.find({
                    ...searchFilter,
                    _id: { $nin: [...task.assignedTo.map(u => u._id), req.user._id] }
                })
                .select('name email profileImageUrl')
                .limit(10 - assignedUsers.length);

                users = [...assignedUsers, ...otherUsers];
            }
        } else {
            users = await User.find(searchFilter)
                .select('name email profileImageUrl')
                .limit(10);
        }

        res.json(users);

    } catch (error) {
        logger.error('Search users error:', error);
        sendError(res, 'Server error', 500, error);
    }
};

module.exports = { getUsers, getUserById, updateUser, searchUsers };