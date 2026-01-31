import React, { useState, useEffect } from 'react';
import { 
  LuArrowRight, 
  LuCheck, 
  LuBell, 
  LuClipboardCheck,
  LuCalendar,
  LuLoader
} from 'react-icons/lu';
import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';
import logger from '../utils/logger';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const ProductivityStats = ({ className = "" }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_PRODUCTIVITY_STATS, {
        params: { period }
      });
      setStats(response.data);
    } catch (err) {
      logger.error('Error fetching productivity stats:', err);
      setError('Failed to load productivity stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <LuLoader className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <div className="flex items-center justify-center py-12 text-red-500">
          <span className="text-xl mr-2">!</span>
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { summary, periodStats, completedByPriority, checklistStats, weeklyTrend } = stats;

  // Productivity score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-lime-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <LuClipboardCheck className="w-5 h-5 text-primary" />
          Productivity Stats
        </h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                     focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Productivity Score Card */}
      <div className="card bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 border-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Productivity Score</p>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${getScoreColor(summary.productivityScore)}`}>
                {summary.productivityScore}
              </span>
              <span className="text-lg text-gray-400 mb-1">/100</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Based on task completion, on-time rate, and activity
            </p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(summary.productivityScore / 100) * 251.2} 251.2`}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#667eea" />
                  <stop offset="100%" stopColor="#764ba2" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getScoreColor(summary.productivityScore)}`}>
                {summary.productivityScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tasks Completed */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <LuCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{periodStats.tasksCompleted}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </div>

        {/* On-Time Rate */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <LuCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{periodStats.onTimeRate}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">On-Time</p>
            </div>
          </div>
        </div>

        {/* Avg Completion Time */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <LuBell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {periodStats.avgCompletionTime}
                <span className="text-sm font-normal text-gray-400 ml-1">days</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Time</p>
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <span className="text-orange-600 dark:text-orange-400 text-lg font-bold">*</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {periodStats.currentStreak}
                <span className="text-sm font-normal text-gray-400 ml-1">days</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="card">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <LuArrowRight className="w-4 h-4" />
          Weekly Activity Trend
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="weekLabel" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                className="text-gray-500"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                className="text-gray-500"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="created" name="Created" fill="#667eea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-green-500 rounded"></span> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-primary rounded"></span> Created
          </span>
        </div>
      </div>

      {/* Priority Breakdown & Checklist Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Completed by Priority */}
        <div className="card">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Completed by Priority
          </h4>
          <div className="space-y-3">
            {Object.entries(completedByPriority).map(([priority, count]) => {
              const colors = {
                High: 'bg-red-500',
                Medium: 'bg-yellow-500',
                Low: 'bg-green-500'
              };
              const total = Object.values(completedByPriority).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
              
              return (
                <div key={priority} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${colors[priority]}`}></span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-16">{priority}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors[priority]} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Checklist Stats */}
        <div className="card">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Checklist Progress
          </h4>
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {checklistStats.rate}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {checklistStats.completed} / {checklistStats.total} items
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
              style={{ width: `${checklistStats.rate}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {checklistStats.total - checklistStats.completed} items remaining across all tasks
          </p>
        </div>
      </div>

      {/* Task Overview */}
      <div className="card bg-gray-50 dark:bg-gray-800/50">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Task Overview
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalTasks}</p>
            <p className="text-xs text-gray-500">Total Tasks</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-600">{summary.pendingTasks}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cyan-600">{summary.inProgressTasks}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{summary.overdueTasks}</p>
            <p className="text-xs text-gray-500">Overdue</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityStats;
