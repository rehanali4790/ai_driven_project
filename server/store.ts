import fs from "fs";
import path from "path";
import { computeCpm, taskDurationDays } from "./cpm";
import { defaultWorkingCalendar } from "./scheduler";
import { buildEmptyWorkspace, emptyState } from "./seed";
import {
  ActivityItem,
  AggregatedExtraction,
  AllocationItem,
  AppState,
  BootstrapResponse,
  DashboardStats,
  DocumentPageAnalysis,
  DocumentRecord,
  GanttTask,
  InsightItem,
  Milestone,
  OpenAIArtifacts,
  PartialMilestone,
  PartialResource,
  PartialTask,
  ProjectInfo,
  ProjectRecord,
  ResourceItem,
  RiskItem,
  TaskStatus,
  UserRole,
  WBSNode,
  Workspace,
  WorkspaceMeta,
} from "./types";
import { hydrateWorkspace, migrateLegacyAppStateToWorkspace, ensureResourceDefaults } from "./workspace-model";

const dataDir = path.resolve(process.cwd(), "data");
const workspaceFile = path.join(dataDir, "workspace.json");
const legacyStateFile = path.join(dataDir, "app-state.json");
const uploadsDir = path.join(dataDir, "uploads");

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function cloneWorkspace(w: Workspace): Workspace {
  return JSON.parse(JSON.stringify(w));
}

function cloneState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state));
}

function writeWorkspaceToDisk(next: Workspace) {
  ensureDataDir();
  fs.writeFileSync(workspaceFile, JSON.stringify(next, null, 2), "utf8");
}

function readWorkspaceFromDisk(): Workspace {
  ensureDataDir();
  if (fs.existsSync(workspaceFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(workspaceFile, "utf8"));
      const hydrated = hydrateWorkspace(raw);
      if (!hydrated.projects.length) {
        const initial = buildEmptyWorkspace();
        writeWorkspaceToDisk(initial);
        return initial;
      }
      return hydrated;
    } catch {
      const initial = buildEmptyWorkspace();
      writeWorkspaceToDisk(initial);
      return initial;
    }
  }
  if (fs.existsSync(legacyStateFile)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(legacyStateFile, "utf8")) as AppState;
      const migrated = migrateLegacyAppStateToWorkspace(legacy, [defaultWorkingCalendar()]);
      writeWorkspaceToDisk(migrated);
      return migrated;
    } catch {
      const initial = buildEmptyWorkspace();
      writeWorkspaceToDisk(initial);
      return initial;
    }
  }
  const initial = buildEmptyWorkspace();
  writeWorkspaceToDisk(initial);
  return initial;
}

let workspace = readWorkspaceFromDisk();

export function getUploadsDir() {
  ensureDataDir();
  return uploadsDir;
}

export function getWorkspace(): Workspace {
  return cloneWorkspace(workspace);
}

export function getActiveProjectRecord(): ProjectRecord {
  const rec = workspace.projects.find((p) => p.id === workspace.activeProjectId);
  if (!rec) {
    throw new Error("Active project not found.");
  }
  return rec;
}

function mergeResourcesForBootstrap(ws: Workspace, record: ProjectRecord): ResourceItem[] {
  const gid = record.id;
  const globalRes = ws.globalResources.map((r) => ensureResourceDefaults({ ...r }, "global"));
  const localRes = record.state.resources.map((r) => ensureResourceDefaults({ ...r }, "project", gid));
  return [...globalRes, ...localRes];
}

function resolveAssignments(tasks: GanttTask[], resources: ResourceItem[]): GanttTask[] {
  const byId = new Map(resources.map((r) => [r.id, r]));
  return tasks.map((t) => {
    if (t.assignedResourceId) {
      const res = byId.get(t.assignedResourceId);
      if (res) return { ...t, assigned: res.name };
    }
    return t;
  });
}

export function buildMergedAppState(ws: Workspace): AppState {
  const record = ws.projects.find((p) => p.id === ws.activeProjectId);
  if (!record) {
    throw new Error("No active project.");
  }
  const mergedResources = mergeResourcesForBootstrap(ws, record);
  let tasks = resolveAssignments(record.state.tasks, mergedResources);
  try {
    tasks = computeCpm(tasks);
  } catch {
    /* invalid dependency graph */
  }
  const allocations = buildAllocations(tasks, mergedResources);
  const calId = record.calendarId ?? record.state.project.calendarId;
  return {
    ...record.state,
    project: {
      ...record.state.project,
      calendarId: calId ?? record.state.project.calendarId,
    },
    resources: mergedResources,
    tasks,
    allocations,
    lastUpdatedAt: record.state.lastUpdatedAt,
  };
}

export function getState(): AppState {
  return cloneState(buildMergedAppState(workspace));
}

export function workspaceMeta(): WorkspaceMeta {
  const w = cloneWorkspace(workspace);
  return {
    activeProjectId: w.activeProjectId,
    projectList: w.projects.map((p) => ({
      id: p.id,
      name: p.name || p.state.project.name || "Untitled",
      calendarId: p.calendarId,
    })),
    calendars: w.calendars,
    globalResources: w.globalResources.map((r) => ensureResourceDefaults({ ...r }, "global")),
  };
}

export function saveWorkspace(next: Workspace) {
  workspace = { ...next, lastUpdatedAt: new Date().toISOString() };
  writeWorkspaceToDisk(workspace);
  return getWorkspace();
}

function updateWorkspace(mutator: (draft: Workspace) => void): AppState {
  const draft = cloneWorkspace(workspace);
  mutator(draft);
  draft.lastUpdatedAt = new Date().toISOString();
  workspace = draft;
  writeWorkspaceToDisk(workspace);
  return getState();
}

export function updateState(mutator: (draft: AppState) => void) {
  return updateWorkspace((w) => {
    const rec = w.projects.find((p) => p.id === w.activeProjectId);
    if (!rec) throw new Error("No active project.");
    mutator(rec.state);
    rec.state.lastUpdatedAt = new Date().toISOString();
    rec.name = rec.state.project.name || rec.name;
  });
}

function cleanUploads() {
  try {
    if (!fs.existsSync(uploadsDir)) return;
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      const full = path.join(uploadsDir, file);
      const stat = fs.statSync(full);
      if (stat.isFile()) fs.unlinkSync(full);
    }
  } catch (_e) {
    /* best-effort */
  }
}

export function resetWorkspace() {
  cleanUploads();
  workspace = buildEmptyWorkspace();
  writeWorkspaceToDisk(workspace);
  return getState();
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function canManageProjects(role: UserRole) {
  return role === "admin";
}

export function upsertCalendar(cal: import("./types").WorkingCalendar, role: UserRole) {
  if (!canManageProjects(role)) throw new Error("Only administrators can edit calendars.");
  return updateWorkspace((w) => {
    const idx = w.calendars.findIndex((c) => c.id === cal.id);
    if (idx === -1) w.calendars.push(cal);
    else w.calendars[idx] = { ...w.calendars[idx], ...cal };
  });
}

export function createProject(payload: Partial<ProjectInfo>, role: UserRole) {
  if (!canManageProjects(role)) throw new Error("Only administrators can create projects.");
  return updateWorkspace((w) => {
    const id = createId("proj");
    if (!w.calendars.length) {
      w.calendars.push(defaultWorkingCalendar());
    }
    let calId = payload.calendarId ?? w.calendars[0]!.id;
    if (!w.calendars.some((c) => c.id === calId)) {
      calId = w.calendars[0]!.id;
    }
    const base = cloneState(emptyState);
    base.project = {
      ...base.project,
      id,
      name: payload.name ?? "New project",
      client: payload.client ?? "",
      location: payload.location ?? "",
      budget: payload.budget ?? "",
      startDate: payload.startDate ?? "",
      endDate: payload.endDate ?? "",
      status: payload.status ?? "draft",
      progress: 0,
      description: payload.description ?? "",
      calendarId: calId,
    };
    base.resources = [];
    base.tasks = [];
    base.allocations = [];
    base.documents = [];
    base.lastUpdatedAt = new Date().toISOString();
    w.projects.push({
      id,
      name: base.project.name,
      calendarId: calId,
      state: base,
    });
    w.activeProjectId = id;
  });
}

export function updateProjectRecord(projectId: string, updates: Partial<{ name: string; calendarId: string }>, role: UserRole) {
  if (!canManageProjects(role)) throw new Error("Only administrators can update projects.");
  return updateWorkspace((w) => {
    const rec = w.projects.find((p) => p.id === projectId);
    if (!rec) throw new Error("Project not found.");
    if (updates.name !== undefined) {
      rec.name = updates.name;
      rec.state.project.name = updates.name;
    }
    if (updates.calendarId !== undefined) {
      rec.calendarId = updates.calendarId;
      rec.state.project.calendarId = updates.calendarId;
    }
  });
}

export function activateProject(projectId: string) {
  return updateWorkspace((w) => {
    if (!w.projects.some((p) => p.id === projectId)) throw new Error("Project not found.");
    w.activeProjectId = projectId;
  });
}

export function deleteProject(projectId: string, role: UserRole) {
  if (!canManageProjects(role)) throw new Error("Only administrators can delete projects.");
  return updateWorkspace((w) => {
    if (w.projects.length <= 1) throw new Error("Cannot delete the last project.");
    w.projects = w.projects.filter((p) => p.id !== projectId);
    w.globalResources = w.globalResources.map((r) => ({ ...r }));
    if (w.activeProjectId === projectId) {
      w.activeProjectId = w.projects[0]!.id;
    }
  });
}

export function saveBaseline(actorName: string, role: UserRole) {
  if (!canEditTasks(role)) throw new Error("You do not have permission to save baseline.");
  return updateState((draft) => {
    for (const t of draft.tasks) {
      t.baselineStart = t.start;
      t.baselineEnd = t.end;
      t.baselineDuration = taskDurationDays(t);
    }
    draft.activities.unshift({
      id: createId("activity"),
      action: "Baseline saved",
      detail: `Schedule baseline captured by ${actorName}`,
      time: "just now",
      user: actorName,
      createdAt: new Date().toISOString(),
    });
  });
}

function walkWbs(node: WBSNode, collector: WBSNode[] = []) {
  collector.push(node);
  node.children?.forEach((child) => walkWbs(child, collector));
  return collector;
}

function inferTaskStatus(task: PartialTask): TaskStatus {
  if (task.status) return task.status;
  const progress = task.progress ?? 0;
  if (progress >= 100) return "completed";
  if (progress > 0) return "in_progress";
  if (task.start && task.end) {
    const now = new Date();
    const start = new Date(task.start);
    const end = new Date(task.end);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      if (now > end) return "completed";
      if (now >= start && now <= end) return "in_progress";
    }
  }
  return "not_started";
}

function inferTaskProgress(task: PartialTask) {
  if (typeof task.progress === "number") {
    return Math.max(0, Math.min(100, task.progress));
  }
  if (!task.start || !task.end) return 0;

  const now = Date.now();
  const start = new Date(task.start).getTime();
  const end = new Date(task.end).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.max(1, Math.min(99, Math.round(((now - start) / (end - start)) * 100)));
}

function normalizeTask(task: PartialTask, index: number): GanttTask {
  const inferredProgress = inferTaskProgress(task);
  return {
    id: task.activityId || `GEN-${index + 1}`,
    name: task.name,
    activityId: task.activityId,
    start: task.start ?? new Date().toISOString().slice(0, 10),
    end: task.end ?? new Date().toISOString().slice(0, 10),
    progress: inferredProgress,
    status: task.status ?? inferTaskStatus({ ...task, progress: inferredProgress }),
    duration: task.duration,
    durationUnit: task.duration !== undefined ? "calendar_day" : undefined,
    dependencies: task.dependencies ?? [],
    dependencyLagByPredecessor: task.dependencyLagByPredecessor ?? {},
    isMilestone: Boolean(task.isMilestone),
    isCritical: task.isCritical ?? false,
    assigned: task.assigned ?? "Unassigned",
    assignedResourceId: task.assignedResourceId,
    parentActivity: task.parentActivity,
    wbsNodeId: task.wbsNodeId,
  };
}

function normalizeResource(resource: PartialResource, projectId: string): ResourceItem {
  const scope = resource.scope ?? "project";
  return {
    id: resource.id ?? createId("resource"),
    name: resource.name,
    role: resource.role,
    type: resource.type ?? "person",
    status: resource.status ?? ((resource.allocated ?? 0) > 0 ? "allocated" : "available"),
    capacity: resource.capacity ?? 100,
    allocated: Math.max(0, Math.min(100, resource.allocated ?? 0)),
    costRate: resource.costRate ?? 0,
    rateBasis: resource.rateBasis ?? "hour",
    scope,
    projectId: scope === "project" ? resource.projectId ?? projectId : undefined,
    skills: resource.skills ?? [],
    email: resource.email ?? "",
    updatedAt: new Date().toISOString(),
  };
}

function mergeResources(existing: ResourceItem[], incoming: PartialResource[], projectId: string): ResourceItem[] {
  const next = [...existing];
  for (const incomingResource of incoming) {
    const match = next.find(
      (resource) =>
        resource.name.toLowerCase() === incomingResource.name.toLowerCase() ||
        (incomingResource.email && resource.email.toLowerCase() === incomingResource.email.toLowerCase()),
    );

    if (match) {
      match.role = incomingResource.role || match.role;
      match.type = incomingResource.type ?? match.type;
      match.allocated = incomingResource.allocated ?? match.allocated;
      match.capacity = incomingResource.capacity ?? match.capacity;
      match.status = incomingResource.status ?? match.status;
      match.costRate = incomingResource.costRate ?? match.costRate;
      match.rateBasis = incomingResource.rateBasis ?? match.rateBasis;
      match.scope = incomingResource.scope ?? match.scope;
      match.projectId =
        match.scope === "project" ? incomingResource.projectId ?? projectId ?? match.projectId : undefined;
      match.skills = incomingResource.skills?.length ? incomingResource.skills : match.skills;
      match.email = incomingResource.email ?? match.email;
      match.updatedAt = new Date().toISOString();
    } else {
      next.push(normalizeResource(incomingResource, projectId));
    }
  }

  return next;
}

function mergeGlobalResources(existing: ResourceItem[], incoming: PartialResource[]): ResourceItem[] {
  const next = [...existing];
  for (const incomingResource of incoming) {
    const scoped = { ...incomingResource, scope: "global" as const };
    const match = next.find(
      (resource) =>
        resource.name.toLowerCase() === scoped.name.toLowerCase() ||
        (scoped.email && resource.email.toLowerCase() === scoped.email.toLowerCase()),
    );
    if (match) {
      match.role = scoped.role || match.role;
      match.type = scoped.type ?? match.type;
      match.costRate = scoped.costRate ?? match.costRate;
      match.rateBasis = scoped.rateBasis ?? match.rateBasis;
      match.updatedAt = new Date().toISOString();
    } else {
      next.push(normalizeResource(scoped, ""));
    }
  }
  return next;
}

function mergeMilestones(existing: Milestone[], incoming: PartialMilestone[]) {
  const next = [...existing];
  for (const incomingMilestone of incoming) {
    const match = next.find(
      (milestone) => milestone.name.toLowerCase() === incomingMilestone.name.toLowerCase(),
    );
    if (match) {
      match.date = incomingMilestone.date ?? match.date;
      match.status = incomingMilestone.status ?? match.status;
    } else {
      next.push({
        id: createId("milestone"),
        name: incomingMilestone.name,
        date: incomingMilestone.date ?? new Date().toISOString().slice(0, 10),
        status: incomingMilestone.status ?? "pending",
      });
    }
  }
  return next;
}

function mergeRisks(existing: RiskItem[], incoming: RiskItem[]) {
  const deduped = [...existing];
  for (const risk of incoming) {
    const alreadyExists = deduped.some(
      (item) => item.title.toLowerCase() === risk.title.toLowerCase(),
    );
    if (!alreadyExists) {
      deduped.push({ ...risk, id: risk.id || createId("risk") });
    }
  }
  return deduped;
}

function buildAllocations(tasks: GanttTask[], resources: ResourceItem[]): AllocationItem[] {
  return tasks
    .filter((task) => task.assigned && task.assigned !== "Unassigned")
    .slice(0, 200)
    .map((task) => {
      const resource =
        (task.assignedResourceId && resources.find((r) => r.id === task.assignedResourceId)) ||
        resources.find(
          (item) =>
            item.name.toLowerCase() === task.assigned.toLowerCase() ||
            item.role.toLowerCase() === task.assigned.toLowerCase(),
        );

      return {
        id: createId("allocation"),
        resourceId: resource?.id ?? createId("resource-link"),
        taskId: task.id,
        taskName: task.name,
        startDate: task.start,
        endDate: task.end,
        allocation: Math.min(100, Math.max(20, Math.round((task.progress || 10) / 10) * 10)),
      };
    });
}

function deriveResourcesFromTasks(tasks: GanttTask[]): PartialResource[] {
  const buckets = new Map<string, number>();
  for (const task of tasks) {
    const key =
      task.assigned && task.assigned !== "Unassigned"
        ? task.assigned
        : task.parentActivity
          ? `${task.parentActivity} Team`
          : "Project Team";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, taskCount]) => ({
      name,
      role: taskCount > 20 ? "Core Delivery Team" : "Execution Team",
      type: "person" as const,
      allocated: Math.min(95, Math.max(25, taskCount * 4)),
      capacity: 100,
      status: "allocated" as const,
      skills: [],
      email: "",
      scope: "project" as const,
    }));
}

function relativeTime(dateValue: string) {
  const diff = Date.now() - new Date(dateValue).getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function computeDashboardStats(current: AppState): DashboardStats {
  const totalTasks = current.tasks.length;
  const tasksCompleted = current.tasks.filter((task) => task.status === "completed").length;
  const inProgress = current.tasks.filter((task) => task.status === "in_progress").length;
  const overdueTasks = current.tasks.filter(
    (task) => new Date(task.end) < new Date() && task.status !== "completed",
  ).length;
  const criticalTasks = current.tasks.filter((task) => task.isCritical).length;
  const resourceUtilization = current.resources.length
    ? Math.round(
        current.resources.reduce((sum, resource) => sum + resource.allocated, 0) /
          current.resources.length,
      )
    : 0;

  return {
    overallProgress: current.project.progress,
    tasksCompleted,
    totalTasks,
    inProgress,
    overdueTasks,
    criticalTasks,
    resourceUtilization,
  };
}

export function getBootstrapResponse(): BootstrapResponse {
  const current = getState();
  return {
    state: current,
    dashboard: computeDashboardStats(current),
    workspace: workspaceMeta(),
  };
}

function mergedActiveResources(draft: AppState): ResourceItem[] {
  const gid = draft.project.id;
  return [
    ...workspace.globalResources.map((r) => ensureResourceDefaults({ ...r }, "global")),
    ...draft.resources.map((r) => ensureResourceDefaults({ ...r }, "project", gid)),
  ];
}

export function upsertResource(resource: PartialResource, role: UserRole) {
  const scope = resource.scope ?? "project";
  if (scope === "global" && !canManageProjects(role)) {
    throw new Error("Only administrators can manage global resources.");
  }
  if (scope === "global") {
    return updateWorkspace((w) => {
      w.globalResources = mergeGlobalResources(w.globalResources, [resource]);
      const rec = w.projects.find((p) => p.id === w.activeProjectId);
      if (rec) {
        rec.state.allocations = buildAllocations(rec.state.tasks, mergeResourcesForBootstrap(w, rec));
      }
    });
  }
  return updateState((draft) => {
    const pid = draft.project.id;
    draft.resources = mergeResources(draft.resources, [resource], pid);
    draft.allocations = buildAllocations(draft.tasks, mergedActiveResources(draft));
    draft.activities.unshift({
      id: createId("activity"),
      action: "Resource updated",
      detail: `${resource.name} was updated`,
      time: "just now",
      user: "Admin",
      createdAt: new Date().toISOString(),
    });
  });
}

function canEditTasks(role: UserRole) {
  return role !== "viewer";
}

function findWbsNodeById(node: WBSNode, id: string): WBSNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findWbsNodeById(child, id);
    if (found) return found;
  }
  return null;
}

function syncTaskToWbs(task: GanttTask, wbs: WBSNode) {
  const loweredName = task.name.toLowerCase();
  const target = walkWbs(wbs).find((node) => {
    if (node.type !== "task" && node.type !== "work_package") return false;
    return (
      node.id === task.id ||
      node.code === task.id ||
      (task.activityId && (node.id === task.activityId || node.code === task.activityId)) ||
      node.name.toLowerCase() === loweredName ||
      node.name.toLowerCase().includes(`: ${loweredName}`)
    );
  });
  if (!target) return;
  target.progress = task.progress;
  target.status = task.status;
}

function refreshProjectProgress(draft: AppState) {
  if (!draft.tasks.length) return;
  draft.project.progress = Math.round(
    draft.tasks.reduce((sum, task) => sum + task.progress, 0) / draft.tasks.length,
  );
}

export function updateTask(
  taskId: string,
  updates: Partial<GanttTask>,
  actorName: string,
  role: UserRole,
) {
  if (!canEditTasks(role)) {
    throw new Error("You do not have permission to edit tasks.");
  }

  return updateState((draft) => {
    const idx = draft.tasks.findIndex((task) => task.id === taskId);
    if (idx === -1) {
      throw new Error("Task not found.");
    }
    const previous = draft.tasks[idx];
    const next: GanttTask = {
      ...previous,
      ...updates,
      id: previous.id,
      activityId: updates.activityId ?? previous.activityId,
      dependencies: updates.dependencies ?? previous.dependencies,
      progress: Math.max(0, Math.min(100, updates.progress ?? previous.progress)),
      status: (updates.status ?? previous.status) as TaskStatus,
    };
    draft.tasks[idx] = next;
    syncTaskToWbs(next, draft.wbs);
    draft.allocations = buildAllocations(draft.tasks, mergedActiveResources(draft));
    refreshProjectProgress(draft);
    draft.activities.unshift({
      id: createId("activity"),
      action: "Task updated",
      detail: `${next.name} updated by ${actorName} (${role})`,
      time: "just now",
      user: actorName,
      createdAt: new Date().toISOString(),
    });
  });
}

export function createTask(task: PartialTask, actorName: string, role: UserRole) {
  if (!canEditTasks(role)) {
    throw new Error("You do not have permission to create tasks.");
  }
  return updateState((draft) => {
    const normalized = normalizeTask(task, draft.tasks.length + 1);
    draft.tasks.push(normalized);
    syncTaskToWbs(normalized, draft.wbs);
    draft.allocations = buildAllocations(draft.tasks, mergedActiveResources(draft));
    refreshProjectProgress(draft);
    draft.activities.unshift({
      id: createId("activity"),
      action: "Task created",
      detail: `${normalized.name} created by ${actorName} (${role})`,
      time: "just now",
      user: actorName,
      createdAt: new Date().toISOString(),
    });
  });
}

export function updateWbsNode(
  nodeId: string,
  updates: Partial<Pick<WBSNode, "name" | "status" | "progress" | "type">>,
  actorName: string,
  role: UserRole,
) {
  if (!canEditTasks(role)) {
    throw new Error("You do not have permission to edit WBS.");
  }
  return updateState((draft) => {
    const target = findWbsNodeById(draft.wbs, nodeId);
    if (!target) throw new Error("WBS node not found.");
    target.name = updates.name ?? target.name;
    target.status = updates.status ?? target.status;
    target.type = updates.type ?? target.type;
    target.progress = Math.max(0, Math.min(100, updates.progress ?? target.progress));

    const linkedTask = draft.tasks.find(
      (task) =>
        task.id === target.id ||
        task.activityId === target.id ||
        task.name.toLowerCase() === target.name.toLowerCase(),
    );
    if (linkedTask) {
      linkedTask.progress = target.progress;
      linkedTask.status = target.status;
    }
    refreshProjectProgress(draft);
    draft.activities.unshift({
      id: createId("activity"),
      action: "WBS node updated",
      detail: `${target.code} ${target.name} updated by ${actorName} (${role})`,
      time: "just now",
      user: actorName,
      createdAt: new Date().toISOString(),
    });
  });
}

export function createWbsNode(
  parentId: string,
  payload: Pick<WBSNode, "name" | "type" | "status" | "progress">,
  actorName: string,
  role: UserRole,
) {
  if (!canEditTasks(role)) {
    throw new Error("You do not have permission to create WBS nodes.");
  }
  return updateState((draft) => {
    const parent = findWbsNodeById(draft.wbs, parentId);
    if (!parent) throw new Error("Parent WBS node not found.");
    const siblingCount = (parent.children ?? []).length + 1;
    const code = `${parent.code}.${siblingCount}`;
    const node: WBSNode = {
      id: createId("wbs"),
      code,
      name: payload.name,
      level: parent.level + 1,
      type: payload.type,
      progress: Math.max(0, Math.min(100, payload.progress)),
      status: payload.status,
      children: [],
    };
    parent.children = [...(parent.children ?? []), node];
    draft.activities.unshift({
      id: createId("activity"),
      action: "WBS node created",
      detail: `${node.code} ${node.name} created by ${actorName} (${role})`,
      time: "just now",
      user: actorName,
      createdAt: new Date().toISOString(),
    });
  });
}

export function moveTask(
  taskId: string,
  targetStart: string,
  targetEnd: string,
  actorName: string,
  role: UserRole,
) {
  if (!canEditTasks(role)) {
    throw new Error("You do not have permission to move tasks.");
  }
  return updateTask(taskId, { start: targetStart, end: targetEnd }, actorName, role);
}

export function assignTaskResource(taskId: string, assignee: string, actorName: string, role: UserRole) {
  if (!canEditTasks(role)) {
    throw new Error("You do not have permission to assign task resources.");
  }
  const trimmed = assignee.trim();
  if (!trimmed || trimmed === "Unassigned") {
    return updateTask(taskId, { assigned: "Unassigned", assignedResourceId: undefined }, actorName, role);
  }
  const rec = getActiveProjectRecord();
  const merged = mergeResourcesForBootstrap(workspace, rec);
  const byId = merged.find((r) => r.id === trimmed);
  const byName = merged.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
  const res = byId ?? byName;
  return updateTask(
    taskId,
    {
      assigned: res?.name ?? trimmed,
      assignedResourceId: res?.id,
    },
    actorName,
    role,
  );
}

export function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  actorName: string,
  role: UserRole,
) {
  if (!canEditTasks(role)) {
    throw new Error("You do not have permission to update task status.");
  }
  const progressByStatus: Record<TaskStatus, number> = {
    completed: 100,
    in_progress: 50,
    not_started: 0,
    at_risk: 35,
  };
  return updateTask(taskId, { status, progress: progressByStatus[status] }, actorName, role);
}

export function addDocument(document: DocumentRecord) {
  return updateState((draft) => {
    draft.documents.unshift(document);
    draft.activities.unshift({
      id: createId("activity"),
      action: "Document uploaded",
      detail: `${document.name} uploaded for AI processing`,
      time: "just now",
      user: "Admin",
      createdAt: new Date().toISOString(),
    });
  });
}

export function updateDocument(documentId: string, updater: (document: DocumentRecord) => DocumentRecord) {
  return updateState((draft) => {
    draft.documents = draft.documents.map((document) =>
      document.id === documentId ? updater(document) : document,
    );
  });
}

export function deleteDocument(documentId: string) {
  return updateState((draft) => {
    draft.documents = draft.documents.filter((document) => document.id !== documentId);
  });
}

export function applyDocumentAnalysis(
  documentId: string,
  pageAnalyses: DocumentPageAnalysis[],
  aggregate: AggregatedExtraction,
  artifacts: OpenAIArtifacts,
) {
  return updateState((draft) => {
    const mergeDefined = <T extends Record<string, unknown>>(base: T, ...updates: Array<Partial<T> | undefined>) => {
      const next = { ...base };
      for (const update of updates) {
        if (!update) continue;
        for (const [key, value] of Object.entries(update)) {
          if (value !== undefined && value !== null && value !== "") {
            (next as Record<string, unknown>)[key] = value;
          }
        }
      }
      return next;
    };

    const resolvedTasks = artifacts.tasks.length ? artifacts.tasks : aggregate.tasks;
    const taskStarts = resolvedTasks
      .map((task) => (task.start ? new Date(task.start).getTime() : Number.NaN))
      .filter((value) => Number.isFinite(value)) as number[];
    const taskEnds = resolvedTasks
      .map((task) => (task.end ? new Date(task.end).getTime() : Number.NaN))
      .filter((value) => Number.isFinite(value)) as number[];
    const inferredStartDate = taskStarts.length
      ? new Date(Math.min(...taskStarts)).toISOString().slice(0, 10)
      : undefined;
    const inferredEndDate = taskEnds.length
      ? new Date(Math.max(...taskEnds)).toISOString().slice(0, 10)
      : undefined;

    draft.project = {
      ...mergeDefined(draft.project, aggregate.projectUpdates, artifacts.projectUpdates),
      name:
        artifacts.projectUpdates?.name ||
        aggregate.projectUpdates?.name ||
        artifacts.wbs?.name ||
        draft.project.name,
      startDate:
        artifacts.projectUpdates?.startDate ||
        aggregate.projectUpdates?.startDate ||
        inferredStartDate ||
        draft.project.startDate,
      endDate:
        artifacts.projectUpdates?.endDate ||
        aggregate.projectUpdates?.endDate ||
        inferredEndDate ||
        draft.project.endDate,
      progress:
        artifacts.projectUpdates?.progress ??
        aggregate.projectUpdates?.progress ??
        Math.round(
          (artifacts.tasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) /
            Math.max(artifacts.tasks.length, 1)),
        ),
    } satisfies ProjectInfo;

    const nextTasks = artifacts.tasks.length
      ? artifacts.tasks.map(normalizeTask)
      : aggregate.tasks.map(normalizeTask);

    if (nextTasks.length) {
      draft.tasks = nextTasks;
    }

    draft.resources = mergeResources(
      draft.resources,
      artifacts.resources.length ? artifacts.resources : aggregate.resources,
      draft.project.id,
    );

    if (draft.resources.length === 0 && draft.tasks.length > 0) {
      draft.resources = mergeResources(draft.resources, deriveResourcesFromTasks(draft.tasks), draft.project.id);
    }

    draft.milestones = mergeMilestones(
      draft.milestones,
      artifacts.milestones.length ? artifacts.milestones : aggregate.milestones,
    );

    draft.risks = mergeRisks(draft.risks, [...aggregate.risks, ...artifacts.risks]);
    draft.wbs = artifacts.wbs;
    draft.allocations = buildAllocations(draft.tasks, mergedActiveResources(draft));

    const latestInsights: InsightItem[] = [
      {
        id: createId("insight"),
        type: "info",
        message: artifacts.summary || aggregate.summary,
      },
      ...aggregate.insights.slice(0, 2).map((message) => ({
        id: createId("insight"),
        type: "suggestion" as const,
        message,
      })),
    ];
    draft.insights = [...latestInsights, ...draft.insights].slice(0, 6);

    draft.documents = draft.documents.map((document) =>
      document.id === documentId
        ? {
            ...document,
            status: "completed",
            progress: 100,
            currentStage: "idle",
            currentPage: undefined,
            lastMessage: "Document ingestion + artifact generation completed.",
            pageCount: pageAnalyses.length,
            pageAnalyses,
            parsedData: {
              tasksExtracted: draft.tasks.length,
              resourcesFound: draft.resources.length,
              milestonesIdentified: draft.milestones.length,
            },
            error: undefined,
          }
        : document,
    );

    draft.activities.unshift({
      id: createId("activity"),
      action: "AI extraction completed",
      detail: `AI generated WBS, tasks, resources, and milestones from ${draft.documents.find((document) => document.id === documentId)?.name ?? "uploaded document"}`,
      time: "just now",
      user: "OpenAI",
      createdAt: new Date().toISOString(),
    });

    draft.activities = draft.activities
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 12)
      .map((activity: ActivityItem) => ({
        ...activity,
        time: relativeTime(activity.createdAt),
      }));
  });
}

export function markDocumentFailed(documentId: string, message: string) {
  return updateState((draft) => {
    draft.documents = draft.documents.map((document) =>
      document.id === documentId
        ? {
            ...document,
            status: "failed",
            progress: 100,
            currentStage: "failed",
            currentPage: undefined,
            lastMessage: message,
            error: message,
          }
        : document,
    );
    draft.activities.unshift({
      id: createId("activity"),
      action: "AI extraction failed",
      detail: message,
      time: "just now",
      user: "System",
      createdAt: new Date().toISOString(),
    });
  });
}

export function replaceArtifacts(artifacts: OpenAIArtifacts) {
  return updateState((draft) => {
    draft.wbs = artifacts.wbs;
    if (artifacts.tasks.length) {
      draft.tasks = artifacts.tasks.map(normalizeTask);
    }
    draft.resources = mergeResources(draft.resources, artifacts.resources, draft.project.id);
    if (draft.resources.length === 0 && draft.tasks.length > 0) {
      draft.resources = mergeResources(draft.resources, deriveResourcesFromTasks(draft.tasks), draft.project.id);
    }
    draft.milestones = mergeMilestones(draft.milestones, artifacts.milestones);
    draft.risks = mergeRisks(draft.risks, artifacts.risks);
    draft.allocations = buildAllocations(draft.tasks, mergedActiveResources(draft));

    draft.activities.unshift({
      id: createId("activity"),
      action: "AI artifacts regenerated",
      detail: artifacts.summary,
      time: "just now",
      user: "OpenAI",
      createdAt: new Date().toISOString(),
    });

    draft.project = {
      ...draft.project,
      ...artifacts.projectUpdates,
      progress: Math.round(
        draft.tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(draft.tasks.length, 1),
      ),
    };
    draft.insights.unshift({
      id: createId("insight"),
      type: "info",
      message: artifacts.summary,
    });
  });
}

export function summarizeStateForPrompt(current: AppState) {
  const wbsNodes = walkWbs(current.wbs)
    .slice(0, 20)
    .map((node) => ({
      code: node.code,
      name: node.name,
      status: node.status,
      progress: node.progress,
    }));

  return {
    project: current.project,
    tasks: current.tasks,
    resources: current.resources,
    milestones: current.milestones,
    risks: current.risks,
    insights: current.insights,
    documents: current.documents.map((document) => ({
      id: document.id,
      name: document.name,
      status: document.status,
      parsedData: document.parsedData,
    })),
    wbsNodes,
  };
}
