import {
  BootstrapResponse,
  ChatResponse,
  DocumentRecord,
  ProjectInfo,
  ResourceDraft,
  TaskStatus,
  TaskUpdateDraft,
  UserRole,
  WbsNodeCreateDraft,
  WbsNodeUpdateDraft,
  WorkingCalendar,
} from "./types";

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

export const api = {
  actor: {
    role: "admin" as UserRole,
    name: "SYSTEM_ADMIN",
  },
  setActor: (role: UserRole, name: string) => {
    api.actor = { role, name };
  },
  actorHeaders: () => ({
    "x-user-role": api.actor.role,
    "x-user-name": api.actor.name,
  }),
  bootstrap: () => request<BootstrapResponse>("/api/bootstrap"),
  health: () => request<{ status: string; openaiConfigured: boolean; model: string }>("/api/health"),
  aiPing: () =>
    request<{ ok: boolean; openaiConfigured: boolean; error?: string }>("/api/ai/ping"),
  resetWorkspace: () =>
    request<BootstrapResponse>("/api/admin/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }),
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<BootstrapResponse>("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
  },
  reprocessDocument: (documentId: string) =>
    request<BootstrapResponse>(`/api/documents/${documentId}/reprocess`, {
      method: "POST",
    }),
  deleteDocument: (documentId: string) =>
    request<BootstrapResponse>(`/api/documents/${documentId}`, {
      method: "DELETE",
    }),
  chat: (question: string) =>
    request<ChatResponse>("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    }),
  generateArtifacts: () =>
    request<BootstrapResponse>("/api/ai/generate-artifacts", {
      method: "POST",
    }),
  createProject: (payload: Partial<ProjectInfo>) =>
    request<BootstrapResponse>("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify(payload),
    }),
  activateProject: (projectId: string) =>
    request<BootstrapResponse>("/api/workspace/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ projectId }),
    }),
  deleteProject: (projectId: string) =>
    request<BootstrapResponse>(`/api/projects/${projectId}`, {
      method: "DELETE",
      headers: api.actorHeaders(),
    }),
  saveBaseline: (projectId: string) =>
    request<BootstrapResponse>(`/api/projects/${projectId}/baseline`, {
      method: "POST",
      headers: api.actorHeaders(),
    }),
  upsertCalendar: (calendar: WorkingCalendar) =>
    request<BootstrapResponse>("/api/calendars", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ calendar }),
    }),
  upsertResource: (resource: ResourceDraft) =>
    request<BootstrapResponse>("/api/resources/upsert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ resource }),
    }),
  updateTask: (taskId: string, updates: TaskUpdateDraft) =>
    request<BootstrapResponse>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ updates }),
    }),
  moveTask: (taskId: string, start: string, end: string) =>
    request<BootstrapResponse>(`/api/tasks/${taskId}/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ start, end }),
    }),
  assignTask: (taskId: string, assignee: string) =>
    request<BootstrapResponse>(`/api/tasks/${taskId}/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ assignee }),
    }),
  updateTaskStatus: (taskId: string, status: TaskStatus) =>
    request<BootstrapResponse>(`/api/tasks/${taskId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ status }),
    }),
  createTask: (task: TaskUpdateDraft & { name: string }) =>
    request<BootstrapResponse>("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ task }),
    }),
  updateWbsNode: (nodeId: string, updates: WbsNodeUpdateDraft) =>
    request<BootstrapResponse>(`/api/wbs/${nodeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ updates }),
    }),
  createWbsNode: (parentId: string, node: WbsNodeCreateDraft) =>
    request<BootstrapResponse>(`/api/wbs/${parentId}/children`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...api.actorHeaders(),
      },
      body: JSON.stringify({ node }),
    }),
  stt: async (audio: Blob) => {
    const formData = new FormData();
    formData.append("audio", audio, "recording.webm");
    return request<{ text: string }>("/api/ai/stt", {
      method: "POST",
      body: formData,
    });
  },
  tts: async (text: string) => {
    const response = await fetch("/api/ai/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "TTS request failed");
    }
    return response.blob();
  },
};

export function getDocumentPreviewUrl(document: DocumentRecord) {
  if (!document.localPath) return null;
  const filename = document.localPath.split(/[\\/]/).pop();
  return filename ? `/uploads/${filename}` : null;
}
