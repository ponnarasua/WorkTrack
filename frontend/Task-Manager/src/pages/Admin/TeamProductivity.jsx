import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useUserAuth } from '../../hooks/useUserAuth';
import logger from '../../utils/logger';
import { 
  LuArrowRight, 
  LuCheck, 
  LuUsers,
  LuCalendar,
  LuLoader,
  LuFlag,
  LuDownload,
  LuFileSpreadsheet,
  LuFileText,
  LuChevronDown
} from 'react-icons/lu';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import toast from 'react-hot-toast';

const TeamProductivity = () => {
  useUserAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TEAM_PRODUCTIVITY_STATS, {
        params: { period }
      });
      setStats(response.data);
    } catch (err) {
      logger.error('Error fetching team productivity stats:', err);
      setError('Failed to load team productivity stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showExportMenu && !e.target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);

  const handleExport = async (format) => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const response = await axiosInstance.get(
        format === 'excel' 
          ? API_PATHS.REPORTS.EXPORT_TEAM_PRODUCTIVITY 
          : API_PATHS.REPORTS.EXPORT_TEAM_PRODUCTIVITY_PDF,
        {
          params: { period },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data], { 
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `team_productivity_${period}days.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Report downloaded successfully!`);
    } catch (err) {
      logger.error('Error exporting report:', err);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-lime-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-lime-100 dark:bg-lime-900/30';
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 20) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-lime-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRankBadge = (index) => {
    if (index === 0) return { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-400', icon: '🥇' };
    if (index === 1) return { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', icon: '🥈' };
    if (index === 2) return { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400', icon: '🥉' };
    return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', icon: null };
  };

  return (
    <DashboardLayout activeMenu="Team Productivity">
      <div className="my-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <LuUsers className="w-7 h-7 text-primary" />
              Team Productivity
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monitor and analyze your team's performance metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl 
                         bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                         focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>

            {/* Export Button */}
            <div className="relative export-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExportMenu(!showExportMenu);
                }}
                disabled={exporting || loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl 
                           hover:bg-primary/90 transition-colors font-medium text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <LuLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <LuDownload className="w-4 h-4" />
                )}
                Export
                <LuChevronDown className="w-4 h-4" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg 
                                border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300
                               hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LuFileSpreadsheet className="w-5 h-5 text-green-600" />
                    Export as Excel
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300
                               hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <LuFileText className="w-5 h-5 text-red-600" />
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="card">
            <div className="flex items-center justify-center py-20">
              <LuLoader className="w-10 h-10 text-primary animate-spin" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="card">
            <div className="flex flex-col items-center justify-center py-20 text-red-500">
              <span className="text-4xl mb-3">!</span>
              <p>{error}</p>
              <button 
                onClick={fetchStats}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && stats && stats.members.length === 0 && (
          <div className="card">
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <LuUsers className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No team members found</p>
              <p className="text-sm mt-1">Add team members to see productivity stats</p>
            </div>
          </div>
        )}

        {/* Stats Content */}
        {!loading && !error && stats && stats.members.length > 0 && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Team Size */}
              <div className="card bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-xl">
                    <LuUsers className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.teamSize}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Team Members</p>
                  </div>
                </div>
              </div>

              {/* Avg Productivity Score */}
              <div className={`card bg-gradient-to-br ${getScoreBgColor(stats.teamAverage.avgProductivityScore)} border-0`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${getScoreBgColor(stats.teamAverage.avgProductivityScore)}`}>
                    <LuArrowRight className={`w-6 h-6 ${getScoreColor(stats.teamAverage.avgProductivityScore)}`} />
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${getScoreColor(stats.teamAverage.avgProductivityScore)}`}>
                      {stats.teamAverage.avgProductivityScore}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Score</p>
                  </div>
                </div>
              </div>

              {/* Total Completed */}
              <div className="card bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/30 border-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-200/50 dark:bg-green-900/50 rounded-xl">
                    <LuCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.teamAverage.totalCompleted}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Completed</p>
                  </div>
                </div>
              </div>

              {/* Overdue */}
              <div className="card bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/30 border-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-200/50 dark:bg-red-900/50 rounded-xl">
                    <LuFlag className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.teamAverage.totalOverdue}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Overdue Tasks</p>
                  </div>
                </div>
              </div>
            </div>

            {/* On-Time Rate Bar */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <LuCalendar className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Team Average On-Time Rate</span>
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.teamAverage.avgOnTimeRate}%
                </span>
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all duration-700"
                  style={{ width: `${stats.teamAverage.avgOnTimeRate}%` }}
                ></div>
              </div>
            </div>

            {/* Team Leaderboard */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Team Performance Leaderboard
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Last {period} days
                </span>
              </div>

              {/* Table Header */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-3">Team Member</div>
                <div className="col-span-1 text-center">Score</div>
                <div className="col-span-1 text-center">Completed</div>
                <div className="col-span-1 text-center">Pending</div>
                <div className="col-span-1 text-center">In Progress</div>
                <div className="col-span-1 text-center">Overdue</div>
                <div className="col-span-1 text-center">On-Time</div>
                <div className="col-span-2 text-center">Streak</div>
              </div>

              {/* Team Members */}
              <div className="space-y-3">
                {stats.members.map((member, index) => {
                  const rankBadge = getRankBadge(index);
                  
                  return (
                    <div 
                      key={member.user._id} 
                      className={`p-4 rounded-xl border transition-all hover:shadow-md
                        ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 border-yellow-200 dark:border-yellow-800/50' :
                          index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 border-gray-200 dark:border-gray-700' :
                          index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border-orange-200 dark:border-orange-800/50' :
                          'bg-white dark:bg-gray-800/30 border-gray-100 dark:border-gray-700'}`}
                    >
                      {/* Mobile Layout */}
                      <div className="lg:hidden">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {/* Rank */}
                            <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold ${rankBadge.bg} ${rankBadge.text}`}>
                              {rankBadge.icon || index + 1}
                            </div>
                            {/* Avatar & Name */}
                            {member.user.profileImageUrl ? (
                              <img 
                                src={member.user.profileImageUrl} 
                                alt={member.user.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary font-semibold">
                                  {member.user.name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{member.user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{member.user.email}</p>
                            </div>
                          </div>
                          {/* Score Badge */}
                          <div className={`px-4 py-2 rounded-xl text-white font-bold ${getScoreBadgeColor(member.productivityScore)}`}>
                            {member.productivityScore}
                          </div>
                        </div>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-2 text-center text-sm">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                            <p className="font-bold text-green-600">{member.completedInPeriod}</p>
                            <p className="text-xs text-gray-500">Done</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                            <p className="font-bold text-blue-600">{member.onTimeRate}%</p>
                            <p className="text-xs text-gray-500">On-Time</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                            <p className="font-bold text-orange-600">{member.currentStreak}</p>
                            <p className="text-xs text-gray-500">Streak</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                            <p className={`font-bold ${member.overdueTasks > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                              {member.overdueTasks}
                            </p>
                            <p className="text-xs text-gray-500">Overdue</p>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:grid lg:grid-cols-12 gap-4 items-center">
                        {/* Rank */}
                        <div className="col-span-1 flex justify-center">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold text-lg ${rankBadge.bg} ${rankBadge.text}`}>
                            {rankBadge.icon || index + 1}
                          </div>
                        </div>

                        {/* Team Member */}
                        <div className="col-span-3 flex items-center gap-3">
                          {member.user.profileImageUrl ? (
                            <img 
                              src={member.user.profileImageUrl} 
                              alt={member.user.name}
                              className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center border-2 border-white dark:border-gray-700">
                              <span className="text-primary font-semibold">
                                {member.user.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{member.user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.user.email}</p>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="col-span-1 flex justify-center">
                          <div className={`px-3 py-1.5 rounded-lg text-white font-bold text-sm ${getScoreBadgeColor(member.productivityScore)}`}>
                            {member.productivityScore}
                          </div>
                        </div>

                        {/* Completed */}
                        <div className="col-span-1 text-center">
                          <span className="font-semibold text-green-600 dark:text-green-400">{member.completedInPeriod}</span>
                        </div>

                        {/* Pending */}
                        <div className="col-span-1 text-center">
                          <span className="font-semibold text-violet-600 dark:text-violet-400">{member.pendingTasks}</span>
                        </div>

                        {/* In Progress */}
                        <div className="col-span-1 text-center">
                          <span className="font-semibold text-cyan-600 dark:text-cyan-400">{member.inProgressTasks}</span>
                        </div>

                        {/* Overdue */}
                        <div className="col-span-1 text-center">
                          <span className={`font-semibold ${member.overdueTasks > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {member.overdueTasks}
                          </span>
                        </div>

                        {/* On-Time Rate */}
                        <div className="col-span-1 text-center">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{member.onTimeRate}%</span>
                        </div>

                        {/* Streak */}
                        <div className="col-span-2 flex items-center justify-center gap-2">
                          <span className="text-orange-500">*</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{member.currentStreak} days</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamProductivity;
