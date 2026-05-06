import { useMemo, useState } from "react";
import { useProjectData } from "@/context/ProjectDataContext";
import { TaskStatus } from "@/lib/types";

const statusOptions: TaskStatus[] = ["not_started", "in_progress", "at_risk", "completed"];

export default function GanttEditor() {
  const { state, updateTask, createTask, userRole } = useProjectData();
  const [draft, setDraft] = useState({
    name: "",
    start: "",
    end: "",
    assigned: "Unassigned",
    status: "not_started" as TaskStatus,
    progress: 0,
  });

  const tasks = state?.tasks ?? [];
  const resources = state?.resources ?? [];
  const canEdit = userRole !== "viewer";
  const ordered = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [tasks],
  );

  if (!state) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gantt Editor</h1>
        <p className="text-gray-500">Create and update task progress, dates, owners, and status.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Create Task</h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <input className="border rounded px-2 py-2" placeholder="Task name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="border rounded px-2 py-2" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
          <input className="border rounded px-2 py-2" type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
          <select
            className="border rounded px-2 py-2"
            value={draft.assigned}
            onChange={(e) => setDraft({ ...draft, assigned: e.target.value })}
          >
            <option value="Unassigned">Unassigned</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.name}>
                {resource.name}
              </option>
            ))}
          </select>
          <select className="border rounded px-2 py-2" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status.replace("_", " ")}</option>
            ))}
          </select>
          <input className="border rounded px-2 py-2" type="number" min={0} max={100} value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} />
          <button
            disabled={!canEdit || !draft.name || !draft.start || !draft.end}
            onClick={async () => {
              await createTask(draft);
              setDraft({ name: "", start: "", end: "", assigned: "Unassigned", status: "not_started", progress: 0 });
            }}
            className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
          >
            Add Task
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Task</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Start</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">End</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Assigned</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Status</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Progress</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((task) => (
              <tr key={task.id} className="border-b">
                <td className="px-3 py-2 text-sm">{task.name}</td>
                <td className="px-3 py-2"><input disabled={!canEdit} className="border rounded px-2 py-1 text-sm" type="date" value={task.start} onChange={(e) => void updateTask(task.id, { start: e.target.value })} /></td>
                <td className="px-3 py-2"><input disabled={!canEdit} className="border rounded px-2 py-1 text-sm" type="date" value={task.end} onChange={(e) => void updateTask(task.id, { end: e.target.value })} /></td>
                <td className="px-3 py-2">
                  <select
                    disabled={!canEdit}
                    className="border rounded px-2 py-1 text-sm"
                    value={task.assigned || "Unassigned"}
                    onChange={(e) => void updateTask(task.id, { assigned: e.target.value })}
                  >
                    <option value="Unassigned">Unassigned</option>
                    {resources.map((resource) => (
                      <option key={resource.id} value={resource.name}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select disabled={!canEdit} className="border rounded px-2 py-1 text-sm" value={task.status} onChange={(e) => void updateTask(task.id, { status: e.target.value as TaskStatus })}>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status.replace("_", " ")}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <input
                      disabled={!canEdit}
                      type="range"
                      min={0}
                      max={100}
                      value={task.progress}
                      onChange={(e) => void updateTask(task.id, { progress: Number(e.target.value) })}
                    />
                    <span className="text-sm w-10">{task.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
