export const BASE_URL = import.meta.env.VITE_BASE_URL ;
export const API_PATHS = {
    AUTH: {
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        GET_PROFILE: '/api/auth/profile',
        SEND_REGISTRATION_OTP: '/api/auth/send-registration-otp',
        VERIFY_REGISTRATION_OTP: '/api/auth/verify-registration-otp',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password',
        DELETE_ACCOUNT_REQUEST: '/api/auth/delete-account-request',
        CONFIRM_DELETE_ACCOUNT: '/api/auth/confirm-delete-account',
    },

    USERS: {
        GET_ALL_USERS: '/api/users',
        GET_USER_BY_ID: (userId) => `/api/users/${userId}`,
        CREATE_USER: '/api/users',
        UPDATE_USER: (userId) => `/api/users/${userId}`,
        DELETE_USER: (userId) => `/api/users/${userId}`,
        SEARCH_USERS: '/api/users/search',
    },

    TASKS: {
        GET_DASHBOARD_DATA: '/api/tasks/dashboard-data',
        GET_USER_DASHBOARD_DATA: `/api/tasks/user-dashboard-data`,
        GET_ALL_TASKS: '/api/tasks',
        SEARCH_TASKS: '/api/tasks/search',
        GET_TASK_BY_ID: (taskId) => `/api/tasks/${taskId}`,
        CREATE_TASK: '/api/tasks',
        UPDATE_TASK: (taskId) => `/api/tasks/${taskId}`,
        DELETE_TASK: (taskId) => `/api/tasks/${taskId}`,

        UPDATE_TASK_STATUS: (taskId) => `/api/tasks/${taskId}/status`,
        UPDATE_TODO_CHECKLIST: (taskId) => `/api/tasks/${taskId}/todo`,
        DUPLICATE_TASK: (taskId) => `/api/tasks/${taskId}/duplicate`,

        // Comments
        GET_COMMENTS: (taskId) => `/api/tasks/${taskId}/comments`,
        ADD_COMMENT: (taskId) => `/api/tasks/${taskId}/comments`,
        DELETE_COMMENT: (taskId, commentId) => `/api/tasks/${taskId}/comments/${commentId}`,

        // Activity Log
        GET_ACTIVITY_LOG: (taskId) => `/api/tasks/${taskId}/activity`,

        // Labels
        GET_ALL_LABELS: '/api/tasks/labels/all',
        ADD_LABELS: (taskId) => `/api/tasks/${taskId}/labels`,
        REMOVE_LABEL: (taskId, label) => `/api/tasks/${taskId}/labels/${encodeURIComponent(label)}`,

        // Reminders
        TRIGGER_REMINDERS: '/api/tasks/reminders/trigger',
        SEND_REMINDER: (taskId) => `/api/tasks/${taskId}/send-reminder`,

        // Productivity
        GET_PRODUCTIVITY_STATS: '/api/tasks/productivity-stats',
        GET_TEAM_PRODUCTIVITY_STATS: '/api/tasks/team-productivity-stats',
    },

    NOTIFICATIONS: {
        GET_ALL: '/api/notifications',
        GET_UNREAD_COUNT: '/api/notifications/unread-count',
        MARK_AS_READ: (id) => `/api/notifications/${id}/read`,
        MARK_ALL_READ: '/api/notifications/read-all',
        DELETE: (id) => `/api/notifications/${id}`,
        CLEAR_ALL: '/api/notifications/clear-all',
    },

    REPORTS: {
        EXPORT_TASKS: '/api/reports/export/tasks',
        EXPORT_TASKS_PDF: '/api/reports/export/tasks/pdf',
        EXPORT_USERS: '/api/reports/export/users',
        EXPORT_TEAM_PRODUCTIVITY: '/api/reports/export/team-productivity',
        EXPORT_TEAM_PRODUCTIVITY_PDF: '/api/reports/export/team-productivity/pdf',
    },

    IMAGE : {
        UPLOAD_IMAGE: '/api/auth/upload-image',
    },
};
