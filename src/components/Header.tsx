import { useState } from "react";
import { Bell, RefreshCw, Search, Settings, Plus, Trash2, Calendar } from "lucide-react";
import { useProjectData } from "@/context/ProjectDataContext";
import type { UserRole } from "@/lib/types";

interface HeaderProps {
  projectName: string;
  projectLocation?: string;
  onRefresh?: () => void;
}

export default function Header({ projectName, projectLocation, onRefresh }: HeaderProps) {
  const {
    userName,
    userRole,
    setActor,
    workspace,
    activateProject,
    createProject,
    deleteProject,
    upsertCalendar,
  } = useProjectData();
  const [showProjModal, setShowProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [busy, setBusy] = useState(false);

  const canManageProjects = userRole === "admin";
  const activeId = workspace?.activeProjectId ?? "";
  const projects = workspace?.projectList ?? [];

  const handleActivate = async (id: string) => {
    if (id === activeId) return;
    setBusy(true);
    try {
      await activateProject(id);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!newProjName.trim()) return;
    setBusy(true);
    try {
      await createProject({ name: newProjName.trim() });
      setNewProjName("");
      setShowProjModal(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteProject(id);
    } finally {
      setBusy(false);
    }
  };

  const openCalendarEditor = () => {
    const cals = workspace?.calendars ?? [];
    const first = cals[0];
    if (!first) return;
    const name = window.prompt("Calendar name", first.name);
    if (name === null) return;
    const week = window.prompt("Working days: e.g. Mon–Fri = 1111100 (7 chars Mon–Sun, 1=work)", "1111100");
    if (!week || week.length !== 7) return;
    const workWeek = week.split("").map((ch) => ch === "1");
    void upsertCalendar({
      ...first,
      name: name || first.name,
      workWeek,
    });
  };

  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-8">
        {/* Left: title + subtitle + controls (wrap so nothing overlaps the toolbar) */}
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-2xl sm:text-[26px] font-bold text-[#0f3433] tracking-tight truncate" title={projectName}>
            {projectName}
          </h2>
          <p className="text-[12px] sm:text-[13px] text-gray-400 font-bold uppercase tracking-wider">
            Delivery Workspace •{" "}
            <span className="text-[#12b3a8]">{projectLocation || "Global Operations"}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
            {projects.length > 0 && (
              <select
                value={activeId}
                disabled={busy}
                onChange={(e) => void handleActivate(e.target.value)}
                className="min-w-0 max-w-full sm:max-w-md lg:max-w-xl flex-1 sm:flex-none text-[14px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 font-semibold text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:border-[#12b3a8] outline-none transition-all cursor-pointer truncate"
                title={projects.find((p) => p.id === activeId)?.name}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            )}

            {canManageProjects && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProjModal(true)}
                  className="p-1.5 rounded-lg bg-[#f0f9f8] text-[#12b3a8] hover:bg-[#12b3a8] hover:text-white transition-all shrink-0"
                  title="New Project"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {projects.length > 1 && activeId && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(activeId)}
                    disabled={busy}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                    title="Delete Active"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={openCalendarEditor}
                  className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all whitespace-nowrap shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  Work Week
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: search + actions — own row on smaller widths, never collapses into project row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:justify-start xl:flex-nowrap shrink-0 xl:pt-1 border-t border-gray-50 pt-3 xl:border-t-0 xl:pt-0">
          <div className="relative group w-full sm:w-auto sm:min-w-[220px] lg:min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-[#12b3a8] transition-colors" />
            <input
              type="text"
              placeholder="Search data..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all text-base font-medium text-gray-700"
            />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-1">
            <div className="flex items-center gap-0.5 border-r border-gray-100 pr-3 sm:pr-4">
              <button
                type="button"
                onClick={onRefresh}
                className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-[#0f3433] transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                type="button"
                className="relative p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-[#0f3433] transition-all"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full border-2 border-white bg-[#12b3a8]" />
              </button>

              <button
                type="button"
                className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-[#0f3433] transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 pl-1">
              <div className="hidden text-right md:block">
                <input
                  value={userName}
                  onChange={(e) => setActor(userRole, e.target.value || "USER")}
                  className="block max-w-[140px] truncate border-none bg-transparent p-0 text-right text-[15px] font-bold text-[#0f3433] focus:ring-0 lg:max-w-[180px]"
                  title={userName}
                />
                <select
                  value={userRole}
                  onChange={(e) => setActor(e.target.value as UserRole, userName)}
                  className="block cursor-pointer appearance-none border-none bg-transparent p-0 text-right text-[11px] font-extrabold uppercase tracking-widest text-gray-400 hover:text-[#12b3a8] focus:ring-0"
                >
                  <option value="admin">System Admin</option>
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f3433] text-xs font-bold text-white shadow-sm">
                {(userName || "US")
                  .split(" ")
                  .filter(Boolean)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal - Themed */}
      {showProjModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f3433]/35 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 border border-gray-100">
            <h3 className="text-lg font-bold text-[#0f3433] mb-4">Create Project</h3>
            <input
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="Enter project name"
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#12b3a8]/20 focus:border-[#12b3a8] mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-5 py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowProjModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !newProjName.trim()}
                className="px-6 py-2 bg-[#12b3a8] text-white text-sm font-bold rounded-xl hover:bg-[#0e9188] transition-all disabled:opacity-50"
                onClick={() => void handleCreate()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}