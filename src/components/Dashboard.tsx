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
    { label: 'Overall Progress', value: `${dashboard.overallProgress}%`, trend: `${state.documents.length} docs`, positive: true, icon: Activity },
    { label: 'Tasks Completed', value: `${dashboard.tasksCompleted}/${dashboard.totalTasks}`, trend: `${dashboard.inProgress} active`, positive: true, icon: CheckCircle },
    { label: 'Resource Utilization', value: `${dashboard.resourceUtilization}%`, trend: `${state.resources.length} resources`, positive: true, icon: Database },
    { label: 'Overdue Tasks', value: `${dashboard.overdueTasks}`, trend: `${dashboard.criticalTasks} critical`, positive: dashboard.overdueTasks === 0, icon: AlertTriangle },
  ];

  const topResources = [...state.resources]
    .sort((a, b) => b.allocated - a.allocated)
    .slice(0, 4);

  return (
    <div className="space-y-8 p-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433]">Project Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Live project health driven by documents and AI analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('documents')}
            className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            Upload Document
          </button>
          <button
            onClick={() => onNavigate('ai')}
            className="px-5 py-2.5 bg-[#12b3a8] text-white font-medium rounded-xl hover:bg-[#0e9188] transition-all shadow-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" />
            Ask AI
          </button>
        </div>
      </div>

      {/* Stats Grid - Reference Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-[13px] font-medium mb-1 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#12b3a8]" />
                    {stat.label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-[#0f3433]">{stat.value}</h3>
                    <div className={`flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded ${stat.positive ? 'text-green-600' : 'text-red-500'}`}>
                      {stat.positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {stat.trend}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#0f3433]">AI Insights</h3>
            <span className="px-3 py-1 bg-[#e8f8f7] text-[#12b3a8] text-xs font-bold rounded-full">
              LIVE ANALYSIS
            </span>
          </div>
          <div className="space-y-4">
            {state.insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border-l-4 transition-all ${
                  insight.type === 'risk'
                    ? 'bg-red-50/50 border-red-400'
                    : insight.type === 'suggestion'
                      ? 'bg-amber-50/50 border-amber-400'
                      : 'bg-[#f0f9f8] border-[#12b3a8]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {insight.type === 'risk' ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Zap className="w-5 h-5 text-[#12b3a8]" />}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Resource Load */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#0f3433]">Resource Load</h3>
            <button onClick={() => onNavigate('resources')} className="text-[#12b3a8] text-sm font-semibold hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-5">
            {topResources.map((resource) => (
              <div key={resource.id}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-[#0f3433]">{resource.name}</span>
                  <span className={`font-bold ${resource.allocated >= 90 ? 'text-red-500' : 'text-[#12b3a8]'}`}>{resource.allocated}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      resource.allocated >= 90 ? 'bg-red-400' : 
                      resource.allocated >= 70 ? 'bg-amber-400' : 'bg-[#12b3a8]'
                    }`}
                    style={{ width: `${resource.allocated}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#0f3433]">Milestones</h3>
            <button onClick={() => onNavigate('gantt')} className="text-[#12b3a8] text-sm font-semibold flex items-center gap-1 group">
              Timeline <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="space-y-4">
            {state.milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <div className={`p-2.5 rounded-xl ${
                  milestone.status === 'completed' ? 'bg-green-50 text-green-600' :
                  milestone.status === 'in_progress' ? 'bg-[#e8f8f7] text-[#12b3a8]' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Target className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0f3433] truncate">{milestone.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {milestone.date}
                  </p>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-lg ${
                  milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                  milestone.status === 'in_progress' ? 'bg-[#e8f8f7] text-[#12b3a8]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {milestone.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#0f3433]">Recent Activity</h3>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Last Sync: {new Date(state.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="space-y-5">
            {state.activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="w-9 h-9 bg-[#f0f9f8] border border-[#e0f2f1] rounded-xl flex items-center justify-center text-[#12b3a8] text-xs font-bold">
                  {activity.user.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">
                    <span className="font-bold text-[#0f3433]">{activity.action}</span>
                    <span className="text-gray-500 text-xs ml-1 block mt-0.5">{activity.detail}</span>
                  </p>
                </div>
                <span className="text-[10px] font-medium text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Footer Section */}
      <div className="bg-[#0f3433] rounded-[24px] p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold mb-2">Need Deep Project Analysis?</h3>
            <p className="text-[#a0c4c2] text-sm max-w-md">
              Ask AI to parse PDFs, regenerate WBS, or identify critical path delays in seconds.
            </p>
          </div>
          <button
            onClick={() => onNavigate('ai')}
            className="px-8 py-3 bg-[#12b3a8] text-white font-bold rounded-xl hover:bg-[#0e9188] transition-all shadow-lg whitespace-nowrap"
          >
            Chat with AI Assistant
          </button>
        </div>
        {/* Subtle background decoration to match modern UI */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
      </div>
    </div>
  );
}