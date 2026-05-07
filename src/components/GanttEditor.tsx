import { useMemo, useState } from "react";
import { useProjectData } from "@/context/ProjectDataContext";
import { TaskStatus } from "@/lib/types";
import { Plus, Target, BarChart3, Edit3 } from "lucide-react";

const statusOptions: TaskStatus[] = ["not_started", "in_progress", "at_risk", "completed"];

export default function GanttEditor() {
  const { state, workspace, updateTask, createTask, assignTask, userRole } = useProjectData();
  const [draft, setDraft] = useState({
    name: "",
    start: "",
    end: "",
    assignedResourceId: "",
    status: "not_started" as TaskStatus,
    progress: 0,
    durationDays: 5,
  });

  const tasks = state?.tasks ?? [];
  const resources = state?.resources ?? [];
  const canEdit = userRole !== "viewer";
  const activeCalendar = useMemo(
    () => workspace?.calendars.find((calendar) => calendar.id === state?.project.calendarId) ?? workspace?.calendars?.[0],
    [state?.project.calendarId, workspace?.calendars],
  );

  const isWorkingDate = (value: string) => {
    if (!value || !activeCalendar) return true;
    const current = new Date(`${value}T00:00:00`);
    const weekday = current.getDay();
    if (!activeCalendar.workWeek[weekday]) return false;
    const exception = activeCalendar.exceptions.find((item) => item.date === value);
    if (!exception) return true;
    if (exception.type === "holiday") return false;
    return (exception.hours ?? 0) > 0;
  };

  const calculateEndDate = (start: string, durationDays: number) => {
    if (!start || !activeCalendar) return start;
    const totalDays = Math.max(1, durationDays);
    const cursor = new Date(`${start}T00:00:00`);
    let count = 1;
    while (count < totalDays) {
      cursor.setDate(cursor.getDate() + 1);
      const day = cursor.getDay();
      const iso = cursor.toISOString().slice(0, 10);
      const exception = activeCalendar.exceptions.find((item) => item.date === iso);
      const working = exception ? (exception.type === "override" ? (exception.hours ?? 0) > 0 : false) : activeCalendar.workWeek[day];
      if (working) count += 1;
    }
    return cursor.toISOString().slice(0, 10);
  };

  const ordered = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [tasks],
  );

  if (!state) return null;

  return (
    <div className="space-y-8 p-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">Gantt Editor</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Fine-tune task schedules, assignments, and real-time progress</p>
        </div>
        {!canEdit && (
          <span className="px-4 py-2 bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-widest rounded-xl border border-amber-100">
            Read-Only Access
          </span>
        )}
      </div>

      {/* Create Task Card - Themed Form */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#f0f9f8] rounded-xl">
            <Plus className="w-5 h-5 text-[#12b3a8]" />
          </div>
          <h3 className="text-sm font-bold text-[#0f3433] uppercase tracking-widest">Register New Activity</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
          <div className="flex flex-col gap-1.5 xl:col-span-2">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Task Designation</label>
            <input 
              className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              placeholder="Activity name..." 
              value={draft.name} 
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
            <input 
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              type="date" 
              value={draft.start} 
              onChange={(e) => {
                const start = e.target.value;
                const end = start ? calculateEndDate(start, draft.durationDays) : draft.end;
                setDraft({ ...draft, start, end });
              }} 
            />
            {!isWorkingDate(draft.start) && draft.start && (
              <p className="text-[10px] text-amber-600 font-semibold">Start date is a non-working day in calendar.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">End Date</label>
            <input 
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              type="date" 
              value={draft.end} 
              onChange={(e) => setDraft({ ...draft, end: e.target.value })} 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Duration (working days)</label>
            <input
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              type="number"
              min={1}
              value={draft.durationDays}
              onChange={(e) => {
                const durationDays = Math.max(1, Number(e.target.value) || 1);
                const end = draft.start ? calculateEndDate(draft.start, durationDays) : draft.end;
                setDraft({ ...draft, durationDays, end });
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Assignee</label>
            <select 
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
              value={draft.assignedResourceId}
              onChange={(e) => setDraft({ ...draft, assignedResourceId: e.target.value })}
            >
              <option value="">Select Lead</option>
              {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Initial Status</label>
            <select 
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              value={draft.status} 
              onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
            >
              {statusOptions.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              disabled={!canEdit || !draft.name || !draft.start || !draft.end}
              onClick={async () => {
                const selectedResource = resources.find((resource) => resource.id === draft.assignedResourceId);
                await createTask({
                  name: draft.name,
                  start: draft.start,
                  end: draft.end,
                  status: draft.status,
                  progress: draft.progress,
                  assigned: selectedResource?.name || "Unassigned",
                  assignedResourceId: selectedResource?.id,
                });
                setDraft({ name: "", start: "", end: "", assignedResourceId: "", status: "not_started", progress: 0, durationDays: 5 });
              }}
              className="w-full bg-[#0f3433] hover:bg-black text-white font-bold text-xs uppercase tracking-widest rounded-xl py-3 shadow-lg transition-all disabled:opacity-40 active:scale-95 flex items-center justify-center gap-2"
            >
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Task Table */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-gray-300" />
            <h3 className="text-sm font-bold text-[#0f3433] uppercase tracking-widest">Timeline Data Master</h3>
          </div>
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
            Showing {ordered.length} activities
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 text-left">
              <tr>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Activity Name</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Schedule Dates</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Lead Entity</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ordered.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 group-focus-within:translate-x-1 transition-transform">
                      <Edit3 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <input
                        disabled={!canEdit}
                        className="bg-transparent border-none p-0 text-sm font-bold text-[#0f3433] focus:ring-0 w-full placeholder:text-gray-300"
                        value={task.name}
                        onChange={(e) => void updateTask(task.id, { name: e.target.value })}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <input 
                        disabled={!canEdit} 
                        className="bg-gray-50/50 border-none rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 focus:ring-1 focus:ring-[#12b3a8]" 
                        type="date" value={task.start} 
                        onChange={(e) => void updateTask(task.id, { start: e.target.value })} 
                      />
                      <span className="text-gray-300">→</span>
                      <input 
                        disabled={!canEdit} 
                        className="bg-gray-50/50 border-none rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600 focus:ring-1 focus:ring-[#12b3a8]" 
                        type="date" value={task.end} 
                        onChange={(e) => void updateTask(task.id, { end: e.target.value })} 
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      disabled={!canEdit}
                      className="bg-transparent border-none p-0 text-xs font-semibold text-gray-600 focus:ring-0 cursor-pointer"
                      value={task.assignedResourceId || ""}
                      onChange={(e) => void assignTask(task.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      disabled={!canEdit} 
                      className={`bg-transparent border-none p-0 text-[11px] font-extrabold uppercase tracking-widest focus:ring-0 cursor-pointer appearance-none ${
                        task.status === 'completed' ? 'text-[#12b3a8]' : 'text-gray-500'
                      }`}
                      value={task.status} 
                      onChange={(e) => void updateTask(task.id, { status: e.target.value as TaskStatus })}
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 max-w-[100px] relative h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-[#12b3a8] transition-all duration-500" 
                          style={{ width: `${task.progress}%` }}
                        />
                        <input
                          disabled={!canEdit}
                          type="range" min={0} max={100}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          value={task.progress}
                          onChange={(e) => void updateTask(task.id, { progress: Number(e.target.value) })}
                        />
                      </div>
                      <span className="text-[12px] font-black text-[#0f3433] w-10 text-right">{task.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dark Legend Card */}
      <div className="bg-[#0f3433] rounded-[28px] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
            <Target className="w-7 h-7 text-[#12b3a8]" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Timeline Synchronization</h3>
            <p className="text-[#a0c4c2] text-sm font-medium max-w-lg">
              Manual date overrides are automatically reflected in the Gantt view and WBS hierarchy to maintain schedule integrity.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-xl border border-white/10 relative z-10">
          <div className="w-2 h-2 bg-[#12b3a8] rounded-full animate-pulse shadow-[0_0_10px_#12b3a8]"></div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Live persistence Active</span>
        </div>
        {/* Subtle background glow */}
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#12b3a8]/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}