import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { LuTag, LuX, LuPlus } from 'react-icons/lu';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import logger from '../utils/logger';
import { UserContext } from '../context/userContext';
import { getLabelColor, SUGGESTED_LABELS } from '../utils/colors';

/**
 * TaskLabels component for displaying and managing task labels.
 *
 * @param {Object} props
 * @param {string} props.taskId - The ID of the task.
 * @param {string[]} [props.initialLabels] - Initial labels for the task.
 * @param {function} [props.onLabelsChange] - Callback when labels change.
 * @param {boolean} [props.readOnly] - If true, disables editing.
 */
const TaskLabels = ({ taskId, initialLabels = [], onLabelsChange, readOnly = false }) => {
    TaskLabels.propTypes = {
        taskId: PropTypes.string.isRequired,
        initialLabels: PropTypes.arrayOf(PropTypes.string),
        onLabelsChange: PropTypes.func,
        readOnly: PropTypes.bool,
    };
    const { user } = useContext(UserContext);
    const [labels, setLabels] = useState(initialLabels);
    const [newLabel, setNewLabel] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [allLabels, setAllLabels] = useState([]);
    const [loading, setLoading] = useState(false);

    const isAdmin = user?.role === 'admin';

    const fetchAllLabels = async () => {
        try {
            const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_LABELS);
            setAllLabels(response.data.labels || []);
        } catch (error) {
            logger.error('Error fetching labels:', error);
        }
    };

    useEffect(() => {
        setLabels(initialLabels);
    }, [initialLabels]);

    useEffect(() => {
        if (isAdmin) {
            fetchAllLabels();
        }
    }, [isAdmin]);

    const handleAddLabel = async (labelText) => {
        const trimmedLabel = labelText.trim();
        if (!trimmedLabel || labels.includes(trimmedLabel)) {
            setNewLabel('');
            setShowSuggestions(false);
            return;
        }

        try {
            setLoading(true);
            const response = await axiosInstance.post(API_PATHS.TASKS.ADD_LABELS(taskId), {
                labels: [trimmedLabel]
            });
            const updatedLabels = response.data.labels || [...labels, trimmedLabel];
            setLabels(updatedLabels);
            setNewLabel('');
            setShowSuggestions(false);
            if (onLabelsChange) onLabelsChange(updatedLabels);
        } catch (error) {
            logger.error('Error adding label:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveLabel = async (labelToRemove) => {
        try {
            setLoading(true);
            await axiosInstance.delete(API_PATHS.TASKS.REMOVE_LABEL(taskId, labelToRemove));
            const updatedLabels = labels.filter(l => l !== labelToRemove);
            setLabels(updatedLabels);
            if (onLabelsChange) onLabelsChange(updatedLabels);
        } catch (error) {
            logger.error('Error removing label:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddLabel(newLabel);
        }
    };

    // Filter suggestions based on input
    const filteredSuggestions = [...new Set([...SUGGESTED_LABELS, ...allLabels])]
        .filter(label => 
            label.toLowerCase().includes(newLabel.toLowerCase()) && 
            !labels.includes(label)
        )
        .slice(0, 6);

    return (
        <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
                <LuTag className="text-sm text-slate-500 dark:text-gray-400" aria-hidden="true" />
                <label className="text-xs font-medium text-slate-500 dark:text-gray-400" id="task-labels-label">Labels</label>
            </div>

            {/* Labels Display */}
            <div className="flex flex-wrap gap-2 mb-2" role="list" aria-labelledby="task-labels-label">
                {labels.length === 0 && readOnly ? (
                    <span className="text-sm text-slate-400 dark:text-gray-500">No labels</span>
                ) : (
                    labels.map((label) => {
                        const color = getLabelColor(label);
                        return (
                            <span
                                key={label}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${color.bg} ${color.text} ${color.border} border`}
                                role="listitem"
                                aria-label={`Label: ${label}`}
                            >
                                {label}
                                {isAdmin && !readOnly && (
                                    <button
                                        onClick={() => handleRemoveLabel(label)}
                                        className="hover:bg-white/50 rounded-full p-0.5 transition-colors"
                                        disabled={loading}
                                        aria-label={`Remove label ${label}`}
                                    >
                                        <LuX className="text-xs" aria-hidden="true" />
                                    </button>
                                )}
                            </span>
                        );
                    })
                )}
            </div>

            {/* Add Label Input (Admin only) */}
            {isAdmin && !readOnly && (
                <div className="relative">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => {
                                setNewLabel(e.target.value);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add a label..."
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            disabled={loading}
                            aria-label="Add a label"
                            aria-autocomplete="list"
                            aria-controls="label-suggestions-list"
                            aria-expanded={showSuggestions}
                        />
                        <button
                            onClick={() => handleAddLabel(newLabel)}
                            disabled={loading || !newLabel.trim()}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                        >
                            <LuPlus className="text-xs" />
                            Add
                        </button>
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && filteredSuggestions.length > 0 && (
                        <div
                            id="label-suggestions-list"
                            role="listbox"
                            className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                        >
                            {filteredSuggestions.map((suggestion, idx) => {
                                const color = getLabelColor(suggestion);
                                return (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleAddLabel(suggestion)}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-100"
                                        role="option"
                                        aria-selected="false"
                                        tabIndex={0}
                                    >
                                        <span className={`w-3 h-3 rounded-full ${color.bg}`}></span>
                                        {suggestion}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TaskLabels;
