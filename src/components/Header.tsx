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
    <header className="bg-white border-b border-gray-100 px-8 py-5">
      <div className="flex items-center justify-between gap-6">
        {/* Left Side: Project Info & Management */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-[#0f3433] tracking-tight truncate">
              {projectName}
            </h2>
            
            {projects.length > 0 && (
              <select
                value={activeId}
                disabled={busy}
                onChange={(e) => void handleActivate(e.target.value)}
                className="text-[13px] border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50/50 font-semibold text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:border-[#12b3a8] outline-none transition-all cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            )}

            {canManageProjects && (
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={() => setShowProjModal(true)}
                  className="p-2 rounded-xl bg-[#f0f9f8] text-[#12b3a8] hover:bg-[#12b3a8] hover:text-white transition-all"
                  title="New Project"
                >
                  <Plus className="w-4 h-4" />
                </button>
                
                {projects.length > 1 && activeId && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(activeId)}
                    disabled={busy}
                    className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                    title="Delete Active"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={openCalendarEditor}
                  className="flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Work Week
                </button>
              </div>
            )}
          </div>
          <p className="text-[12px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">
            Delivery Workspace • <span className="text-[#12b3a8]">{projectLocation || "Global Operations"}</span>
          </p>
        </div>

        {/* Right Side: Search & Actions */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#12b3a8] transition-colors" />
            <input
              type="text"
              placeholder="Search data..."
              className="pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl w-60 focus:ring-2 focus:ring-[#12b3a8]/20 focus:bg-white transition-all text-sm font-medium text-gray-700"
            />
          </div>

          <div className="flex items-center gap-1 border-r border-gray-100 pr-5">
            <button
              onClick={onRefresh}
              className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-[#0f3433] transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button className="relative p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-[#0f3433] transition-all">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#12b3a8] rounded-full border-2 border-white"></span>
            </button>

            <button className="p-2.5 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-[#0f3433] transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Section */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <input
                value={userName}
                onChange={(e) => setActor(userRole, e.target.value || "USER")}
                className="block text-sm font-bold text-[#0f3433] bg-transparent border-none p-0 text-right focus:ring-0 w-24"
              />
              <select
                value={userRole}
                onChange={(e) => setActor(e.target.value as UserRole, userName)}
                className="block text-[10px] text-gray-400 font-extrabold uppercase tracking-widest bg-transparent border-none p-0 text-right focus:ring-0 appearance-none cursor-pointer hover:text-[#12b3a8]"
              >
                <option value="admin">System Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="w-10 h-10 bg-[#0f3433] rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm">
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

      {/* Modal - Themed */}
      {showProjModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f3433]/20 backdrop-blur-sm p-4">
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