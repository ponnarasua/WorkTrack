import React, { useState, useRef, useEffect, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import logger from '../../utils/logger';

const MentionInput = ({ 
    value, 
    onChange, 
    onMentionsChange,
    placeholder = "Add a comment... Use @ to mention someone",
    taskId,
    disabled = false,
    className = ""
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentions, setMentions] = useState([]); // Store mention data
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Search users when @ is detected
    const searchUsers = useCallback(async (query) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (taskId) params.append('taskId', taskId);
            
            const response = await axiosInstance.get(
                `${API_PATHS.USERS.SEARCH_USERS}?${params.toString()}`
            );
            setSuggestions(response.data || []);
        } catch (error) {
            logger.error('Error searching users:', error);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    // Debounced search
    useEffect(() => {
        if (showSuggestions) {
            const timeoutId = setTimeout(() => {
                searchUsers(mentionSearch);
            }, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [mentionSearch, showSuggestions, searchUsers]);

    // Handle input change
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        onChange(newValue);

        // Find if we're in a mention context
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            // Check if there's a space before @ (or @ is at start)
            const charBeforeAt = lastAtIndex > 0 ? newValue[lastAtIndex - 1] : ' ';
            
            // Only show suggestions if @ is preceded by space/start and no space after
            if ((charBeforeAt === ' ' || lastAtIndex === 0) && !textAfterAt.includes(' ')) {
                setMentionStartIndex(lastAtIndex);
                setMentionSearch(textAfterAt);
                setShowSuggestions(true);
                setSelectedIndex(0);
                return;
            }
        }
        
        setShowSuggestions(false);
        setMentionSearch('');
        setMentionStartIndex(-1);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
            case 'Tab':
                if (suggestions[selectedIndex]) {
                    e.preventDefault();
                    selectUser(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
            default:
                break;
        }
    };

    // Select a user from suggestions
    const selectUser = (user) => {
        const beforeMention = value.slice(0, mentionStartIndex);
        const afterCursor = value.slice(mentionStartIndex + mentionSearch.length + 1);
        const newValue = `${beforeMention}@${user.name} ${afterCursor}`;
        
        onChange(newValue);
        
        // Add to mentions list
        const newMentions = [...mentions, { id: user._id, name: user.name }];
        setMentions(newMentions);
        onMentionsChange?.(newMentions.map(m => m.id));
        
        setShowSuggestions(false);
        setMentionSearch('');
        setMentionStartIndex(-1);
        
        // Focus back to input
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                suggestionsRef.current && 
                !suggestionsRef.current.contains(e.target) &&
                inputRef.current &&
                !inputRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset mentions when value is cleared
    useEffect(() => {
        if (!value) {
            setMentions([]);
            onMentionsChange?.([]);
        }
    }, [value, onMentionsChange]);

    return (
        <div className="relative flex-1">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 ${className}`}
            />
            
            {/* Suggestions dropdown */}
            {showSuggestions && (
                <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                    {loading ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            Searching...
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                            No users found
                        </div>
                    ) : (
                        suggestions.map((user, index) => (
                            <button
                                key={user._id}
                                type="button"
                                onClick={() => selectUser(user)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors ${
                                    index === selectedIndex ? 'bg-slate-100 dark:bg-gray-700' : ''
                                }`}
                            >
                                {user.profileImageUrl ? (
                                    <img 
                                        src={user.profileImageUrl} 
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MentionInput;
