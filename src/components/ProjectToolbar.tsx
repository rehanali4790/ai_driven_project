import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';

export default function ProjectToolbar() {
  const { workspace, userRole, activateProject, createProject, deleteProject, upsertCalendar } = useProjectData();
  const [showProjModal, setShowProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [busy, setBusy] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canManageProjects = userRole === 'admin';
  const activeId = workspace?.activeProjectId ?? '';
  const projects = workspace?.projectList ?? [];

  const handleActivate = async (id: string) => {
    if (id === activeId) return;
    setBusy(true);
    try { await activateProject(id); } finally { setBusy(false); }
  };

  const handleCreate = async () => {
    if (!newProjName.trim()) return;
    setBusy(true);
    try {
      await createProject({ name: newProjName.trim() });
      setNewProjName('');
      setShowProjModal(false);
    } finally { setBusy(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    setBusy(true);
    try { await deleteProject(id); } finally { setBusy(false); }
  };

  const openCalendarEditor = () => {
    const cals = workspace?.calendars ?? [];
    const first = cals[0];
    if (!first) return;
    const name = window.prompt('Calendar name', first.name);
    if (name === null) return;
    const week = window.prompt('Working days: e.g. Mon–Fri = 1111100 (7 chars Mon–Sun, 1=work)', '1111100');
    if (!week || week.length !== 7) return;
    const workWeek = week.split('').map((ch) => ch === '1');
    void upsertCalendar({ ...first, name: name || first.name, workWeek });
  };

  if (!projects.length) return null;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
        <div className="flex flex-col gap-1 min-w-0" style={{ width: 240 }} ref={dropdownRef}>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Select Project</label>
          <div className="relative">
            <button
              type="button"
              disabled={busy}
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-[13px] border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50/50 font-semibold text-[#0f3433] focus:ring-2 focus:ring-[#12b3a8]/20 focus:border-[#12b3a8] outline-none transition-all cursor-pointer"
            >
              <span className="truncate">{projects.find((p) => p.id === activeId)?.name || activeId}</span>
              <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute z-50 top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { void handleActivate(p.id); setDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[13px] truncate transition-colors ${
                      p.id === activeId
                        ? 'bg-[#f0f9f8] text-[#12b3a8] font-semibold'
                        : 'text-[#0f3433] hover:bg-gray-50'
                    }`}
                  >
                    {p.name || p.id}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {canManageProjects && (
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all whitespace-nowrap shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Work Week
            </button>
          </div>
        )}
      </div>

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
    </>
  );
}
