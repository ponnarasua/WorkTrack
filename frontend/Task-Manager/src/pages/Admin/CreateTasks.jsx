import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import logger from '../../utils/logger';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import { LuTrash, LuX } from 'react-icons/lu';
import SelectDropdown from '../../components/Inputs/SelectDropdown';
import { PRIORITY_DATA } from './../../utils/data';
import SelectUsers from '../../components/Inputs/SelectUsers';
import TodoListInput from '../../components/Inputs/TodoListInput';
import AddAttachments from '../../components/Inputs/AddAttachments';
import Modal from '../../components/Modal';
import DeleteAlert from '../../components/DeleteAlert';
import { getLabelColor, SUGGESTED_LABELS } from '../../utils/colors';

const CreateTasks = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();


  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: PRIORITY_DATA[0],
    dueDate: null,
    dueTime: '',
    assignedTo: [],
    todoChecklist: [],
    attachments: [],
    labels: [],
  });

  const [currentTask, setCurrentTask] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const handleValueChange = (key, value) => {
    setTaskData((prev) => ({ ...prev, [key]: value }));
  };

  const addLabel = (label) => {
    const trimmedLabel = label.trim();
    if (trimmedLabel && !taskData.labels.includes(trimmedLabel)) {
      handleValueChange('labels', [...taskData.labels, trimmedLabel]);
    }
    setNewLabel('');
  };

  const removeLabel = (labelToRemove) => {
    handleValueChange('labels', taskData.labels.filter(l => l !== labelToRemove));
  };

  const clearData = () => {
    setTaskData({
      title: '',
      description: '',
      priority: PRIORITY_DATA[0],
      dueDate: null,
      dueTime: '',
      assignedTo: [],
      todoChecklist: [],
      attachments: [],
      labels: [],
    });
  };

  const createTasks = async () => {
    setLoading(true);
    try {
      const todoList = taskData.todoChecklist.map((item) => ({
        text: item,
        completed: false,
      }));

      // Combine date and time
      const dueDateWithTime = taskData.dueTime 
        ? new Date(`${taskData.dueDate}T${taskData.dueTime}`)
        : new Date(taskData.dueDate);

      const payload = {
        ...taskData,
        priority: taskData.priority?.value || 'Low',
        dueDate: dueDateWithTime.toISOString(),
        todoChecklist: todoList,
        labels: taskData.labels,
      };

      await axiosInstance.post(API_PATHS.TASKS.CREATE_TASK, payload);
      toast.success('Task Created Successfully');
      clearData();
    } catch (error) {
      logger.error('Error in Create Task', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async () => {
    setLoading(true);
    try {
      const prevTodoChecklist = currentTask?.todoChecklist || [];
      const todoList = taskData.todoChecklist.map((item) => {
        const match = prevTodoChecklist.find((t) => t.text === item);
        return {
          text: item,
          completed: match ? match.completed : false,
        };
      });

      // Combine date and time
      const dueDateWithTime = taskData.dueTime 
        ? new Date(`${taskData.dueDate}T${taskData.dueTime}`)
        : new Date(taskData.dueDate);

      await axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK(taskId), {
        ...taskData,
        dueDate: dueDateWithTime.toISOString(),
        todoChecklist: todoList,
        priority: taskData.priority?.value || 'Low',
        labels: taskData.labels,
      });

      toast.success('Task Updated Successfully');
      navigate('/admin/tasks');
    } catch (error) {
      logger.error('Error in Update Task', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    setError(null);

    if (!taskData.title.trim()) return setError('Title is required');
    if (!taskData.description.trim()) return setError('Description is required');
    if (!taskData.dueDate) return setError('Due Date is required');
    if (taskData.assignedTo?.length === 0) return setError('Assign at least one member');
    if (taskData.todoChecklist?.length === 0) return setError('Add at least one todo item');

    taskId ? updateTask() : createTasks();
  };

  const getTaskDetailsById = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(taskId));
      if(response.data) {
        const task = response.data;
        setCurrentTask(task);
        setTaskData({
          title: task.title,
          description: task.description,
          priority: PRIORITY_DATA.find((p) => p.value === task.priority) || PRIORITY_DATA[0],
          dueDate: task.dueDate ? moment(task.dueDate).format('YYYY-MM-DD') : null,
          dueTime: task.dueDate ? moment(task.dueDate).format('HH:mm') : '',
          assignedTo: task.assignedTo?.map((u) => u._id) || [],
          todoChecklist: task.todoChecklist?.map((i) => i.text) || [],
          attachments: task.attachments || [],
          labels: task.labels || [],
        });
      }
    } catch (error) {
      logger.error('Error fetching task by ID', error);
    }
  };
  
  // Delete Task
  const deleteTask = async () => {
    try {
      await axiosInstance.delete(API_PATHS.TASKS.DELETE_TASK(taskId));
      setOpenDeleteAlert(false);
      toast.success('Expense details deleted successfully');
      navigate('/admin/tasks');
    }catch(error) {
      logger.error('Error in Delete Task', error);
    }
  }

  useEffect(() => {
    if (taskId) {
      getTaskDetailsById();
    }
  }, [taskId]);  

  return (
    <DashboardLayout activeMenu="Create Task">
      <div className="mt-5">
        <div className="grid grid-cols-1 md:grid-cols-4 mt-4">
          <div className="form-card col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                {taskId ? 'Update Task' : 'Create Task'}
              </h2>
              {taskId && (
                <button
                  className="flex items-center gap-1.5 text-[13px] font-medium text-rose-500 bg-rose-50 dark:bg-rose-900/30 rounded px-2 py-1 border border-rose-100 dark:border-rose-800 hover:border-rose-300 cursor-pointer"
                  onClick={() => setOpenDeleteAlert(true)}
                >
                  <LuTrash className="text-base" /> Delete
                </button>
              )}
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400">Task Title</label>
              <input
                className="form-input"
                placeholder="Create App UI"
                value={taskData.title}
                onChange={({ target }) => handleValueChange('title', target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600 dark:text-gray-400">Description</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Description"
                value={taskData.description}
                onChange={({ target }) => handleValueChange('description', target.value)}
              />
            </div>

            <div className="grid grid-cols-12 gap-4 mt-2">
              <div className="col-span-6 md:col-span-4">
                <label className="text-xs font-medium text-slate-600 dark:text-gray-400">Priority</label>
                <SelectDropdown
                  options={PRIORITY_DATA}
                  value={taskData.priority}
                  onChange={(value) => handleValueChange('priority', value)}
                />
              </div>

              <div className="col-span-6 md:col-span-3">
                <label className="text-xs font-medium text-slate-600 dark:text-gray-400">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={taskData.dueDate || ''}
                  onChange={({ target }) => handleValueChange('dueDate', target.value)}
                />
              </div>

              <div className="col-span-6 md:col-span-2">
                <label className="text-xs font-medium text-slate-600 dark:text-gray-400">Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={taskData.dueTime || ''}
                  onChange={({ target }) => handleValueChange('dueTime', target.value)}
                />
              </div>

              <div className="col-span-12 md:col-span-3">
                <label className="text-xs font-medium text-slate-600">Assigned To</label>
                <SelectUsers
                  selectedUsers={taskData.assignedTo}
                  setSelectedUsers={(value) => handleValueChange('assignedTo', value)}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">TODO Checklist</label>
              <TodoListInput
                todoList={taskData.todoChecklist}
                setTodoList={(value) => handleValueChange('todoChecklist', value)}
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">Add Attachments</label>
              <AddAttachments
                attachments={taskData.attachments}
                setAttachments={(value) => handleValueChange('attachments', value)}
              />
            </div>

            {/* Labels Section */}
            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">Labels</label>
              
              {/* Current Labels */}
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {taskData.labels.map((label) => {
                  const color = getLabelColor(label);
                  return (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${color.bg} ${color.text} ${color.border} border`}
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="hover:bg-white/50 rounded-full p-0.5 transition-colors"
                      >
                        <LuX className="text-xs" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Label Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  className="form-input flex-1"
                  placeholder="Add a label..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLabel(newLabel);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => addLabel(newLabel)}
                  disabled={!newLabel.trim()}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 text-sm"
                >
                  Add
                </button>
              </div>

              {/* Suggested Labels */}
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-slate-500 mr-1">Suggestions:</span>
                {SUGGESTED_LABELS.filter(l => !taskData.labels.includes(l)).slice(0, 5).map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => addLabel(label)}
                    className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-500 mt-5">{error}</p>}

            <div className="flex justify-end mt-7">
              <button className="add-btn" onClick={handleSubmit} disabled={loading}>
                {taskId ? 'UPDATE TASK' : 'CREATE TASK'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={openDeleteAlert}
        onClose={() => setOpenDeleteAlert(false)}
        title="Delete Task"
        >
          <DeleteAlert
            content = "Are you sure you want to delete this task?"
            onDelete = {() => deleteTask()}
          />
        </Modal>

    </DashboardLayout>
  );
};

export default CreateTasks;
