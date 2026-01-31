import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import logger from '../../utils/logger';
import { API_PATHS } from '../../utils/apiPaths';
import { LuFileSpreadsheet } from 'react-icons/lu';
import TaskStatusTabs from '../../components/TaskStatusTabs';
import TaskCard from '../../components/Cards/TaskCard';
import PriorityFilter from '../../components/PriorityFilter';
import TaskSearchBar from '../../components/TaskSearchBar';
import toast from 'react-hot-toast';

const MyTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filteredAndSortedTasks, setFilteredAndSortedTasks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const navigate = useNavigate();

  const getAllTasks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_ALL_TASKS, {
        params: {
          status: filterStatus === "All" ? "" : filterStatus,
        },
      });
      setAllTasks(response.data?.tasks || []);

      const statusSummary = response.data?.statusSummary || [];

      const statusArray = [
        { label: "All", count: statusSummary.all || 0 },
        { label: "Pending", count: statusSummary.pendingTasks || 0 },
        { label: "In Progress", count: statusSummary.inProgressTasks || 0 },
        { label: "Completed", count: statusSummary.completedTasks || 0 },
      ];

      setTabs(statusArray);
    } catch (error) {
      logger.error("Error fetching tasks", error);
    }
  };

  const handleClick = (taskId) => {
    navigate(`/user/task-details/${taskId}`);
  };

  // Filter and sort tasks based on priority and sort order
  const filterAndSortTasks = useCallback(() => {
    let filtered = [...allTasks];

    // Filter by priority
    if (priorityFilter !== "All") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case "desc":
          // High > Medium > Low
          const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case "asc":
          // Low > Medium > High
          const priorityOrderAsc = { "High": 1, "Medium": 2, "Low": 3 };
          return (priorityOrderAsc[b.priority] || 0) - (priorityOrderAsc[a.priority] || 0);
        case "dueSoon":
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dateA - dateB;
        case "dueLate":
          const dateA2 = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dateB2 = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return dateB2 - dateA2;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredAndSortedTasks(filtered);
  }, [allTasks, priorityFilter, sortOrder]);

  // Search handler
  const handleSearch = async (query, filters) => {
    setIsSearching(true);
    setIsSearchMode(true);
    
    try {
      const params = { q: query };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.dueDateFrom) params.dueDateFrom = filters.dueDateFrom;
      if (filters.dueDateTo) params.dueDateTo = filters.dueDateTo;

      const response = await axiosInstance.get(API_PATHS.TASKS.SEARCH_TASKS, { params });
      setAllTasks(response.data?.tasks || []);
    } catch (error) {
      logger.error("Error searching tasks", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search and restore normal view
  const handleClearSearch = () => {
    setIsSearchMode(false);
    getAllTasks();
  };

  useEffect(() => {
    if (!isSearchMode) {
      getAllTasks();
    }
  }, [filterStatus, isSearchMode]);

  useEffect(() => {
    filterAndSortTasks();
  }, [filterAndSortTasks]);

  return (
    <DashboardLayout activeMenu="My Tasks">
      <div className="my-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">My Tasks</h2>
          {!isSearchMode && tabs && tabs.length > 0 && (
            <TaskStatusTabs
              tabs={tabs}
              activeTab={filterStatus}
              setActiveTab={setFilterStatus}
            />
          )}
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <TaskSearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            placeholder="Search your tasks..."
            isLoading={isSearching}
            showFilters={true}
            users={[]} // Users don't see assignee filter for their own tasks
          />
        </div>

        {/* Priority Filter and Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter & Sort:</span>
            <PriorityFilter
              selectedPriority={priorityFilter}
              onPriorityChange={setPriorityFilter}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isSearchMode ? (
              <span className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">Search</span>
                Found {filteredAndSortedTasks.length} tasks
              </span>
            ) : (
              `Showing ${filteredAndSortedTasks.length} of ${allTasks.length} tasks`
            )}
          </div>
        </div>

        <div className="mt-4">
          {filteredAndSortedTasks && filteredAndSortedTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredAndSortedTasks.map((item) => (
                <TaskCard
                key={item._id}
                title={item.title}
                description={item.description}
                priority={item.priority}
                status={item.status}
                progress={item.progress}
                createdAt={item.createdAt}
                dueDate={item.dueDate}
                assignedTo={item.assignedTo?.map((user) => user.profileImageUrl)}
                attachmentCount={item.attachments?.length || 0}
                completedTodoCount={item.completedCount || 0}
                todoChecklist={item.todoChecklist || []}
                labels={item.labels || []}
                reminderSent={item.reminderSent}
                onClick={() => handleClick(item._id)}          
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-full p-6 mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No {filterStatus === 'All' ? '' : filterStatus.toLowerCase()} tasks found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {filterStatus === 'All' 
                  ? "You don't have any tasks assigned yet. Tasks will appear here once they are created and assigned to you."
                  : `You don't have any ${filterStatus.toLowerCase()} tasks. Try switching to a different filter to see your other tasks.`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyTasks;
