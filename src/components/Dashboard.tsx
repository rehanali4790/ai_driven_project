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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Dashboard</h1>
          <p className="text-gray-500">Live project health driven by stored documents, extracted data, and OpenAI analysis</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('documents')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Document
          </button>
          <button
            onClick={() => onNavigate('ai')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Ask AI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center gap-1 text-sm ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {stat.trend}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              OpenAI Live
            </span>
          </div>
          <div className="space-y-4">
            {state.insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${
                  insight.type === 'risk'
                    ? 'bg-red-50 border-red-200'
                    : insight.type === 'suggestion'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Zap
                    className={`w-5 h-5 mt-0.5 ${
                      insight.type === 'risk'
                        ? 'text-red-500'
                        : insight.type === 'suggestion'
                          ? 'text-amber-500'
                          : 'text-blue-500'
                    }`}
                  />
                  <p className="text-sm text-gray-700">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Resource Load</h3>
            <button onClick={() => onNavigate('resources')} className="text-blue-600 text-sm hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {topResources.map((resource) => (
              <div key={resource.id}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">{resource.name}</span>
                  <span className="font-medium text-gray-900">{resource.allocated}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${resource.allocated >= 90 ? 'bg-red-500' : resource.allocated >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${resource.allocated}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Milestones</h3>
            <button onClick={() => onNavigate('gantt')} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
              View Timeline <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {state.milestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  milestone.status === 'completed' ? 'bg-green-100' :
                  milestone.status === 'in_progress' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Target className={`w-4 h-4 ${
                    milestone.status === 'completed' ? 'text-green-600' :
                    milestone.status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{milestone.name}</p>
                  <p className="text-xs text-gray-500">{milestone.date}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                  milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {milestone.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <span className="text-sm text-gray-400">{new Date(state.lastUpdatedAt).toLocaleString()}</span>
          </div>
          <div className="space-y-4">
            {state.activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {activity.user.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.action}</span>: {activity.detail}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Need Project Analysis?</h3>
            <p className="text-blue-100 text-sm">
              Use the AI assistant to query parsed PDFs, regenerate WBS, and derive the latest schedule view.
            </p>
          </div>
          <button
            onClick={() => onNavigate('ai')}
            className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            Chat with AI
          </button>
        </div>
      </div>
    </div>
  );
}
