import { useMemo, useState } from "react";
import { useProjectData } from "@/context/ProjectDataContext";
import { TaskStatus, WBSNode } from "@/lib/types";

const statusOptions: TaskStatus[] = ["not_started", "in_progress", "at_risk", "completed"];

function flatten(node: WBSNode, acc: WBSNode[] = []) {
  acc.push(node);
  (node.children ?? []).forEach((child) => flatten(child, acc));
  return acc;
}

export default function WBSEditor() {
  const { state, updateWbsNode, createWbsNode, userRole } = useProjectData();
  const [selectedParent, setSelectedParent] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    type: "task" as WBSNode["type"],
    status: "not_started" as TaskStatus,
    progress: 0,
  });
  const canEdit = userRole !== "viewer";
  const nodes = useMemo(() => (state?.wbs ? flatten(state.wbs) : []), [state?.wbs]);

  if (!state?.wbs) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WBS Editor</h1>
        <p className="text-gray-500">Create WBS nodes and update status/progress with persistence.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Create WBS Node</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select className="border rounded px-2 py-2" value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)}>
            <option value="">Select parent node</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>{node.code} - {node.name}</option>
            ))}
          </select>
          <input className="border rounded px-2 py-2" placeholder="Node name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className="border rounded px-2 py-2" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as WBSNode["type"] })}>
            <option value="phase">phase</option>
            <option value="deliverable">deliverable</option>
            <option value="work_package">work package</option>
            <option value="task">task</option>
          </select>
          <select className="border rounded px-2 py-2" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status.replace("_", " ")}</option>
            ))}
          </select>
          <input className="border rounded px-2 py-2" type="number" min={0} max={100} value={draft.progress} onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })} />
          <button
            disabled={!canEdit || !selectedParent || !draft.name}
            onClick={async () => {
              await createWbsNode(selectedParent, draft);
              setDraft({ name: "", type: "task", status: "not_started", progress: 0 });
            }}
            className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
          >
            Add Node
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Code</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Name</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Type</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Status</th>
              <th className="text-left px-3 py-2 text-xs uppercase text-gray-600">Progress</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.id} className="border-b">
                <td className="px-3 py-2 text-sm font-mono">{node.code}</td>
                <td className="px-3 py-2">
                  <input
                    disabled={!canEdit}
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={node.name}
                    onChange={(e) => void updateWbsNode(node.id, { name: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2 text-sm capitalize">{node.type.replace("_", " ")}</td>
                <td className="px-3 py-2">
                  <select
                    disabled={!canEdit}
                    className="border rounded px-2 py-1 text-sm"
                    value={node.status}
                    onChange={(e) => void updateWbsNode(node.id, { status: e.target.value as TaskStatus })}
                  >
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
                      value={node.progress}
                      onChange={(e) => void updateWbsNode(node.id, { progress: Number(e.target.value) })}
                    />
                    <span className="text-sm w-10">{node.progress}%</span>
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
