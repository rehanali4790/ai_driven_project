import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Database,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';
import { ViewType } from '@/lib/types';

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { state, dashboard } = useProjectData();

  if (!state || !dashboard) return null;

  const stats = [
    {
      label: 'Overall Progress',
      value: `${dashboard.overallProgress}%`,
      trend: `${state.documents.length} documents`,
      positive: true,
      icon: Activity,
      bg: 'bg-teal-50 border-yellow-500',
      iconColor: 'text-[#12b3a8]',
    },
    {
      label: 'Tasks Completed',
      value: `${dashboard.tasksCompleted}/${dashboard.totalTasks}`,
      trend: `${dashboard.inProgress} in progress`,
      positive: true,
      icon: CheckCircle,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Resource Utilization',
      value: `${dashboard.resourceUtilization}%`,
      trend: `${state.resources.length} resources`,
      positive: true,
      icon: Database,
      bg: 'bg-violet-50',
      iconColor: 'text-violet-500',
    },
    {
      label: 'Overdue Tasks',
      value: `${dashboard.overdueTasks}`,
      trend: `${dashboard.criticalTasks} critical`,
      positive: dashboard.overdueTasks === 0,
      icon: AlertTriangle,
      bg: dashboard.overdueTasks === 0 ? 'bg-emerald-50' : 'bg-red-50',
      iconColor: dashboard.overdueTasks === 0 ? 'text-emerald-500' : 'text-red-500',
    },
  ];

  const topResources = [...state.resources]
    .sort((a, b) => b.allocated - a.allocated)
    .slice(0, 4);

  return (
    <div className="page-typography space-y-6 p-1">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Project Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Live project health driven by documents and AI analysis</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('documents')}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
          >
            Upload Document
          </button>
          <button
            onClick={() => onNavigate('ai')}
            className="px-4 py-2 bg-[#12b3a8] text-white text-sm font-medium rounded-xl hover:bg-[#0e9188] transition-all flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-5 border border-gray-100"
              style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}
            >
              {/* Icon pill */}
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${stat.bg} mb-4`}>
                <Icon className={`w-4.5 h-4.5 ${stat.iconColor}`} />
              </div>
              <p className="text-xs font-medium text-gray-400 mb-1">{stat.label}</p>
              <p className="text-[22px] font-semibold text-gray-900 leading-none mb-2">{stat.value}</p>
              <div className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                stat.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}>
                {stat.positive
                  ? <TrendingUp className="w-3 h-3" />
                  : <TrendingDown className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* AI Insights */}
        <div
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e8f8f7] flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[#12b3a8]" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-800">AI Insights</h3>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-[#e8f8f7] text-[#12b3a8] text-[11px] font-semibold rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12b3a8] animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="space-y-3">
            {state.insights.map((insight) => (
              <div
                key={insight.id}
                className={`flex items-start gap-3 p-4 rounded-xl ${
                  insight.type === 'risk'
                    ? 'bg-red-50/70 border border-red-100'
                    : insight.type === 'suggestion'
                      ? 'bg-amber-50/70 border border-amber-100'
                      : 'bg-[#f0fafa] border border-teal-100'
                }`}
              >
                <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                  insight.type === 'risk' ? 'bg-red-100' : 'bg-[#dff5f3]'
                }`}>
                  {insight.type === 'risk'
                    ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    : <Zap className="w-3.5 h-3.5 text-[#12b3a8]" />}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Load */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Database className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-800">Resource Load</h3>
            </div>
            <button onClick={() => onNavigate('resources')} className="text-[#12b3a8] text-xs font-medium hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-5">
            {topResources.map((resource) => {
              const isHigh = resource.allocated >= 90;
              const isMid = resource.allocated >= 70;
              return (
                <div key={resource.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{resource.name}</span>
                    <span className={`text-xs font-semibold tabular-nums ${
                      isHigh ? 'text-red-500' : isMid ? 'text-amber-500' : 'text-[#12b3a8]'
                    }`}>
                      {resource.allocated}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isHigh ? 'bg-red-400' : isMid ? 'bg-amber-400' : 'bg-[#12b3a8]'
                      }`}
                      style={{ width: `${resource.allocated}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Milestones */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-800">Milestones</h3>
            </div>
            <button onClick={() => onNavigate('gantt')} className="text-[#12b3a8] text-xs font-medium flex items-center gap-1 group">
              Timeline <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="space-y-1">
            {state.milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-xl transition-colors group"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  milestone.status === 'completed' ? 'bg-emerald-400' :
                  milestone.status === 'in_progress' ? 'bg-[#12b3a8]' : 'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{milestone.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" /> {milestone.date}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-0.5 text-[10px] font-medium rounded-full ${
                  milestone.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-600'
                    : milestone.status === 'in_progress'
                      ? 'bg-[#e8f8f7] text-[#12b3a8]'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {milestone.status === 'in_progress' ? 'In Progress' :
                   milestone.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-6"
          style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#e8f8f7] flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-[#12b3a8]" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-800">Recent Activity</h3>
            </div>
            <span className="text-xs text-gray-400">
              Last sync: {new Date(state.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="space-y-4">
            {state.activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#f0fafa] border border-teal-100 flex items-center justify-center text-[#12b3a8] text-[11px] font-semibold shrink-0">
                  {activity.user.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{activity.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{activity.detail}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}