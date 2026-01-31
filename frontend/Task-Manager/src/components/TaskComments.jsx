import React, { useState, useEffect, useContext, useCallback } from 'react';
import { LuSend, LuTrash2, LuMessageCircle } from 'react-icons/lu';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import logger from '../utils/logger';
import { UserContext } from '../context/userContext';
import MentionInput from './Inputs/MentionInput';
import moment from 'moment';

// Helper function to render text with highlighted mentions
const renderCommentText = (text, mentions = []) => {
    if (!mentions || mentions.length === 0) {
        return text;
    }

    // Create a regex pattern to match all mentioned names
    const mentionNames = mentions.map(m => m.name).filter(Boolean);
    if (mentionNames.length === 0) return text;

    // Escape special regex characters in names
    const escapedNames = mentionNames.map(name => 
        name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    
    const pattern = new RegExp(`@(${escapedNames.join('|')})`, 'g');
    const parts = text.split(pattern);

    return parts.map((part, index) => {
        // Check if this part is a mentioned name
        if (mentionNames.includes(part)) {
            return (
                <span 
                    key={index} 
                    className="text-primary font-medium bg-primary/10 px-1 rounded"
                >
                    @{part}
                </span>
            );
        }
        return part;
    });
};

const TaskComments = ({ taskId }) => {
    const { user } = useContext(UserContext);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [mentions, setMentions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(API_PATHS.TASKS.GET_COMMENTS(taskId));
            setComments(response.data.comments || []);
        } catch (error) {
            logger.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    const handleMentionsChange = useCallback((mentionIds) => {
        setMentions(mentionIds);
    }, []);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setSubmitting(true);
            const response = await axiosInstance.post(API_PATHS.TASKS.ADD_COMMENT(taskId), {
                text: newComment,
                mentions: mentions // Send mention user IDs
            });
            setComments(response.data.comments || []);
            setNewComment('');
            setMentions([]);
        } catch (error) {
            logger.error('Error adding comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            await axiosInstance.delete(API_PATHS.TASKS.DELETE_COMMENT(taskId, commentId));
            setComments(comments.filter(c => c._id !== commentId));
        } catch (error) {
            logger.error('Error deleting comment:', error);
        }
    };

    useEffect(() => {
        if (taskId) {
            fetchComments();
        }
    }, [taskId, fetchComments]);

    return (
        <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
                <LuMessageCircle className="text-lg text-primary" />
                <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300">
                    Comments ({comments.length})
                </h3>
            </div>

            {/* Comment Input with Mentions */}
            <form onSubmit={handleAddComment} className="flex gap-2 mb-4" aria-label="Add a comment">
                <MentionInput
                    value={newComment}
                    onChange={setNewComment}
                    onMentionsChange={handleMentionsChange}
                    placeholder="Add a comment... Use @ to mention someone"
                    taskId={taskId}
                    disabled={submitting}
                />
                <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <LuSend className="text-sm" />
                    {submitting ? 'Sending...' : 'Send'}
                </button>
            </form>

            {/* Comments List */}
            <div className="space-y-3 max-h-80 overflow-y-auto" role="list" aria-label="Comments list">
                {loading ? (
                    <p className="text-sm text-slate-500 dark:text-gray-400">Loading comments...</p>
                ) : comments.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment._id}
                            className="bg-slate-50 dark:bg-gray-800 rounded-lg p-3 border border-slate-100 dark:border-gray-700"
                            role="listitem"
                            aria-label={`Comment by ${comment.user?.name || 'Unknown User'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    {comment.user?.profileImageUrl ? (
                                        <img
                                            src={comment.user.profileImageUrl}
                                            alt={comment.user.name}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                                            {comment.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200">
                                            {comment.user?.name || 'Unknown User'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">
                                            {moment(comment.createdAt).fromNow()}
                                        </p>
                                    </div>
                                </div>
                                {(comment.user?._id === user?._id || user?.role === 'admin') && (
                                    <button
                                        onClick={() => handleDeleteComment(comment._id)}
                                        className="text-slate-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                                        title="Delete comment"
                                        aria-label="Delete comment"
                                        tabIndex={0}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleDeleteComment(comment._id);
                                            }
                                        }}
                                    >
                                        <LuTrash2 className="text-sm" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <p className="mt-2 text-sm text-slate-600 dark:text-gray-300 pl-10">
                                {renderCommentText(comment.text, comment.mentions)}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TaskComments;
