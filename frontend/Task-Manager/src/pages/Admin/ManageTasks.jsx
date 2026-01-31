import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import logger from '../../utils/logger';
import { API_PATHS } from '../../utils/apiPaths';
import { LuFileSpreadsheet, LuPlus, LuFileText } from 'react-icons/lu';
import TaskStatusTabs from '../../components/TaskStatusTabs';
import TaskCard from '../../components/Cards/TaskCard';
import PriorityFilter from '../../components/PriorityFilter';
import TaskSearchBar from '../../components/TaskSearchBar';
import toast from 'react-hot-toast';

const ManageTasks = () => {
  const [allTasks, setAllTasks] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filteredAndSortedTasks, setFilteredAndSortedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const navigate = useNavigate();

  // Fetch users for assignee filter
  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      setUsers(response.data || []);
    } catch (error) {
      logger.error("Error fetching users", error);
    }
  };

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

  const handleClick = (taskData) => {
    navigate(`/admin/task-details/${taskData._id}`);
  };

  const handleEdit = (taskData) => {
    navigate(`/admin/create-tasks/${taskData._id}`);
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
      const priorityOrderHigh = { "High": 3, "Medium": 2, "Low": 1 };
      const priorityOrderLow = { "High": 1, "Medium": 2, "Low": 3 };
      
      switch (sortOrder) {
        case "desc":
          return (priorityOrderHigh[b.priority] || 0) - (priorityOrderHigh[a.priority] || 0);
        case "asc":
          return (priorityOrderLow[b.priority] || 0) - (priorityOrderLow[a.priority] || 0);
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

  // download task report
  const handleDownloadReport = async () => {
    try{
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_TASKS, {
        responseType: 'blob',
      });

      // Create a URl for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'task_details.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Error in Download expensive details", error);
      toast.error("Error in Download expense details. Please try again.");
    }
  };

  // Duplicate task handler
  const handleDuplicateTask = async (taskId) => {
    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.DUPLICATE_TASK(taskId));
      toast.success("Task duplicated successfully!");
      getAllTasks(); // Refresh the task list
    } catch (error) {
      logger.error("Error duplicating task", error);
      toast.error(error.response?.data?.message || "Failed to duplicate task");
    }
  };

  // download PDF report
  const handleDownloadPDF = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.REPORTS.EXPORT_TASKS_PDF, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'task_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      logger.error("Error downloading PDF", error);
      toast.error("Failed to download PDF report");
    }
  };

  // Search handler
  const handleSearch = async (query, filters) => {
    setIsSearching(true);
    setIsSearchMode(true);
    
    try {
      const params = { q: query };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignee) params.assignee = filters.assignee;
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
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!isSearchMode) {
      getAllTasks();
    }
  }, [filterStatus, isSearchMode]);

  useEffect(() => {
    filterAndSortTasks();
  }, [filterAndSortTasks]);

  return (
    <DashboardLayout activeMenu="Manage Tasks">
      <div className="my-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center justify-between gap-5">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white">Manage Tasks</h2>
          </div>

          <div className="flex items-center gap-3">
            {!isSearchMode && tabs && tabs.length > 0 && (
              <TaskStatusTabs
                tabs={tabs}
                activeTab={filterStatus}
                setActiveTab={setFilterStatus}
              />
            )}
            <button className="hidden lg:flex download-btn" onClick={() => handleDownloadReport()}>
              <LuFileSpreadsheet className="text-lg" />
              Excel
            </button>
            <button className="hidden lg:flex download-btn" onClick={() => handleDownloadPDF()}>
              <LuFileText className="text-lg" />
              PDF
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <TaskSearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            placeholder="Search tasks by title or description..."
            users={users}
            isLoading={isSearching}
            showFilters={true}
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
                taskId={item._id}
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
                onClick={() => handleClick(item)}
                onDuplicate={() => handleDuplicateTask(item._id)}
                isAdmin={true}
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
                  ? "No tasks have been created yet. Start by creating your first task to get organized!"
                  : `No ${filterStatus.toLowerCase()} tasks found. Try switching to a different filter or create new tasks.`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Create Task Button */}
      <button
        onClick={() => navigate('/admin/create-tasks')}
        className="fixed bottom-6 right-6 h-14 pl-4 pr-4 hover:pr-5 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out flex items-center justify-center z-50 group"
      >
        <LuPlus className="text-2xl group-hover:rotate-90 transition-transform duration-300 flex-shrink-0" />
        <span className="inline-block max-w-0 overflow-hidden whitespace-nowrap font-medium group-hover:max-w-40 group-hover:ml-2 transition-all duration-300 ease-in-out">
          Create Task
        </span>
      </button>
    </DashboardLayout>
  );
};

export default ManageTasks;
