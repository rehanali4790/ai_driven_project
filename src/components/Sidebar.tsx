import {
  LayoutDashboard,
  FileText,
  GitBranch,
  GanttChart,
  Users,
  Bot,
  Upload,
  FolderKanban
} from 'lucide-react';
import { ViewType } from '@/lib/types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const menuItems = [
  { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'overview' as ViewType, label: 'Project Overview', icon: FolderKanban },
  { id: 'documents' as ViewType, label: 'Documents', icon: Upload },
  { id: 'wbs' as ViewType, label: 'WBS Structure', icon: GitBranch },
  { id: 'wbs_editor' as ViewType, label: 'WBS Editor', icon: GitBranch },
  { id: 'gantt' as ViewType, label: 'Gantt Chart', icon: GanttChart },
  { id: 'gantt_editor' as ViewType, label: 'Gantt Editor', icon: GanttChart },
  { id: 'resources' as ViewType, label: 'Resources', icon: Users },
  { id: 'ai' as ViewType, label: 'AI Assistant', icon: Bot },
];

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">InfraMind</h1>
            <p className="text-xs text-slate-400">Project Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg p-4 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            InfraMind Engine Active
          </div>
          <p className="text-xs text-slate-400">Powered by InfraMind AI</p>
        </div>
      </div>
    </aside>
  );
}
