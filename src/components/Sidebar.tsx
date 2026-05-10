import {
  LayoutDashboard,
  FileText,
  GitBranch,
  GanttChart,
  Users,
  Bot,
  Upload,
  FolderKanban,
  ChevronLeft,
  Calendar,
  Rows3,
  ChevronDown,
  ChevronRight,
  Boxes,
  Ruler,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  { id: 'planning_studio' as ViewType, label: 'Planning Studio', icon: Rows3 },
  { id: 'gantt' as ViewType, label: 'Gantt Chart', icon: GanttChart },
  { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
  { id: 'inventory' as ViewType, label: 'Inventory', icon: Boxes },
  { id: 'units' as ViewType, label: 'Measurement Units', icon: Ruler },
  { id: 'ai' as ViewType, label: 'AI Assistant', icon: Bot },
];

const resourceSubmenuItems = [
  { id: 'resources_human' as ViewType, label: 'Human Resource' },
  { id: 'resources_equipment' as ViewType, label: 'Asset / Equipment' },
  { id: 'resources_material' as ViewType, label: 'Material Supply' },
];

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const isResourceView =
    currentView === 'resources' || resourceSubmenuItems.some((item) => item.id === currentView);
  const [resourceExpanded, setResourceExpanded] = useState(isResourceView);

  useEffect(() => {
    if (isResourceView) {
      setResourceExpanded(true);
    }
  }, [isResourceView]);

  return (
    <aside className="w-64 bg-white flex flex-col border-r border-gray-100 h-screen transition-all duration-300">
      {/* Header / Logo Section - Reference Style */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e8f8f7] rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#12b3a8]" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#0f3433] tracking-tight leading-tight">InfraMind</h1>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Enterprise</span>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-50 rounded-lg text-gray-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Section Label - Clean Look */}
      <div className="px-7 py-2">
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[1.5px]">Main Menu</p>
      </div>

      {/* Navigation - Emerald Theme */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#f0f9f8] text-[#12b3a8]'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-[#0f3433]'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-[#12b3a8]' : 'text-gray-400 group-hover:text-[#12b3a8]'}`} />
                  <span className={`text-[15px] font-semibold ${isActive ? 'text-[#0f3433]' : ''}`}>
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setResourceExpanded((prev) => !prev)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                isResourceView
                  ? 'bg-[#f0f9f8] text-[#12b3a8]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#0f3433]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users className={`w-5 h-5 transition-colors ${isResourceView ? 'text-[#12b3a8]' : 'text-gray-400 group-hover:text-[#12b3a8]'}`} />
                <span className={`text-[15px] font-semibold ${isResourceView ? 'text-[#0f3433]' : ''}`}>
                  Resources
                </span>
              </span>
              {resourceExpanded ? (
                <ChevronDown className={`w-4 h-4 ${isResourceView ? 'text-[#12b3a8]' : 'text-gray-400'}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${isResourceView ? 'text-[#12b3a8]' : 'text-gray-400'}`} />
              )}
            </button>
          </li>
          {resourceExpanded &&
            resourceSubmenuItems.map((item) => {
              const isActive = currentView === item.id || (currentView === 'resources' && item.id === 'resources_human');
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 ml-4 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-[#f0f9f8] text-[#0f3433]'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-[#0f3433]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    <span className="text-[14px] font-semibold">{item.label}</span>
                  </button>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Footer Section - Simplified Engine Status */}
      <div className="p-4 border-t border-gray-50">
        <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <div className="w-2.5 h-2.5 bg-[#12b3a8] rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-[#12b3a8] rounded-full absolute top-0 left-0 animate-ping opacity-75"></div>
            </div>
            <span className="text-[12px] font-bold text-[#0f3433] uppercase">AI Active</span>
          </div>
          <p className="text-[12px] text-gray-500 font-medium leading-relaxed">
            InfraMind Engine is analyzing project documents in real-time.
          </p>
        </div>
        
        {/* User / Profile Style Placeholder at bottom */}
        <div className="mt-4 flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 bg-[#12b3a8] rounded-full flex items-center justify-center text-white font-bold text-xs">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0f3433] truncate">Project Lead</p>
            <p className="text-[11px] text-gray-400 font-medium truncate">infra.mind/active</p>
          </div>
        </div>
      </div>
    </aside>
  );
}