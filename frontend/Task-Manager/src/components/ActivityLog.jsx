import React, { useState, useEffect } from 'react';
import { LuClipboardCheck, LuUsers, LuMessageCircle, LuTag, LuSquarePlus, LuSettings } from 'react-icons/lu';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import logger from '../utils/logger';
import moment from 'moment';

const activityIcons = {
    created: LuSquarePlus,
    updated: LuSettings,
    status_changed: LuClipboardCheck,
    priority_changed: LuClipboardCheck,
    assigned: LuUsers,
    unassigned: LuUsers,
    comment_added: LuMessageCircle,
    attachment_added: LuClipboardCheck,
    label_added: LuTag,
    label_removed: LuTag,
    checklist_updated: LuClipboardCheck,
};

const activityColors = {
    created: 'bg-green-100 text-green-600',
    updated: 'bg-blue-100 text-blue-600',
    status_changed: 'bg-purple-100 text-purple-600',
    priority_changed: 'bg-orange-100 text-orange-600',
    assigned: 'bg-cyan-100 text-cyan-600',
    unassigned: 'bg-red-100 text-red-600',
    comment_added: 'bg-yellow-100 text-yellow-600',
    attachment_added: 'bg-indigo-100 text-indigo-600',
    label_added: 'bg-pink-100 text-pink-600',
    label_removed: 'bg-gray-100 text-gray-600',
    checklist_updated: 'bg-lime-100 text-lime-600',
};

const ActivityLog = ({ taskId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const fetchActivityLog = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(API_PATHS.TASKS.GET_ACTIVITY_LOG(taskId));
            // Sort by most recent first
            const sortedActivities = (response.data.activityLog || []).sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            setActivities(sortedActivities);
        } catch (error) {
            logger.error('Error fetching activity log:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (taskId) {
            fetchActivityLog();
        }
    }, [taskId]);

    const displayedActivities = expanded ? activities : activities.slice(0, 5);

    const formatActivityMessage = (activity) => {
        let message = activity.details || activity.action.replace('_', ' ');
        
        if (activity.oldValue && activity.newValue) {
            message += `: ${activity.oldValue} → ${activity.newValue}`;
        }
        
        return message;
    };

    return (
        <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
                <LuClipboardCheck className="text-lg text-primary" />
                <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300">
                    Activity Log ({activities.length})
                </h3>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                    <p className="text-sm text-slate-500 dark:text-gray-400">Loading activity...</p>
                ) : activities.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-gray-400">No activity recorded yet.</p>
                ) : (
                    <>
                        {displayedActivities.map((activity, index) => {
                            const IconComponent = activityIcons[activity.action] || LuClipboardCheck;
                            const colorClass = activityColors[activity.action] || 'bg-gray-100 text-gray-600';

                            return (
                                <div
                                    key={activity._id || index}
                                    className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-gray-700 last:border-0"
                                >
                                    <div className={`p-1.5 rounded-full ${colorClass}`}>
                                        <IconComponent className="text-sm" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 dark:text-gray-300">
                                            <span className="font-medium">
                                                {activity.user?.name || 'Unknown'}
                                            </span>
                                            {' '}
                                            <span className="text-slate-600 dark:text-gray-400">
                                                {formatActivityMessage(activity)}
                                            </span>
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                                            {moment(activity.createdAt).fromNow()}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {activities.length > 5 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-sm text-primary hover:underline mt-2"
                            >
                                {expanded ? 'Show less' : `Show all (${activities.length})`}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
