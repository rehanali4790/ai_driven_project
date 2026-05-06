import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export default function GanttChart() {
  const { state, generateArtifacts, updateTaskStatus, assignTask, moveTask, userRole, saveBaseline } =
    useProjectData();
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [zoomScale, setZoomScale] = useState(100);
  const [showCritical, setShowCritical] = useState(false);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [viewStart] = useState(new Date('2025-09-01'));
  const [isUpdating, setIsUpdating] = useState(false);

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
    completed: 'bg-green-500',
    in_progress: 'bg-green-400',
    not_started: 'bg-gray-300',
    at_risk: 'bg-amber-500',
  };

  const filteredTasks = showCritical ? orderedTasks.filter(t => t.isCritical) : orderedTasks;
  const canEditTasks = userRole !== "viewer";
  const dependencySegments = useMemo(() => {
    if (!showDependencies) return [];
    const visibleTaskMap = new Map<string, { row: number; x: number; width: number; y: number }>();

    filteredTasks.forEach((task, row) => {
      const x = getTaskPosition(new Date(task.start));
      const width = task.isMilestone ? 24 : getTaskWidth(new Date(task.start), new Date(task.end));
      const y = row * 44 + 22;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gantt Chart</h1>
          <p className="text-gray-500">Project timeline and task scheduling</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={async () => {
              setIsUpdating(true);
              try {
                await generateArtifacts();
              } finally {
                setIsUpdating(false);
              }
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isUpdating ? 'Updating...' : 'AI Update'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setZoomLevel(level);
                    setZoomScale(100);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    zoomLevel === level
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCritical(!showCritical)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                showCritical
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Critical Path
            </button>
            <button
              onClick={() => setShowBaseline(!showBaseline)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showBaseline ? 'bg-slate-100 text-slate-800' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Baseline
            </button>
            {userRole !== 'viewer' && (
              <button
                type="button"
                onClick={() => void saveBaseline(state.project.id)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Save baseline
              </button>
            )}
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showDependencies
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Dependencies
            </button>
            <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
              <button
                onClick={() => setZoomScale((prev) => Math.max(1, prev - 10))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Zoom out gantt chart"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <input
                type="range"
                min={1}
                max={250}
                step={1}
                value={zoomScale}
                onChange={(e) => setZoomScale(Number(e.target.value))}
                className="w-24"
                title="Gantt chart zoom scale"
              />
              <span className="text-xs font-medium text-gray-700 w-10 text-right">{zoomScale}%</span>
              <button
                onClick={() => setZoomScale((prev) => Math.min(250, prev + 10))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Zoom in gantt chart"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {filteredTasks.length
                ? `${formatDate(new Date(Math.min(...filteredTasks.map((task) => new Date(task.start).getTime()))))} - ${formatDate(new Date(Math.max(...filteredTasks.map((task) => new Date(task.end).getTime()))))}`
                : `${formatDate(viewStart)} - ${formatDate(new Date(viewStart.getTime() + 90 * 24 * 60 * 60 * 1000))}`}
            </span>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full" style={{ width: `${totalDays * dayWidth + 300}px` }}>
            <div className="flex">
              <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-gray-50">
                <div className="p-3 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Task Name</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredTasks.map((task) => {
                    const displayName = task.activityId 
                      ? `${task.activityId}: ${task.name}`
                      : task.name;
                    
                    return (
                      <div
                        key={task.id}
                        className="px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {task.isMilestone ? (
                            <div className="w-4 h-4 bg-amber-500 rotate-45 flex-shrink-0" />
                          ) : (
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                task.status === "completed"
                                  ? "bg-green-500"
                                  : task.status === "in_progress"
                                  ? "bg-green-300"
                                  : task.status === "at_risk"
                                  ? "bg-amber-500"
                                  : "bg-gray-300"
                              } ${task.isCritical ? "ring-2 ring-red-400 ring-offset-1" : ""}`}
                            />
                          )}
                          <span className="text-sm text-gray-900 truncate" title={displayName}>
                            {displayName}
                          </span>
                          {typeof task.totalFloat === 'number' && (
                            <span className="text-[10px] text-gray-400 ml-1 shrink-0">Float {task.totalFloat}d</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ml-2 ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-emerald-100 text-emerald-700' :
                          task.status === 'at_risk' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {task.progress}%
                        </span>
                        {canEditTasks && (
                          <select
                            value={task.status}
                            onChange={(e) => void updateTaskStatus(task.id, e.target.value as any)}
                            className="ml-2 text-xs border border-gray-200 rounded px-1 py-0.5"
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="at_risk">At Risk</option>
                            <option value="completed">Completed</option>
                          </select>
                        )}
                        {canEditTasks && (
                          <select
                            value={
                              task.assignedResourceId ||
                              resources.find((r) => r.name === task.assigned)?.id ||
                              ""
                            }
                            onChange={(e) => void assignTask(task.id, e.target.value || "Unassigned")}
                            className="ml-2 text-xs border border-gray-200 rounded px-1 py-0.5 w-28"
                            title="Assign resource"
                          >
                            <option value="">Unassigned</option>
                            {resources.map((resource) => (
                              <option key={resource.id} value={resource.id}>
                                {resource.scope === "global" ? `[Org] ${resource.name}` : resource.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {canEditTasks && (
                          <button
                            onClick={() => {
                              const nextStart = prompt("New start date (YYYY-MM-DD)", task.start);
                              const nextEnd = prompt("New end date (YYYY-MM-DD)", task.end);
                              if (nextStart && nextEnd) {
                                void moveTask(task.id, nextStart, nextEnd);
                              }
                            }}
                            className="ml-2 text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
                          >
                            Move
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1">
                <div className="border-b border-gray-200">
                  <div className="flex">
                    {getMonthHeaders().map((month, index) => (
                      <div
                        key={index}
                        className="border-r border-gray-200 px-2 py-2 text-center bg-gray-50"
                        style={{ width: `${month.days * dayWidth}px` }}
                      >
                        <span className="text-xs font-semibold text-gray-700">{month.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative" style={{ height: `${filteredTasks.length * 44}px` }}>
                  <div className="absolute inset-0">
                    {getMonthHeaders().map((month, monthIndex) => (
                      <div
                        key={monthIndex}
                        className="absolute top-0 border-r border-gray-100"
                        style={{ left: `${getTaskPosition(month.date)}px`, width: `${month.days * dayWidth}px`, height: '100%' }}
                      />
                    ))}

                    {[...Array(Math.ceil(totalDays / (zoomLevel === 'day' ? 7 : zoomLevel === 'week' ? 7 : zoomLevel === 'month' ? 7 : 30)))].map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 border-r border-gray-200 border-dashed opacity-50"
                        style={{ left: `${i * (zoomLevel === 'day' ? 280 : zoomLevel === 'week' ? 140 : zoomLevel === 'month' ? 56 : 120)}px`, height: '100%' }}
                      />
                    ))}
                  </div>

                  {filteredTasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="absolute flex items-center"
                      style={{ top: `${index * 44}px`, height: '44px' }}
                    >
                      {task.isMilestone ? (
                        <div
                          className="absolute h-6 w-6 bg-amber-500 rotate-45 left-4"
                          style={{ left: `${getTaskPosition(new Date(task.start))}px` }}
                        />
                      ) : (
                        <>
                          {showBaseline && task.baselineStart && task.baselineEnd && (
                            <div
                              className="absolute h-4 rounded-sm bg-gray-300/70 border border-gray-400/80 z-0"
                              style={{
                                left: `${getTaskPosition(new Date(task.baselineStart))}px`,
                                width: `${getTaskWidth(new Date(task.baselineStart), new Date(task.baselineEnd))}px`,
                              }}
                              title="Baseline"
                            />
                          )}
                          <div
                            className={`absolute h-5 rounded-full z-[1] ${statusColors[task.status]} ${
                              task.isCritical ? "ring-2 ring-red-300" : ""
                            }`}
                            style={{
                              left: `${getTaskPosition(new Date(task.start))}px`,
                              width: `${getTaskWidth(new Date(task.start), new Date(task.end))}px`,
                            }}
                          >
                            <div
                              className="h-full bg-white/35 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            />
                            <span className="absolute -right-2 -top-5 px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
                              {task.progress}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {showDependencies && dependencySegments.length > 0 && (
                    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
                      <defs>
                        <marker
                          id="gantt-dependency-arrow"
                          markerWidth="8"
                          markerHeight="8"
                          refX="6"
                          refY="4"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path d="M0,0 L8,4 L0,8 z" fill="#64748b" />
                        </marker>
                      </defs>
                      {dependencySegments.map((segment) => (
                        <path
                          key={segment.key}
                          d={segment.d}
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          markerEnd="url(#gantt-dependency-arrow)"
                          opacity="0.9"
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

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredTasks.length}</p>
              <p className="text-sm text-gray-500">Total Tasks</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredTasks.filter(t => t.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredTasks.filter(t => t.status === 'in_progress').length}
              </p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredTasks.filter(t => t.isCritical).length}
              </p>
              <p className="text-sm text-gray-500">Critical Tasks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        This timeline is generated from the stored task dataset. Upload revised programs or click <span className="font-medium">AI Update</span> to regenerate dates, dependencies, and milestones from the latest extracted project context.
      </div>
    </div>
  );
}
