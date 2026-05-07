import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Layers,
  MousePointer2
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';
import { TaskStatus } from '@/lib/types';

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export default function GanttChart() {
  const { state, generateArtifacts, updateTaskStatus, assignTask, moveTask, userRole, saveBaseline } =
    useProjectData();
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [zoomScale, setZoomScale] = useState(100);
  const [showCritical, setShowCritical] = useState(false);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const tasks = state?.tasks ?? [];
  const resources = state?.resources ?? [];
  const orderedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const parentA = (a.parentActivity ?? "").toLowerCase();
      const parentB = (b.parentActivity ?? "").toLowerCase();
      if (parentA !== parentB) return parentA.localeCompare(parentB);
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  }, [tasks]);

  const baseDayWidth =
    zoomLevel === 'day' ? 40 : zoomLevel === 'week' ? 20 : zoomLevel === 'month' ? 8 : 4;
  const dayWidth = Math.max(2, (baseDayWidth * zoomScale) / 100);

  const totalDays = useMemo(() => {
    if (!tasks.length) return 120;
    const start = new Date(Math.min(...tasks.map((task) => new Date(task.start).getTime())));
    const end = new Date(Math.max(...tasks.map((task) => new Date(task.end).getTime())));
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [tasks]);

  const chartStart = useMemo(
    () =>
      tasks.length
        ? new Date(Math.min(...tasks.map((task) => new Date(task.start).getTime())))
        : new Date('2025-09-01'),
    [tasks],
  );

  const getTaskPosition = (date: Date) => {
    const start = chartStart;
    const days = Math.ceil((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days * (dayWidth / 1);
  };

  const getTaskWidth = (start: Date, end: Date) => {
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(days * (dayWidth / 1), 20);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMonthHeaders = () => {
    const months = [];
    const start = tasks.length
      ? new Date(Math.min(...tasks.map((task) => new Date(task.start).getTime())))
      : new Date('2025-09-01');
    const end = tasks.length
      ? new Date(Math.max(...tasks.map((task) => new Date(task.end).getTime())))
      : new Date('2026-12-31');
    let current = new Date(start);

    while (current <= end) {
      months.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        days: new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate() - current.getDate() + 1,
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return months;
  };

  const statusColors = {
    completed: 'bg-[#12b3a8]',
    in_progress: 'bg-emerald-400',
    not_started: 'bg-gray-200',
    at_risk: 'bg-amber-400',
  };

  const filteredTasks = showCritical ? orderedTasks.filter(t => t.isCritical) : orderedTasks;
  const canEditTasks = userRole !== "viewer";
  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0] ?? null;
  const resourceMap = useMemo(() => new Map(resources.map((resource) => [resource.id, resource.name])), [resources]);
  
  const dependencySegments = useMemo(() => {
    if (!showDependencies) return [];
    const visibleTaskMap = new Map<string, { row: number; x: number; width: number; y: number }>();

    filteredTasks.forEach((task, row) => {
      const x = getTaskPosition(new Date(task.start));
      const width = task.isMilestone ? 24 : getTaskWidth(new Date(task.start), new Date(task.end));
      const y = row * 48 + 24; // Adjusted for padding
      visibleTaskMap.set(task.id, { row, x, width, y });
      if (task.activityId) {
        visibleTaskMap.set(task.activityId, { row, x, width, y });
      }
    });

    const segments: Array<{ key: string; d: string }> = [];
    for (const task of filteredTasks) {
      if (!task.dependencies?.length) continue;
      const target = visibleTaskMap.get(task.activityId || task.id);
      if (!target) continue;

      task.dependencies.forEach((dep, idx) => {
        const source = visibleTaskMap.get(dep);
        if (!source) return;
        const sourceX = source.x + source.width;
        const targetX = target.x;
        const bendX = sourceX + 10;
        const d = `M ${sourceX} ${source.y} L ${bendX} ${source.y} L ${bendX} ${target.y} L ${targetX} ${target.y}`;
        segments.push({ key: `${task.id}-${dep}-${idx}`, d });
      });
    }
    return segments;
  }, [filteredTasks, getTaskPosition, getTaskWidth, showDependencies]);

  if (!state) return null;

  return (
    <div className="space-y-8 p-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">Gantt Chart</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Visual project timeline and resource allocation</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={async () => {
              setIsUpdating(true);
              try { await generateArtifacts(); } finally { setIsUpdating(false); }
            }}
            className="px-6 py-2.5 bg-[#12b3a8] text-white text-xs font-bold uppercase tracking-[1.5px] rounded-xl hover:bg-[#0e9188] transition-all shadow-sm flex items-center gap-2"
          >
            {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isUpdating ? 'Syncing...' : 'AI Update'}
          </button>
        </div>
      </div>

      {/* Main Gantt Card */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-gray-50 bg-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
              {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => { setZoomLevel(level); setZoomScale(100); }}
                  className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all ${
                    zoomLevel === level ? 'bg-white text-[#12b3a8] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Feature Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowCritical(!showCritical)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border ${
                  showCritical ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                Critical Path
              </button>
              <button
                onClick={() => setShowBaseline(!showBaseline)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all border ${
                  showBaseline ? 'bg-gray-100 border-gray-100 text-[#0f3433]' : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                Baseline
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
              <button onClick={() => setZoomScale(prev => Math.max(1, prev - 10))} className="text-gray-400 hover:text-[#12b3a8]"><ZoomOut className="w-4 h-4" /></button>
              <input
                type="range" min={1} max={250} value={zoomScale}
                onChange={(e) => setZoomScale(Number(e.target.value))}
                className="w-20 accent-[#12b3a8]"
              />
              <span className="text-[10px] font-black text-[#0f3433] w-8">{zoomScale}%</span>
              <button onClick={() => setZoomScale(prev => Math.min(250, prev + 10))} className="text-gray-400 hover:text-[#12b3a8]"><ZoomIn className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Date Range Navigation */}
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Active View</span>
                <span className="text-xs font-bold text-[#0f3433]">
                  {filteredTasks.length ? `${formatDate(chartStart)} - ...` : 'Timeline'}
                </span>
            </div>
            <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Scrollable Gantt Body */}
        <div className="overflow-x-auto bg-white">
          <div className="min-w-full" style={{ width: `${totalDays * dayWidth + 340}px` }}>
            <div className="flex">
              {/* Task Sidebar */}
              <div className="w-[340px] flex-shrink-0 border-r border-gray-100 bg-gray-50/30 sticky left-0 z-20 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">WBS Element / Activity</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`px-5 py-3 flex flex-col gap-1 hover:bg-white transition-colors h-[48px] justify-center group cursor-pointer ${
                        selectedTask?.id === task.id ? "bg-[#f0f9f8]" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {task.isMilestone ? (
                            <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 flex-shrink-0" />
                          ) : (
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[task.status]}`} />
                          )}
                          <span className="text-[12px] font-bold text-[#0f3433] truncate leading-tight">
                             {task.activityId ? `${task.activityId}: ` : ''}{task.name}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-tight ${
                          task.status === 'completed' ? 'bg-[#f0f9f8] text-[#12b3a8]' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {task.progress}%
                        </span>
                      </div>
                      {/* Secondary Info Layer */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[9px] font-bold text-gray-400 uppercase">{task.assigned || 'Unassigned'}</span>
                         {canEditTasks && <button onClick={() => {}} className="text-[9px] font-black text-[#12b3a8] uppercase">Edit</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Container */}
              <div className="flex-1 overflow-hidden">
                {/* Timeline Headers */}
                <div className="border-b border-gray-100 bg-gray-50/50">
                  <div className="flex">
                    {getMonthHeaders().map((month, index) => (
                      <div
                        key={index}
                        className="border-r border-gray-100/50 px-3 py-4 text-left"
                        style={{ width: `${month.days * dayWidth}px` }}
                      >
                        <span className="text-[10px] font-extrabold text-[#0f3433] uppercase tracking-widest">{month.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Bars Area */}
                <div className="relative" style={{ height: `${filteredTasks.length * 48}px` }}>
                  {/* Grid Lines */}
                  <div className="absolute inset-0">
                    {getMonthHeaders().map((month, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 border-r border-gray-50 h-full"
                        style={{ left: `${getTaskPosition(month.date)}px`, width: `${month.days * dayWidth}px` }}
                      />
                    ))}
                  </div>

                  {/* Task Bars */}
                  {filteredTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="absolute flex items-center"
                      style={{ top: `${index * 48}px`, height: '48px' }}
                    >
                      {task.isMilestone ? (
                        <div
                          className="absolute h-4 w-4 bg-amber-400 rotate-45 shadow-sm border border-white"
                          style={{ left: `${getTaskPosition(new Date(task.start))}px` }}
                        />
                      ) : (
                        <div className="relative h-full flex items-center">
                          {/* Baseline Shadow */}
                          {showBaseline && task.baselineStart && task.baselineEnd && (
                            <div
                              className="absolute h-2.5 rounded-full bg-gray-100/80 border border-gray-200/50 -bottom-1"
                              style={{
                                left: `${getTaskPosition(new Date(task.baselineStart))}px`,
                                width: `${getTaskWidth(new Date(task.baselineStart), new Date(task.baselineEnd))}px`,
                              }}
                            />
                          )}
                          {/* Primary Bar */}
                          <div
                            className={`absolute h-4 rounded-full shadow-sm transition-all group ${statusColors[task.status]} ${
                              task.isCritical ? "ring-2 ring-red-400/30" : ""
                            }`}
                            style={{
                              left: `${getTaskPosition(new Date(task.start))}px`,
                              width: `${getTaskWidth(new Date(task.start), new Date(task.end))}px`,
                            }}
                          >
                            {/* Inner Progress Fill */}
                            <div className="h-full bg-white/20 rounded-full" style={{ width: `${task.progress}%` }} />
                            
                            {/* Hover Details Pin */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0f3433] text-white text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                               {task.progress}% Complete
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Dependency SVG Layer */}
                  {showDependencies && (
                    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
                      <defs>
                        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                          <path d="M0,0 L6,3 L0,6 z" fill="#cbd5e1" />
                        </marker>
                      </defs>
                      {dependencySegments.map((segment) => (
                        <path
                          key={segment.key}
                          d={segment.d}
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1"
                          markerEnd="url(#arrow)"
                          opacity="0.8"
                        />
                      ))}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Dataset Size', val: filteredTasks.length, icon: Layers, color: 'text-[#12b3a8]' },
          { label: 'Tasks Closed', val: filteredTasks.filter(t => t.status === 'completed').length, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Work-In-Progress', val: filteredTasks.filter(t => t.status === 'in_progress').length, icon: MousePointer2, color: 'text-[#0f3433]' },
          { label: 'Critical Path', val: filteredTasks.filter(t => t.isCritical).length, icon: AlertTriangle, color: 'text-red-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] flex items-center gap-4">
            <div className={`p-3 bg-gray-50 rounded-xl ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0f3433] leading-none mb-1">{stat.val}</p>
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Task Control Center</p>
              <h3 className="text-lg font-bold text-[#0f3433] mt-1">{selectedTask.name}</h3>
            </div>
            <div className="text-sm text-gray-500">
              {selectedTask.start} - {selectedTask.end}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Assignment</label>
              <select
                disabled={!canEditTasks}
                value={selectedTask.assignedResourceId || ""}
                onChange={(e) => void assignTask(selectedTask.id, e.target.value)}
                className="mt-1 w-full bg-gray-50 rounded-lg border border-gray-100 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Status</label>
              <select
                disabled={!canEditTasks}
                value={selectedTask.status}
                onChange={(e) => void updateTaskStatus(selectedTask.id, e.target.value as TaskStatus)}
                className="mt-1 w-full bg-gray-50 rounded-lg border border-gray-100 px-3 py-2 text-sm"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="at_risk">At Risk</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Schedule</label>
              <button
                disabled={!canEditTasks}
                onClick={() => void moveTask(selectedTask.id, selectedTask.start, selectedTask.end)}
                className="mt-1 w-full bg-[#0f3433] text-white rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Confirm Current Dates
              </button>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Allocated to: <span className="font-semibold text-[#0f3433]">{selectedTask.assignedResourceId ? (resourceMap.get(selectedTask.assignedResourceId) || selectedTask.assigned || "Unassigned") : (selectedTask.assigned || "Unassigned")}</span>
          </p>
        </div>
      )}

      {/* Bottom Context Card */}
      <div className="bg-[#0f3433] rounded-[28px] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold mb-2">Automated Lifecycle Tracking</h3>
            <p className="text-[#a0c4c2] text-sm max-w-xl font-medium leading-relaxed">
              This Gantt structure is derived from AI ingestion of project schedules. Updates to dates and status are synchronized with the primary WBS and document repository in real-time.
            </p>
          </div>
          <button
            onClick={() => void saveBaseline(state.project.id)}
            className="px-8 py-3 bg-[#12b3a8] text-white text-sm font-bold rounded-xl hover:bg-[#0e9188] transition-all shadow-lg shadow-[#12b3a8]/20 active:scale-95"
          >
            Freeze Master Baseline
          </button>
        </div>
        {/* Background glow decoration */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#12b3a8]/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}