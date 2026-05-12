import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ProjectOverview from "./components/ProjectOverview";
import WBSView from "./components/WBSView";
import WBSEditor from "./components/WBSEditor";
import GanttChart from "./components/GanttChart";
import GanttEditor from "./components/GanttEditor";
import PlanningStudio from "./components/PlanningStudio";
import ResourceManagement from "./components/ResourceManagement";
import InventoryManagement from "./components/InventoryManagement";
import UnitsManagement from "./components/UnitsManagement";
import CalendarManagement from "./components/CalendarManagement";
import AIAssistant from "./components/AIAssistant";
import DocumentUpload from "./components/DocumentUpload";
import ProjectToolbar from "./components/ProjectToolbar";
import { ProjectDataProvider, useProjectData } from "./context/ProjectDataContext";
import { ViewType } from "./lib/types";
import "./App.css";

function AppShell() {
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const { state, loading, error, refresh } = useProjectData();

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard onNavigate={setCurrentView} />;
      case "overview":
        return <ProjectOverview />;
      case "wbs":
        return <WBSView />;
      case "wbs_editor":
        return <WBSEditor />;
      case "gantt":
        return <GanttChart />;
      case "gantt_editor":
        return <GanttEditor />;
      case "planning_studio":
        return <PlanningStudio />;
      case "resources":
      case "resources_human":
        return <ResourceManagement resourceView="human" />;
      case "resources_equipment":
        return <ResourceManagement resourceView="equipment" />;
      case "resources_material":
        return <ResourceManagement resourceView="material" />;
      case "inventory":
        return <InventoryManagement />;
      case "units":
        return <UnitsManagement />;
      case "calendar":
        return <CalendarManagement />;
      case "ai":
        return <AIAssistant />;
      case "documents":
        return <DocumentUpload />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          projectName={state?.project.name ?? "Loading project..."}
          projectLocation={state?.project.location}
          onRefresh={refresh}
        />
        <main className="app-content flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {loading && !state ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
              Loading AI-backed project workspace...
            </div>
          ) : (
            renderView()
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ProjectDataProvider>
      <AppShell />
    </ProjectDataProvider>
  );
}

export default App;
