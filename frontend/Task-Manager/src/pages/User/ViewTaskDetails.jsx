import React, { useState, useEffect, useContext, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import logger from '../../utils/logger'
import DashboardLayout from '../../components/layout/DashboardLayout'
import moment from 'moment'
import AvatarGroup from '../../components/AvatarGroup'
import { LuBell, LuSquareArrowOutUpRight, LuSquarePen } from 'react-icons/lu'
import { Suspense, lazy } from 'react';

const TaskComments = lazy(() => import('../../components/TaskComments'));
const ActivityLog = lazy(() => import('../../components/ActivityLog'));
const TaskLabels = lazy(() => import('../../components/TaskLabels'));
import { UserContext } from '../../context/userContext'
import toast from 'react-hot-toast'
import { getStatusTagColor } from '../../utils/colors'


const ViewTaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === 'admin';

  // get Task info by ID
  const getTaskDetailsByID = useCallback(async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(id));

      if (response.data) {
        const taskInfo = response.data;
        setTask(taskInfo);
      }
    } catch (error) {
      logger.error("Error in getTaskDetailsByID", error);
    }
  }, [id]);

  // handle todo check
  const updateTodoChecklist = async (index) => {
    const todoChecklist = [...(task?.todoChecklist || [])];
    const taskId = id;
    if(todoChecklist && todoChecklist[index]) {
      todoChecklist[index].completed = !todoChecklist[index].completed;

      try {
        const response = await axiosInstance.put(API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(taskId), {
          todoChecklist
        });

        if(response.status === 200 ) {
          setTask(response.data?.task || task);
        }
        else{
          // optionally revert the toggle if the API call fails.
          todoChecklist[index].completed = !todoChecklist[index].completed;
        }
      } catch (error) {
        logger.error('Error updating todo checklist:', error);
        todoChecklist[index].completed = !todoChecklist[index].completed;
      }
    }
  };


  // Handle attachment link click
  const handleLinkClick = (link) => {
    if(!/^https?:\/\//i.test(link)) {
      link = "https://"+link;
    }
    window.open(link, "_blank");
  }

  // Send reminder for this task
  const handleSendReminder = async () => {
    try {
      setSendingReminder(true);
      const response = await axiosInstance.post(API_PATHS.TASKS.SEND_REMINDER(id));
      if (response.data) {
        toast.success(response.data.message || 'Reminder sent successfully!');
      }
    } catch (error) {
      logger.error('Error sending reminder:', error);
      toast.error(error.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  useEffect(() => {
    if (id) {
      getTaskDetailsByID();
    }
    return () => { };
  }, [id, getTaskDetailsByID]);
  return (
    <DashboardLayout activeMenu={isAdmin ? 'Manage Tasks' : 'My Tasks'}>
      <div className='mt-5'>
        {task && (<div className='grid grid-cols-1 md:grid-cols-4 mt-4'>
          <div className='form-card col-span-3'>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm md:text-2xl font-medium text-gray-900 dark:text-white'>
                {task?.title}
              </h2>
              <div className='flex items-center gap-3'>
                {isAdmin && (
                  <>
                    <button
                      onClick={handleSendReminder}
                      disabled={sendingReminder || task?.status === 'Completed'}
                      className='flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed'
                      title='Send reminder to all assigned users'
                    >
                      <LuBell className={`text-base ${sendingReminder ? 'animate-pulse' : ''}`} />
                      {sendingReminder ? 'Sending...' : 'Send Reminder'}
                    </button>
                    <button
                      onClick={() => navigate(`/admin/create-tasks/${id}`)}
                      className='flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 bg-primary/10 px-3 py-1 rounded'
                    >
                      <LuSquarePen className='text-base' />
                      Edit
                    </button>
                  </>
                )}
                <div className={`text-[11px] md:text-[13px] font-medium ${getStatusTagColor(task?.status)} px-4 py-0.5 rounded`}>
                  {task?.status}
                </div>
              </div>
            </div>

            <div className='mt-4'>
              <InfoBox label="Description" value={task?.description} />
            </div>

            <div className='grid grid-cols-12 gap-4 mt-4'>
              <div className='col-span-6 md:col-span-4'>
                <InfoBox label="Priority" value={task?.priority} />
              </div>
              <div className='col-span-6 md:col-span-4'>
                <InfoBox label="Due Date" value={task?.dueDate ? moment(task?.dueDate).format("Do MMM YYYY") : "N/A"} />
              </div>
              <div className='col-span-6 md:col-span-4'>
                <label className='text-xs font-medium text-slate-500 dark:text-gray-400'>
                  Assigned To
                </label>

                <AvatarGroup
                  avatars={task?.assignedTo?.map((item) => item?.profileImageUrl) || []}
                  maxVisible={5}
                />
              </div>
            </div>

            <div className='mt-2'>
              <label className='text-xs font-medium text-slate-500 dark:text-gray-400'>
                Todo Checklist
              </label>

              {task?.todoChecklist?.map((item, index) => (
                <TodoCheckList
                  key={`todo_${index}`}
                  text={item.text}
                  isChecked={item?.completed}
                  onChange={() => updateTodoChecklist(index)}
                />
              ))}
            </div>

            {task?.attachments?.length > 0 && (
              <div className='mt-2'>
                <label className='text-xs font-medium text-slate-500 dark:text-gray-400'>
                  Attachments
                </label>
                {task?.attachments?.map((link, index) => (
                  <Attachment
                    key={`link_${index}`}
                    link={link}
                    index={index}
                    onClick={() => handleLinkClick(link)} // ✅ fixed
                  />
                ))}

              </div>
            )}

            {/* Task Labels */}
            <Suspense fallback={<div>Loading labels...</div>}>
              <TaskLabels 
                taskId={id} 
                initialLabels={task?.labels || []} 
                onLabelsChange={(newLabels) => setTask({...task, labels: newLabels})}
              />
            </Suspense>

            {/* Comments Section */}
            <Suspense fallback={<div>Loading comments...</div>}>
              <TaskComments taskId={id} />
            </Suspense>

            {/* Activity Log */}
            <Suspense fallback={<div>Loading activity log...</div>}>
              <ActivityLog taskId={id} />
            </Suspense>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default ViewTaskDetails;

const InfoBox = ({ label, value }) => {
  return (
    <>
      <label className='text-xs font-medium text-slate-500 dark:text-gray-400'>{label}</label>
      <p className='text-[12px] md:text-[13px] text-gray-700 dark:text-gray-300 mt-0.5'>{value}</p>
    </>
  )
};

const TodoCheckList = ({ text, isChecked, onChange }) => {
  return (
    <>
      <div className='flex items-center gap-3 p-3'>
        <input
          type='checkbox'
          checked={isChecked}
          onChange={onChange}
          className='w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded-sm outline-none cursor-pointer'
        />
        <p className='text-[13px] text-gray-800'>{text}</p>
      </div>
    </>
  )
};

const Attachment = ({ link, index, onClick }) => {
  return (
    <div className='flex justify-between bg-gray-50 border border-gray-100 px-3 py-2 rounded-md mb-3 mt-2 cursor-pointer' onClick={onClick}>
      <div className='flex-1 flex items-center gap-3'>
        <span className='text-xs text-gray-400 font-semibold mr-2'>
          {index < 9 ? `0${index + 1}` : index + 1}
        </span>

        <p className='text-xs text-black'>{link}</p>
      </div>

      <LuSquareArrowOutUpRight className='text-gray-400' />
    </div>
  )
};