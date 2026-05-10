import { useMemo, useState } from "react";
import { Plus, Layers, CalendarDays, Link2 } from "lucide-react";
import { useProjectData } from "@/context/ProjectDataContext";

export default function PlanningStudio() {
  const { state, createPlannedTaskNode, userRole } = useProjectData();
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = userRole !== "viewer";

  const resources = state?.resources ?? [];
  const tasks = state?.tasks ?? [];
  const wbsNodes = useMemo(() => {
    const root = state?.wbs;
    if (!root) return [];
    const out: Array<{ id: string; code: string; name: string; level: number }> = [];
    const walk = (node: typeof root) => {
      out.push({ id: node.id, code: node.code, name: node.name, level: node.level });
      (node.children ?? []).forEach(walk);
    };
    walk(root);
    return out;
  }, [state?.wbs]);
  const rootWbsId = state?.wbs?.id ?? "";
  const normalizeCode = (code: string) => code.replace(/\.0$/, "");
  const selectableParentNodes = wbsNodes.filter((node) => node.id !== rootWbsId);

  const [draft, setDraft] = useState({
    name: "",
    summary: true,
    parentWbsId: "",
    durationDays: 5,
    startDate: new Date().toISOString().slice(0, 10),
    predecessorTaskId: "",
    assignedResourceIds: [] as string[],
  });

  const taskByWbsId = useMemo(() => {
    const map = new Map<string, (typeof tasks)[number]>();
    tasks.forEach((task) => {
      if (task.wbsNodeId) map.set(task.wbsNodeId, task);
      map.set(task.id, task);
      if (task.activityId) map.set(task.activityId, task);
    });
    return map;
  }, [tasks]);

  /** Resolve dependency ids (task.id / activityId / wbsNodeId) to display names */
  const predecessorNameByRef = useMemo(() => {
    const m = new Map<string, string>();
    tasks.forEach((task) => {
      m.set(task.id, task.name);
      if (task.activityId) m.set(task.activityId, task.name);
      if (task.wbsNodeId) m.set(task.wbsNodeId, task.name);
    });
    wbsNodes.forEach((node) => {
      if (!m.has(node.id)) m.set(node.id, node.name);
    });
    return m;
  }, [tasks, wbsNodes]);

  const selectedResourceNames = useMemo(() => {
    if (!draft.assignedResourceIds.length) return "Unassigned";
    return resources
      .filter((resource) => draft.assignedResourceIds.includes(resource.id))
      .map((resource) => resource.name)
      .join(", ");
  }, [draft.assignedResourceIds, resources]);

  const toggleAssignedResource = (resourceId: string) => {
    setDraft((prev) => {
      const exists = prev.assignedResourceIds.includes(resourceId);
      return {
        ...prev,
        assignedResourceIds: exists
          ? prev.assignedResourceIds.filter((id) => id !== resourceId)
          : [...prev.assignedResourceIds, resourceId],
      };
    });
  };

  const createTask = async () => {
    if (!canEdit) return;
    if (!draft.name.trim() || !draft.durationDays || (!draft.summary && !draft.parentWbsId)) {
      setMessage(draft.summary ? "Name and duration are required." : "Name, parent and duration are required.");
      return;
    }
    setIsCreating(true);
    setMessage(null);
    try {
      await createPlannedTaskNode({
        name: draft.name.trim(),
        parentWbsId: draft.summary ? undefined : draft.parentWbsId,
        durationDays: Math.max(1, Number(draft.durationDays || 1)),
        startDate: draft.startDate || undefined,
        predecessorTaskId: draft.predecessorTaskId || undefined,
        assignedResourceIds: draft.assignedResourceIds.length ? draft.assignedResourceIds : undefined,
        assignedResourceId: draft.assignedResourceIds[0] || undefined,
        summary: draft.summary,
      });
      setMessage("Task created and synced in WBS + Gantt.");
      setDraft({
        ...draft,
        name: "",
        predecessorTaskId: "",
        assignedResourceIds: [],
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create task.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="page-typography space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h1 className="text-2xl font-bold text-[#0f3433]">Planning Studio</h1>
        <p className="text-sm text-gray-500 mt-1">
          Single unified task builder for both WBS hierarchy and Gantt scheduling.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">WBS Nodes</p>
          <p className="text-2xl font-bold text-[#0f3433] mt-1">{wbsNodes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tasks</p>
          <p className="text-2xl font-bold text-[#0f3433] mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Progress</p>
          <p className="text-2xl font-bold text-[#0f3433] mt-1">{state?.project.progress ?? 0}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Last Updated</p>
          <p className="text-sm font-bold text-[#0f3433] mt-2">
            {state?.lastUpdatedAt ? new Date(state.lastUpdatedAt).toLocaleString() : "N/A"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0f3433]">Create Task (Summary or Subtask)</h2>
            <p className="text-sm text-gray-500">
              Microsoft-Project style: pick parent, duration, start or predecessor, and assign resource.
            </p>
          </div>
          <button
            onClick={() => void createTask()}
            disabled={!canEdit || isCreating}
            className="px-4 py-2 rounded-lg bg-[#12b3a8] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? "Creating..." : "Create Task"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Task Name</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
              placeholder="e.g. Create a Room"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Task Type</label>
            <select
              value={draft.summary ? "summary" : "subtask"}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value === "summary" })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
            >
              <option value="summary">Summary Task / Parent</option>
              <option value="subtask">Sub Task / Child</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
              Parent Node {draft.summary ? "(optional for summary)" : "(required for subtask)"}
            </label>
            <select
              disabled={draft.summary}
              value={draft.parentWbsId}
              onChange={(e) => setDraft({ ...draft, parentWbsId: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm disabled:opacity-60"
            >
              <option value="">{draft.summary ? "Project Root (auto)" : "Select Parent"}</option>
              {selectableParentNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {`${" ".repeat(Math.max(0, node.level - 1) * 2)}${normalizeCode(node.code)} ${node.name}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Duration (working days)</label>
            <input
              type="number"
              min={1}
              value={draft.durationDays}
              onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Start Date</label>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Predecessor Task</label>
            <select
              value={draft.predecessorTaskId}
              onChange={(e) => setDraft({ ...draft, predecessorTaskId: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm"
            >
              <option value="">None (use start date)</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name} ({task.start} - {task.end})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Assigned Resource</label>
            <details className="mt-1 w-full rounded-lg bg-gray-50 border border-gray-100 text-sm">
              <summary className="px-3 py-2 cursor-pointer list-none flex items-center justify-between">
                <span className="truncate">{selectedResourceNames}</span>
                <span className="text-xs text-gray-500">{draft.assignedResourceIds.length} selected</span>
              </summary>
              <div className="max-h-44 overflow-y-auto border-t border-gray-100 px-3 py-2 space-y-2">
                {resources.length ? (
                  resources.map((resource) => (
                    <label key={resource.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={draft.assignedResourceIds.includes(resource.id)}
                        onChange={() => toggleAssignedResource(resource.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-[#12b3a8]"
                      />
                      <span className="truncate">{resource.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No resources available.</p>
                )}
              </div>
            </details>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-gray-500">
              If predecessor selected, start auto-shifts after predecessor end using project calendar.
            </p>
          </div>
        </div>
        {message && <p className="text-sm text-[#0f3433]">{message}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#12b3a8]" />
          <h3 className="font-bold text-[#0f3433]">Unified WBS + Gantt Preview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-widest text-gray-400 px-4 py-3">WBS</th>
                <th className="text-left text-[10px] uppercase tracking-widest text-gray-400 px-4 py-3">Task</th>
                <th className="text-left text-[10px] uppercase tracking-widest text-gray-400 px-4 py-3">Schedule</th>
                <th className="text-left text-[10px] uppercase tracking-widest text-gray-400 px-4 py-3">Predecessors</th>
                <th className="text-left text-[10px] uppercase tracking-widest text-gray-400 px-4 py-3">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wbsNodes
                .filter((node) => node.id !== rootWbsId)
                .map((node) => {
                const task = taskByWbsId.get(node.id);
                return (
                  <tr key={node.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-500">{normalizeCode(node.code)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[#0f3433]">{node.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {task ? (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="w-3 h-3 text-gray-400" />
                          {task.start} - {task.end}
                        </span>
                      ) : (
                        "Not scheduled"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {task?.dependencies?.length ? (
                        <span className="inline-flex items-start gap-1.5 max-w-md">
                          <Link2 className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">
                            {task.dependencies
                              .map((depId) => predecessorNameByRef.get(depId) ?? depId)
                              .join(", ")}
                          </span>
                        </span>
                      ) : (
                        "None"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task?.assigned || "Unassigned"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
