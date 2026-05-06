import { useMemo, useState } from "react";
import { useProjectData } from "@/context/ProjectDataContext";
import { TaskStatus, WBSNode } from "@/lib/types";
import { PlusCircle, Edit3, Layers, BarChart3, ChevronRight } from "lucide-react";

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
    <div className="space-y-8 p-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">WBS Editor</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Manual override and node management for project hierarchy</p>
        </div>
        {!canEdit && (
          <span className="px-4 py-2 bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-widest rounded-xl border border-amber-100">
            View Only Mode
          </span>
        )}
      </div>

      {/* Create Node Form - Themed Card */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#f0f9f8] rounded-xl">
            <PlusCircle className="w-5 h-5 text-[#12b3a8]" />
          </div>
          <h3 className="text-sm font-bold text-[#0f3433] uppercase tracking-widest">Create New Hierarchy Node</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1.5 lg:col-span-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Parent Node</label>
            <select 
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none appearance-none"
              value={selectedParent} 
              onChange={(e) => setSelectedParent(e.target.value)}
            >
              <option value="">Select Parent</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.code} {node.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 lg:col-span-2">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Node Name</label>
            <input 
              className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              placeholder="e.g. Site Preparation" 
              value={draft.name} 
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Classification</label>
            <select 
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              value={draft.type} 
              onChange={(e) => setDraft({ ...draft, type: e.target.value as WBSNode["type"] })}
            >
              <option value="phase">Phase</option>
              <option value="deliverable">Deliverable</option>
              <option value="work_package">Work Package</option>
              <option value="task">Task</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Initial Status</label>
            <select 
              className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all outline-none"
              value={draft.status} 
              onChange={(e) => setDraft({ ...draft, status: e.target.value as TaskStatus })}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              disabled={!canEdit || !selectedParent || !draft.name}
              onClick={async () => {
                await createWbsNode(selectedParent, draft);
                setDraft({ name: "", type: "task", status: "not_started", progress: 0 });
              }}
              className="w-full bg-[#12b3a8] hover:bg-[#0e9188] text-white font-bold text-xs uppercase tracking-widest rounded-xl py-3 shadow-lg shadow-[#12b3a8]/10 transition-all disabled:opacity-40 disabled:shadow-none active:scale-95"
            >
              Add Node
            </button>
          </div>
        </div>
      </div>

      {/* Editor Table Card */}
      <div className="bg-white rounded-[24px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-gray-300" />
            <h3 className="text-sm font-bold text-[#0f3433] uppercase tracking-widest">Active Node Directory</h3>
          </div>
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
            Total Elements: {nodes.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left">Ref Code</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left">Node Designation</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left">Level</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left">Live Status</th>
                <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-left">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {nodes.map((node) => (
                <tr key={node.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4 text-[13px] font-bold text-gray-400 font-mono tracking-tight">{node.code}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 group-focus-within:translate-x-1 transition-transform">
                      <Edit3 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <input
                        disabled={!canEdit}
                        className="bg-transparent border-none p-0 text-sm font-bold text-[#0f3433] focus:ring-0 w-full placeholder:text-gray-300"
                        value={node.name}
                        onChange={(e) => void updateWbsNode(node.id, { name: e.target.value })}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter bg-gray-100/50 px-2 py-1 rounded-md">
                      {node.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      disabled={!canEdit}
                      className="bg-transparent border-none p-0 text-[11px] font-extrabold text-[#12b3a8] uppercase tracking-widest focus:ring-0 cursor-pointer appearance-none"
                      value={node.status}
                      onChange={(e) => void updateWbsNode(node.id, { status: e.target.value as TaskStatus })}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status} className="text-gray-700 font-medium capitalize">
                          {status.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 max-w-[120px] relative h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-[#12b3a8] transition-all duration-500" 
                          style={{ width: `${node.progress}%` }}
                        />
                        <input
                          disabled={!canEdit}
                          type="range"
                          min={0}
                          max={100}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          value={node.progress}
                          onChange={(e) => void updateWbsNode(node.id, { progress: Number(e.target.value) })}
                        />
                      </div>
                      <span className="text-[12px] font-black text-[#0f3433] w-10 text-right">{node.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Insights Footer Card */}
      <div className="bg-[#0f3433] rounded-[28px] p-6 text-white flex items-center justify-between gap-6 overflow-hidden relative">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-[#12b3a8]/20 rounded-2xl flex items-center justify-center border border-[#12b3a8]/30">
            <BarChart3 className="w-6 h-6 text-[#12b3a8]" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-[#a0c4c2] uppercase tracking-[2px] mb-1">Editor Statistics</p>
            <p className="text-sm font-medium text-white/90">
              Synchronizing <span className="font-bold text-[#12b3a8]">{nodes.length} structural elements</span> with the project master schedule.
            </p>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 relative z-10">
          <div className="w-2 h-2 bg-[#12b3a8] rounded-full animate-pulse shadow-[0_0_8px_#12b3a8]"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Persistence Active</span>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#12b3a8]/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
      </div>
    </div>
  );
}