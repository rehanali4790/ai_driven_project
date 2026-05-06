import type { GanttTask } from "./types";

function dayIndex(iso: string): number {
  return Math.floor(new Date(iso + "T12:00:00Z").getTime() / 86400000);
}

export function taskDurationDays(task: GanttTask): number {
  if (task.isMilestone) return 0;
  if (typeof task.duration === "number" && task.duration > 0) return Math.max(1, Math.round(task.duration));
  const d = dayIndex(task.end) - dayIndex(task.start) + 1;
  return Math.max(1, d);
}

function lagDays(task: GanttTask, predecessorId: string): number {
  const map = task.dependencyLagByPredecessor;
  if (map && predecessorId in map) return Math.max(0, map[predecessorId] ?? 0);
  return 0;
}

function topoSort(tasks: GanttTask[]): GanttTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const temp = new Set<string>();
  const out: GanttTask[] = [];

  function visit(id: string) {
    if (temp.has(id)) throw new Error("Cycle in task dependencies");
    if (visited.has(id)) return;
    temp.add(id);
    const t = byId.get(id);
    if (!t) return;
    for (const dep of t.dependencies ?? []) {
      if (byId.has(dep)) visit(dep);
    }
    temp.delete(id);
    visited.add(id);
    out.push(t);
  }
  for (const t of tasks) if (!visited.has(t.id)) visit(t.id);
  return out;
}

/** Finish-to-start CPM with calendar-day lag between predecessor finish and successor start. */
export function computeCpm(tasks: GanttTask[]): GanttTask[] {
  if (!tasks.length) return [];
  const order = topoSort(tasks);
  const predsOf = new Map<string, GanttTask[]>();
  for (const t of tasks) {
    for (const p of t.dependencies ?? []) {
      if (!tasks.some((x) => x.id === p)) continue;
      const arr = predsOf.get(t.id) ?? [];
      arr.push(tasks.find((x) => x.id === p)!);
      predsOf.set(t.id, arr);
    }
  }

  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  for (const t of order) {
    const D = taskDurationDays(t);
    let es = dayIndex(t.start);
    const preds = predsOf.get(t.id) ?? [];
    for (const p of preds) {
      const efp = earlyFinish.get(p.id) ?? dayIndex(p.end);
      const lag = lagDays(t, p.id);
      es = Math.max(es, efp + lag + 1);
    }
    earlyStart.set(t.id, es);
    earlyFinish.set(t.id, D <= 0 ? es : es + D - 1);
  }

  let projectFinish = 0;
  for (const t of tasks) {
    projectFinish = Math.max(projectFinish, earlyFinish.get(t.id) ?? 0);
  }

  const succsOf = new Map<string, GanttTask[]>();
  for (const t of tasks) {
    for (const p of t.dependencies ?? []) {
      if (!tasks.some((x) => x.id === p)) continue;
      const arr = succsOf.get(p) ?? [];
      arr.push(t);
      succsOf.set(p, arr);
    }
  }

  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();

  for (let i = order.length - 1; i >= 0; i--) {
    const t = order[i]!;
    const D = taskDurationDays(t);
    const succs = succsOf.get(t.id) ?? [];
    let lf = projectFinish;
    if (succs.length) {
      lf = Math.min(
        ...succs.map((s) => {
          const ls = lateStart.get(s.id) ?? dayIndex(s.start);
          const lag = lagDays(s, t.id);
          return ls - lag - 1;
        }),
      );
    }
    const ef = earlyFinish.get(t.id) ?? lf;
    lf = Math.min(lf, ef);
    lateFinish.set(t.id, lf);
    lateStart.set(t.id, D <= 0 ? lf : lf - D + 1);
  }

  return tasks.map((t) => {
    const es = earlyStart.get(t.id) ?? dayIndex(t.start);
    const ls = lateStart.get(t.id) ?? es;
    const totalFloat = Math.max(0, ls - es);
    return {
      ...t,
      totalFloat,
      isCritical: totalFloat === 0,
    };
  });
}
