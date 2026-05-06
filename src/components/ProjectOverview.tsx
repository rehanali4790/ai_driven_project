import { useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Edit2,
  Save
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';

export default function ProjectOverview() {
  const [isEditing, setIsEditing] = useState(false);
  const { state, dashboard } = useProjectData();
  const [draft, setDraft] = useState({
    name: state?.project.name ?? '',
    description: state?.project.description ?? '',
  });

  const phases = useMemo(() => {
    if (!state?.wbs.children) return [];
    return state.wbs.children.map((phase) => {
      const taskCount = phase.children?.length ?? 0;
      const completed = phase.children?.filter((child) => child.status === 'completed').length ?? 0;
      return { name: phase.name, progress: phase.progress, tasks: taskCount, completed };
    });
  }, [state]);

  const keyMetrics = useMemo(() => {
    if (!state || !dashboard) return [];
    return [
      { label: 'Total Tasks', value: `${dashboard.totalTasks}`, icon: FileText, color: 'blue' },
      { label: 'Completed', value: `${dashboard.tasksCompleted}`, icon: CheckCircle, color: 'green' },
      { label: 'In Progress', value: `${dashboard.inProgress}`, icon: TrendingUp, color: 'amber' },
      { label: 'Tracked Risks', value: `${state.risks.length}`, icon: AlertCircle, color: 'red' },
    ];
  }, [dashboard, state]);

  if (!state || !dashboard) return null;

  const projectData = isEditing
    ? { ...state.project, ...draft }
    : state.project;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Overview</h1>
          <p className="text-gray-500">View and manage project details</p>
        </div>
        <button
          onClick={() => {
            if (!isEditing) {
              setDraft({
                name: state.project.name,
                description: state.project.description,
              });
            }
            setIsEditing(!isEditing);
          }}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
            isEditing
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isEditing ? (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              Edit Project
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-500">Project Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 font-medium mt-1">{projectData.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500">Client</label>
                <p className="text-gray-900 font-medium mt-1">{state.project.client}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Location</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{state.project.location}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Total Budget</label>
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 font-semibold">{state.project.budget}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Start Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{state.project.startDate}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">End Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{state.project.endDate}</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="text-sm text-gray-500">Description</label>
              {isEditing ? (
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-gray-700 mt-1">{projectData.description}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase Progress</h3>
            <div className="space-y-4">
              {phases.map((phase, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{phase.name}</span>
                      <span className="text-xs text-gray-500">
                        {phase.completed}/{phase.tasks} tasks
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{phase.progress}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        phase.progress === 100
                          ? 'bg-green-500'
                          : phase.progress >= 50
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              {keyMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="p-2 w-fit rounded-lg bg-slate-100 mb-2">
                      <Icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-xs text-gray-500">{metric.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Health</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${dashboard.overdueTasks ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                  <span className={`text-sm font-medium ${dashboard.overdueTasks ? 'text-amber-700' : 'text-green-700'}`}>
                    {dashboard.overdueTasks ? 'Needs Attention' : 'On Track'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Budget Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">AI Monitoring Only</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Timeline</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${dashboard.overdueTasks ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className={`text-sm font-medium ${dashboard.overdueTasks ? 'text-red-700' : 'text-green-700'}`}>
                    {dashboard.overdueTasks ? `${dashboard.overdueTasks} overdue tasks` : 'Healthy schedule'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Resource Utilization</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">{dashboard.resourceUtilization}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6" />
              <h3 className="text-lg font-semibold">AI Analysis</h3>
            </div>
            <p className="text-blue-100 text-sm mb-4">
              Based on the latest document-derived schedule, the project contains {dashboard.criticalTasks} critical tasks and {state.risks.length} active risks. Re-upload revised schedules to refresh this forecast automatically.
            </p>
            <div className="w-full py-2 bg-white/20 rounded-lg text-sm font-medium text-center">
              Last synchronized {new Date(state.lastUpdatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
