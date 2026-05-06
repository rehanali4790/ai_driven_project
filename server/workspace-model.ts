import { defaultWorkingCalendar } from "./scheduler";
import type {
  AllocationItem,
  AppState,
  GanttTask,
  ProjectRecord,
  ResourceItem,
  WorkingCalendar,
  Workspace,
} from "./types";

export function ensureResourceDefaults(
  r: ResourceItem,
  scope: ResourceItem["scope"],
  projectId?: string,
): ResourceItem {
  return {
    ...r,
    rateBasis: r.rateBasis ?? "hour",
    scope: r.scope ?? scope,
    projectId: scope === "project" ? projectId ?? r.projectId : undefined,
  };
}

/** Upgrade legacy flat AppState file to Workspace shape (in-memory). */
export function migrateLegacyAppStateToWorkspace(legacy: AppState, calendars: WorkingCalendar[]): Workspace {
  const defaultCal = calendars[0]?.id ?? defaultWorkingCalendar().id;
  const pid = legacy.project.id || "project-1";
  const taggedResources = legacy.resources.map((r) =>
    ensureResourceDefaults({ ...r }, "project", pid),
  );
  const state: AppState = {
    ...legacy,
    resources: taggedResources,
    allocations: legacy.allocations.map((a) => ({
      ...a,
      taskId:
        a.taskId ??
        legacy.tasks.find((t) => t.name === a.taskName)?.id ??
        "unknown-task",
    })),
    project: {
      ...legacy.project,
      calendarId: legacy.project.calendarId ?? defaultCal,
    },
  };

  const record: ProjectRecord = {
    id: pid,
    name: legacy.project.name || "Project",
    calendarId: defaultCal,
    state,
  };

  return {
    activeProjectId: pid,
    calendars: calendars.length ? calendars : [defaultWorkingCalendar()],
    globalResources: [],
    projects: [record],
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function hydrateWorkspace(raw: Partial<Workspace> | null | undefined): Workspace {
  const calendars =
    raw?.calendars?.length ? raw.calendars.map((c) => ({ ...defaultWorkingCalendar(), ...c })) : [defaultWorkingCalendar()];
  const projects = raw?.projects?.length
    ? raw.projects.map((p) => ({
        ...p,
        state: hydrateAppState(p.state, p.id),
      }))
    : [];

  const active =
    raw?.activeProjectId && projects.some((p) => p.id === raw.activeProjectId)
      ? raw.activeProjectId
      : projects[0]?.id ?? "project-empty";

  const globalResources = (raw?.globalResources ?? []).map((r) =>
    ensureResourceDefaults({ ...r }, "global"),
  );

  return {
    activeProjectId: active,
    calendars,
    globalResources,
    projects,
    lastUpdatedAt: raw?.lastUpdatedAt ?? new Date().toISOString(),
  };
}

function hydrateAppState(state: AppState | undefined, projectId: string): AppState {
  if (!state) {
    throw new Error("Invalid workspace: missing project state");
  }
  const resources = (state.resources ?? []).map((r) =>
    ensureResourceDefaults({ ...r }, r.scope ?? "project", projectId),
  );
  const allocations = (state.allocations ?? []).map((a) => hydrateAllocation(a, state.tasks));
  return {
    ...state,
    resources,
    allocations,
    tasks: (state.tasks ?? []).map(hydrateTask),
  };
}

function hydrateTask(t: GanttTask): GanttTask {
  return {
    ...t,
    dependencies: t.dependencies ?? [],
    dependencyLagByPredecessor: t.dependencyLagByPredecessor ?? {},
  };
}

function hydrateAllocation(a: AllocationItem, tasks: GanttTask[]): AllocationItem {
  if (a.taskId) return a;
  const match = tasks.find((t) => t.name === a.taskName);
  return { ...a, taskId: match?.id ?? "unknown-task" };
}
