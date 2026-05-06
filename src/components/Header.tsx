import { useState } from "react";
import { Bell, RefreshCw, Search, Settings } from "lucide-react";
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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-800 truncate">{projectName}</h2>
            {projects.length > 0 && (
              <select
                value={activeId}
                disabled={busy}
                onChange={(e) => void handleActivate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 max-w-[220px] bg-white"
                title="Active project"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.id}
                  </option>
                ))}
              </select>
            )}
            {canManageProjects && (
              <>
                <button
                  type="button"
                  onClick={() => setShowProjModal(true)}
                  className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  New project
                </button>
                {projects.length > 1 && activeId && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(activeId)}
                    disabled={busy}
                    className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    Delete active
                  </button>
                )}
                <button
                  type="button"
                  onClick={openCalendarEditor}
                  className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Work week
                </button>
              </>
            )}
          </div>
          <p className="text-sm text-gray-500">
            InfraMind delivery workspace • {projectLocation || "Project location"}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks, resources..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>

          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="text-right">
              <input
                value={userName}
                onChange={(e) => setActor(userRole, e.target.value || "USER")}
                className="text-sm font-medium text-gray-800 text-right border border-gray-200 rounded px-1 w-32"
              />
              <select
                value={userRole}
                onChange={(e) => setActor(e.target.value as UserRole, userName)}
                className="text-xs text-gray-500 border border-gray-200 rounded px-1"
              >
                <option value="admin">System Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
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

      {showProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create project</h3>
            <input
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="Project name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-gray-700"
                onClick={() => setShowProjModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !newProjName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
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
