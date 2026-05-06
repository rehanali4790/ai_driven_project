import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import {
  AppState,
  BootstrapResponse,
  ChatResponse,
  DashboardStats,
  ProjectInfo,
  ResourceDraft,
  TaskStatus,
  TaskUpdateDraft,
  UserRole,
  WbsNodeCreateDraft,
  WbsNodeUpdateDraft,
  WorkingCalendar,
  WorkspaceMeta,
} from "@/lib/types";

interface ProjectDataContextValue {
  state: AppState | null;
  dashboard: DashboardStats | null;
  workspace: WorkspaceMeta | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  resetWorkspace: () => Promise<void>;
  createProject: (payload: Partial<ProjectInfo>) => Promise<void>;
  activateProject: (projectId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  saveBaseline: (projectId: string) => Promise<void>;
  upsertCalendar: (calendar: WorkingCalendar) => Promise<void>;
  uploadDocument: (file: File) => Promise<void>;
  reprocessDocument: (documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  generateArtifacts: () => Promise<void>;
  askAi: (question: string) => Promise<ChatResponse>;
  upsertResource: (resource: ResourceDraft) => Promise<void>;
  updateTask: (taskId: string, updates: TaskUpdateDraft) => Promise<void>;
  createTask: (task: TaskUpdateDraft & { name: string }) => Promise<void>;
  moveTask: (taskId: string, start: string, end: string) => Promise<void>;
  assignTask: (taskId: string, assignee: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateWbsNode: (nodeId: string, updates: WbsNodeUpdateDraft) => Promise<void>;
  createWbsNode: (parentId: string, node: WbsNodeCreateDraft) => Promise<void>;
  transcribeAudio: (audio: Blob) => Promise<string>;
  synthesizeSpeech: (text: string) => Promise<Blob>;
  userRole: UserRole;
  userName: string;
  setActor: (role: UserRole, name: string) => void;
}

const ProjectDataContext = createContext<ProjectDataContextValue | null>(null);

function applyBootstrap(
  data: BootstrapResponse,
  setState: (value: AppState) => void,
  setDashboard: (value: DashboardStats) => void,
  setWorkspace: (value: WorkspaceMeta) => void,
) {
  setState(data.state);
  setDashboard(data.dashboard);
  setWorkspace(
    data.workspace ?? {
      activeProjectId: data.state.project.id,
      projectList: [{ id: data.state.project.id, name: data.state.project.name || "Project" }],
      calendars: [],
      globalResources: [],
    },
  );
}

export function ProjectDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [workspaceMeta, setWorkspaceMeta] = useState<WorkspaceMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("admin");
  const [userName, setUserName] = useState("SYSTEM_ADMIN");

  const hasProcessingDocs = useMemo(() => {
    return Boolean(state?.documents?.some((doc) => doc.status === "processing"));
  }, [state]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.bootstrap();
      applyBootstrap(data, setState, setDashboard, setWorkspaceMeta);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load project data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const data = await api.bootstrap();
      applyBootstrap(data, setState, setDashboard, setWorkspaceMeta);
    } catch (_e) {
      // Keep polling resilient; errors surface only on explicit refresh.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // While documents are being processed, poll the backend so users see progress
  // and derived artifacts (WBS/Gantt) update automatically.
  useEffect(() => {
    if (!hasProcessingDocs) return;
    const id = window.setInterval(() => {
      void silentRefresh();
    }, 2500);
    return () => window.clearInterval(id);
  }, [hasProcessingDocs, silentRefresh]);

  const runBootstrapAction = useCallback(async (action: Promise<BootstrapResponse>) => {
    setLoading(true);
    setError(null);
    try {
      const data = await action;
      applyBootstrap(data, setState, setDashboard, setWorkspaceMeta);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Action failed.");
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<ProjectDataContextValue>(
    () => ({
      state,
      dashboard,
      workspace: workspaceMeta,
      loading,
      error,
      refresh,
      resetWorkspace: () => runBootstrapAction(api.resetWorkspace()).then(() => {}),
      createProject: async (payload: Partial<ProjectInfo>) =>
        runBootstrapAction(api.createProject(payload)),
      activateProject: async (projectId: string) => runBootstrapAction(api.activateProject(projectId)),
      deleteProject: async (projectId: string) => runBootstrapAction(api.deleteProject(projectId)),
      saveBaseline: async (projectId: string) => runBootstrapAction(api.saveBaseline(projectId)),
      upsertCalendar: async (calendar: WorkingCalendar) =>
        runBootstrapAction(api.upsertCalendar(calendar)),
      uploadDocument: async (file: File) => runBootstrapAction(api.uploadDocument(file)),
      reprocessDocument: async (documentId: string) =>
        runBootstrapAction(api.reprocessDocument(documentId)),
      deleteDocument: async (documentId: string) =>
        runBootstrapAction(api.deleteDocument(documentId)),
      generateArtifacts: async () => runBootstrapAction(api.generateArtifacts()),
      askAi: (question: string) => api.chat(question),
      upsertResource: async (resource: ResourceDraft) => runBootstrapAction(api.upsertResource(resource)),
      updateTask: async (taskId: string, updates: TaskUpdateDraft) =>
        runBootstrapAction(api.updateTask(taskId, updates)),
      createTask: async (task: TaskUpdateDraft & { name: string }) =>
        runBootstrapAction(api.createTask(task)),
      moveTask: async (taskId: string, start: string, end: string) =>
        runBootstrapAction(api.moveTask(taskId, start, end)),
      assignTask: async (taskId: string, assignee: string) =>
        runBootstrapAction(api.assignTask(taskId, assignee)),
      updateTaskStatus: async (taskId: string, status: TaskStatus) =>
        runBootstrapAction(api.updateTaskStatus(taskId, status)),
      updateWbsNode: async (nodeId: string, updates: WbsNodeUpdateDraft) =>
        runBootstrapAction(api.updateWbsNode(nodeId, updates)),
      createWbsNode: async (parentId: string, node: WbsNodeCreateDraft) =>
        runBootstrapAction(api.createWbsNode(parentId, node)),
      transcribeAudio: async (audio: Blob) => {
        const result = await api.stt(audio);
        return result.text;
      },
      synthesizeSpeech: (text: string) => api.tts(text),
      userRole,
      userName,
      setActor: (role: UserRole, name: string) => {
        setUserRole(role);
        setUserName(name);
        api.setActor(role, name);
      },
    }),
    [
      dashboard,
      error,
      loading,
      refresh,
      runBootstrapAction,
      state,
      userName,
      userRole,
      workspaceMeta,
    ],
  );

  return <ProjectDataContext.Provider value={value}>{children}</ProjectDataContext.Provider>;
}

export function useProjectData() {
  const context = useContext(ProjectDataContext);
  if (!context) {
    throw new Error("useProjectData must be used within ProjectDataProvider");
  }
  return context;
}
