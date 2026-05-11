import type { GanttTask, TaskStatus } from "./types";

function dayIndex(iso: string): number {
  return Math.floor(new Date(iso + "T12:00:00Z").getTime() / 86400000);
}

export function taskDurationDays(task: GanttTask): number {
  if (task.isMilestone) return 0;
  if (typeof task.duration === "number" && task.duration > 0) return Math.max(1, Math.round(task.duration));
  const d = dayIndex(task.end) - dayIndex(task.start) + 1;
  return Math.max(1, d);
}

/** Derive auto-status and overdue flag based on today's date, progress, and predecessors. */
export function computeCpm(tasks: GanttTask[]): GanttTask[] {
  if (!tasks.length) return [];

  const todayIdx = dayIndex(new Date().toISOString().slice(0, 10));

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  tasks.forEach((t) => {
    if (t.activityId) taskById.set(t.activityId, t);
    if (t.wbsNodeId) taskById.set(t.wbsNodeId, t);
  });

  return tasks.map((t) => {
    const startIdx = dayIndex(t.start);
    const endIdx = dayIndex(t.end);

    const hasIncompletePred = (t.dependencies ?? []).some((depId) => {
      const pred = taskById.get(depId);
      return pred && pred.status !== "completed" && (pred.progress ?? 0) < 100;
    });

    let autoStatus: TaskStatus = t.status;
    if (t.progress >= 100) {
      autoStatus = "completed";
    } else if (hasIncompletePred) {
      autoStatus = "not_started";
    } else if (endIdx < todayIdx) {
      autoStatus = "at_risk";
    } else if (startIdx <= todayIdx && todayIdx <= endIdx) {
      autoStatus = "in_progress";
    } else if (todayIdx < startIdx) {
      autoStatus = "not_started";
    }

    const overdue =
      endIdx < todayIdx &&
      autoStatus !== "completed" &&
      (t.progress ?? 0) < 100;

    return {
      ...t,
      status: autoStatus,
      isOverdue: overdue,
      isCritical: false,
    };
  });
}
