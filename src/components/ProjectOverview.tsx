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
  Save,
  Clock
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
      { label: 'Total Tasks', value: `${dashboard.totalTasks}`, icon: FileText },
      { label: 'Completed', value: `${dashboard.tasksCompleted}`, icon: CheckCircle },
      { label: 'In Progress', value: `${dashboard.inProgress}`, icon: TrendingUp },
      { label: 'Tracked Risks', value: `${state.risks.length}`, icon: AlertCircle },
    ];
  }, [dashboard, state]);

  if (!state || !dashboard) return null;

  const projectData = isEditing
    ? { ...state.project, ...draft }
    : state.project;

  return (
    <div className="space-y-8 p-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">
            Project Overview
          </h1>
          <p className="text-gray-500 text-sm mt-1">Detailed lifecycle management and analytics</p>
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
          className={`px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold text-sm shadow-sm ${
            isEditing
              ? 'bg-[#0f3433] text-white hover:bg-black'
              : 'bg-[#12b3a8] text-white hover:bg-[#0e9188]'
          }`}
        >
          {isEditing ? (
            <><Save className="w-4 h-4" /> Save Changes</>
          ) : (
            <><Edit2 className="w-4 h-4" /> Edit Project</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Info Card */}
          <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-[#0f3433] mb-6">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Project Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#12b3a8]/20 focus:border-[#12b3a8] outline-none"
                  />
                ) : (
                  <p className="text-[#0f3433] font-bold text-base">{projectData.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Client Name</label>
                <p className="text-[#0f3433] font-bold text-base">{state.project.client}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Global Location</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#12b3a8]" />
                  <span className="text-[#0f3433] font-semibold">{state.project.location}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Total Budget</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <DollarSign className="w-4 h-4 text-[#12b3a8]" />
                  <span className="text-[#0f3433] font-bold text-lg">{state.project.budget}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Start Date</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-[#0f3433] font-semibold">{state.project.startDate}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Projected End</label>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-[#0f3433] font-semibold">{state.project.endDate}</span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-50">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Project Description</label>
              {isEditing ? (
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#12b3a8]/20 focus:border-[#12b3a8] outline-none"
                />
              ) : (
                <p className="text-gray-600 mt-2 text-sm leading-relaxed font-medium">{projectData.description}</p>
              )}
            </div>
          </div>

          {/* Phase Progress Card */}
          <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-[#0f3433] mb-6">Phase Lifecycle Progress</h3>
            <div className="space-y-6">
              {phases.map((phase, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#0f3433]">{phase.name}</span>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        {phase.completed} / {phase.tasks} Tasks Complete
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-[#12b3a8]">{phase.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        phase.progress === 100 ? 'bg-[#12b3a8]' : 
                        phase.progress >= 50 ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${phase.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Cards Area */}
        <div className="space-y-6">
          {/* Quick Stats Card */}
          <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-[#0f3433] mb-5 uppercase tracking-widest">Snapshot</h3>
            <div className="grid grid-cols-2 gap-4">
              {keyMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={index} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <Icon className="w-4 h-4 text-[#12b3a8] mb-2" />
                    <p className="text-2xl font-bold text-[#0f3433]">{metric.value}</p>
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{metric.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Health Card */}
          <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-[#0f3433] mb-6 uppercase tracking-widest text-center border-b border-gray-50 pb-4">Project Health</h3>
            <div className="space-y-5">
              {[
                { label: 'Overall Status', status: dashboard.overdueTasks ? 'Attention' : 'Healthy', color: dashboard.overdueTasks ? 'bg-amber-400' : 'bg-[#12b3a8]' },
                { label: 'Budget Tracker', status: 'In Range', color: 'bg-[#12b3a8]' },
                { label: 'Schedule Health', status: dashboard.overdueTasks ? `${dashboard.overdueTasks} Overdue` : 'On Track', color: dashboard.overdueTasks ? 'bg-red-400' : 'bg-[#12b3a8]' },
                { label: 'Team Capacity', status: `${dashboard.resourceUtilization}%`, color: 'bg-emerald-400' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                    <span className="text-[11px] font-bold text-[#0f3433] uppercase">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Footer (Dark Theme) */}
          <div className="bg-[#0f3433] rounded-[28px] p-7 text-white relative overflow-hidden shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-[#12b3a8]" />
                <h3 className="text-lg font-bold tracking-tight">AI Insights</h3>
              </div>
              <p className="text-[#a0c4c2] text-[13px] leading-relaxed mb-6 font-medium">
                Analysis of latest WBS shows <span className="text-white font-bold">{dashboard.criticalTasks} critical path</span> tasks. Active risk profile is stable.
              </p>
              <div className="flex items-center gap-2 py-2 px-3 bg-white/5 rounded-xl border border-white/10">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  Synced: {new Date(state.lastUpdatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
            {/* Background decorative glow */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#12b3a8]/10 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}