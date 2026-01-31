import React, { useContext, useEffect, useState } from 'react';
import { useUserAuth } from '../../hooks/useUserAuth';
import { UserContext } from '../../context/userContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import logger from '../../utils/logger';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import moment from 'moment';
import { addThousandSeparator } from '../../utils/helper';
import InfoCard from '../../components/Cards/InfoCard';
import { LuArrowRight } from 'react-icons/lu';
import TaskListTable from '../../components/TaskListTable';
import CustomPieChart from '../../components/Charts/CustomPieChart';
import CustomBarChart from '../../components/Charts/CustomBarChart';
import ProductivityStats from '../../components/ProductivityStats';
import { CHART_COLORS } from '../../utils/colors';

const UserDashboard = () => {
  useUserAuth();

  const { user } = useContext(UserContext);

  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);


  // Prepare Chart Data
  const prepareChartData = (data) => {
    const taskDistribution = data?.taskDistribution || null;
    const taskPriorityLevels = data?.taskPriorityLevels || null;

    const taskDistributionData = [
      {status: "Pending", count: taskDistribution?.Pending || 0},
      {status: "In Progress", count: taskDistribution?.InProgress || 0},
      {status: "Completed", count: taskDistribution?.Completed || 0},
    ];

    setPieChartData(taskDistributionData);

    const PriorityLevelData = [
      {priority: "Low", count: taskPriorityLevels?.Low || 0},
      {priority: "Medium", count: taskPriorityLevels?.Medium || 0},
      {priority: "High", count: taskPriorityLevels?.High || 0},
    ];

    setBarChartData(PriorityLevelData);
  }

  const getDashboardData = async () => {
    try{
      const response = await axiosInstance.get(
        API_PATHS.TASKS.GET_USER_DASHBOARD_DATA
      );
      if(response.data){
        setDashboardData(response.data);
        prepareChartData(response.data?.charts || null);
      }
    } catch(error) {
      logger.error("Error fetching users", error);
    }
  };

  const onSeeMore = () => {
    navigate('/admin/tasks');
  }

  useEffect(() => {
    getDashboardData();
  
    return () => {}
  }, [])
  

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className='card my-5'>
        <div>
          <div className='col-span-3'>
            <h2 className='text-xl md:text-2xl text-gray-900 dark:text-white'>Good Morning! {user?.name}</h2>
            <p className='text-xs md:text-[13px] text-gray-400 mt-1.5'>
              {moment().format('dddd Do MMM YYYY')}
            </p>
          </div>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-5'>
          <InfoCard
            label = "Total Tasks"
            value = {addThousandSeparator(
              dashboardData?.charts?.taskDistribution?.All || 0
            )}
            color="bg-primary"
            />

          <InfoCard
            label = "Pending Tasks"
            value = {addThousandSeparator(
              dashboardData?.charts?.taskDistribution?.Pending || 0
            )}
            color="bg-violet-500"
            />

          <InfoCard
            label = "InProgress Tasks"
            value = {addThousandSeparator(
              dashboardData?.charts?.taskDistribution?.InProgress || 0
            )}
            color="bg-cyan-500"
            />

            <InfoCard
              label = "Completed Tasks"
              value = {addThousandSeparator(
                dashboardData?.charts?.taskDistribution?.Completed || 0
              )}
              color="bg-lime-500"
              />

        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 my-4 md:my-6'>

        <div>
          <div className='card'>
            <div className='flex items-center justify-between'>
              <h5 className='text-lg text-gray-900 dark:text-white'>Task Distribution</h5>
            </div>
            <CustomPieChart 
              data={pieChartData}
              colors={CHART_COLORS}
            />
          </div>
        </div>

        <div>
          <div className='card'>
            <div className='flex items-center justify-between'>
              <h5 className='text-lg text-gray-900 dark:text-white'>Task Priority Levels</h5>
            </div>
            <CustomBarChart 
              data={barChartData}
            />
          </div>
        </div>

        {/* Productivity Stats Section */}
        <div className='md:col-span-2'>
          <ProductivityStats />
        </div>

        <div className='md:col-span-2'>
          <div className='card'>
            <div className='flex items-center justify-between'>
              <h5 className='text-lg'>Recent Tasks</h5>

              <button className='card-btn' onClick={onSeeMore}>
                See All <LuArrowRight className='text-base'/>
              </button>
            </div>

            <TaskListTable tableData={dashboardData?.recentTasks || []} />
          </div>
        </div>
            
      </div>
    </DashboardLayout>
  )
}
export default UserDashboard;