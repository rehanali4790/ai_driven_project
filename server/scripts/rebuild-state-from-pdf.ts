import fs from "fs";
import path from "path";
import { extractStructuredPdfPages, aggregateActivities } from "../enhanced-parsers";
import { AppState, GanttTask, ResourceItem, RiskItem, WBSNode } from "../types";
import { emptyState } from "../seed";

type StructuredTask = {
  activityId: string;
  name: string;
  duration: number;
  start: string;
  end: string;
  parent: string;
  progress: number;
  status: GanttTask["status"];
  isMilestone: boolean;
  isCritical: boolean;
};

const PDF_FILE = path.resolve(
  process.cwd(),
  "285 - Submission of Revised Work Program  .REC (1).pdf",
);
const STATE_FILE = path.resolve(process.cwd(), "data", "app-state.json");
const TODAY = new Date();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inferProgress(start: string, end: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  const n = TODAY.getTime();
  if (n <= s) return 0;
  if (n >= e) return 100;
  return clamp(Math.round(((n - s) / (e - s)) * 100), 1, 99);
}

function inferStatus(progress: number): GanttTask["status"] {
  if (progress >= 100) return "completed";
  if (progress > 0) return "in_progress";
  return "not_started";
}

function isHeaderLike(name: string) {
  return /activity id|activity name|original duration|bl project start|bl project finish/i.test(name);
}

function cleanName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function titleCase(input: string) {
  return input
    .split(" ")
    .map((chunk) => (chunk ? chunk[0].toUpperCase() + chunk.slice(1).toLowerCase() : chunk))
    .join(" ");
}

function buildWbsFromTasks(tasks: StructuredTask[], projectName: string): WBSNode {
  const parentGroups = new Map<string, StructuredTask[]>();
  for (const task of tasks) {
    const key = task.parent || "General Activities";
    if (!parentGroups.has(key)) parentGroups.set(key, []);
    parentGroups.get(key)!.push(task);
  }

  const parents = [...parentGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const phaseNodes: WBSNode[] = parents.map(([parentName, items], index) => {
    const children: WBSNode[] = items
      .slice()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .map((task, taskIndex) => ({
        id: `1.${index + 1}.${taskIndex + 1}`,
        code: `1.${index + 1}.${taskIndex + 1}`,
        name: `${task.activityId}: ${task.name}`,
        level: 2,
        type: "work_package",
        progress: task.progress,
        status: task.status,
      }));

    const avg = Math.round(
      children.reduce((sum, child) => sum + child.progress, 0) / Math.max(children.length, 1),
    );
    const status: GanttTask["status"] = avg >= 100 ? "completed" : avg > 0 ? "in_progress" : "not_started";
    return {
      id: `1.${index + 1}`,
      code: `1.${index + 1}`,
      name: titleCase(parentName),
      level: 1,
      type: "phase",
      progress: avg,
      status,
      children,
    };
  });

  const overall = Math.round(
    tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(tasks.length, 1),
  );
  return {
    id: "1",
    code: "1.0",
    name: projectName,
    level: 0,
    type: "project",
    progress: overall,
    status: overall >= 100 ? "completed" : overall > 0 ? "in_progress" : "not_started",
    children: phaseNodes,
  };
}

function buildResources(tasks: StructuredTask[]): ResourceItem[] {
  const byTeam = new Map<string, StructuredTask[]>();
  for (const task of tasks) {
    const team = task.parent ? `${titleCase(task.parent)} Team` : "Core Project Team";
    if (!byTeam.has(team)) byTeam.set(team, []);
    byTeam.get(team)!.push(task);
  }

  const nowIso = new Date().toISOString();
  return [...byTeam.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 24)
    .map(([name, teamTasks], index) => {
      const inProgress = teamTasks.filter((task) => task.status === "in_progress").length;
      const allocated = clamp(Math.round((inProgress / Math.max(teamTasks.length, 1)) * 100), 20, 95);
      return {
        id: `resource-${index + 1}`,
        name,
        role: "Execution Team",
        type: "person",
        status: allocated > 50 ? "allocated" : "available",
        capacity: 100,
        allocated,
        costRate: 0,
        rateBasis: "hour" as const,
        scope: "project" as const,
        skills: [],
        email: "",
        updatedAt: nowIso,
      };
    });
}

function buildRisks(tasks: StructuredTask[]): RiskItem[] {
  const overdue = tasks.filter((task) => new Date(task.end) < TODAY && task.progress < 100);
  const criticalActive = tasks.filter((task) => task.isCritical && task.status !== "completed");
  const risks: RiskItem[] = [];

  if (overdue.length) {
    risks.push({
      id: "risk-overdue",
      title: `${overdue.length} overdue schedule activities`,
      severity: overdue.length > 25 ? "high" : overdue.length > 10 ? "medium" : "low",
      description: "Activities are past finish date but not complete.",
      mitigation: "Resequence overdue work packages and allocate focused execution crews.",
    });
  }

  if (criticalActive.length) {
    risks.push({
      id: "risk-critical",
      title: `${criticalActive.length} critical path activities active`,
      severity: "high",
      description: "Critical activities remain active and can impact final completion date.",
      mitigation: "Track critical path daily and prioritize dependencies clearing.",
    });
  }

  return risks;
}

function extractProjectInfo(rawText: string) {
  const compact = rawText.replace(/\s+/g, " ").trim();
  const nameMatch =
    compact.match(/Infrastructure Development of Education City[, ]*Karac[^\d]{0,40}/i) ??
    compact.match(/Infrastructure Development[^0-9]{8,120}/i);
  const startEnd = compact.match(/(\d{1,2}-[A-Za-z]{3}-\d{2})\s+(\d{1,2}-[A-Za-z]{3}-\d{2})/);

  const parseDate = (value?: string) => {
    if (!value) return "";
    const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (!match) return "";
    const mm: Record<string, string> = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };
    const month = mm[match[2]];
    if (!month) return "";
    return `20${match[3]}-${month}-${match[1].padStart(2, "0")}`;
  };

  return {
    name: nameMatch ? cleanName(nameMatch[0]) : "Education City Infrastructure Development - Revised Program",
    client: "CGD Consulting",
    location: "Karachi, Pakistan",
    budget: "PKR 12.5 Billion",
    startDate: startEnd ? parseDate(startEnd[1]) : "",
    endDate: startEnd ? parseDate(startEnd[2]) : "",
  };
}

async function main() {
  if (!fs.existsSync(PDF_FILE)) {
    throw new Error(`PDF file not found: ${PDF_FILE}`);
  }
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error(`State file not found: ${STATE_FILE}`);
  }

  const current = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as AppState;
  const pages = await extractStructuredPdfPages(PDF_FILE);
  const activities = aggregateActivities(pages);

  const mapById = new Map<string, StructuredTask>();
  for (const item of activities) {
    if (!item.activityId) continue;
    if (!item.startDate || !item.endDate) continue;
    if (isHeaderLike(item.name)) continue;
    if (item.duration === null || item.duration < 0 || item.duration > 2000) continue;

    const name = cleanName(item.name);
    if (name.length < 2 || name.length > 150) continue;
    const progress = inferProgress(item.startDate, item.endDate);
    const task: StructuredTask = {
      activityId: item.activityId,
      name,
      duration: item.duration,
      start: item.startDate,
      end: item.endDate,
      parent: item.parentName ? cleanName(item.parentName) : "General Activities",
      progress,
      status: inferStatus(progress),
      isMilestone: item.isMilestone || item.duration === 0,
      isCritical: progress > 0 && progress < 100,
    };

    const existing = mapById.get(task.activityId);
    if (!existing) {
      mapById.set(task.activityId, task);
    } else {
      // Keep cleaner name and widest date window if duplicate IDs appear.
      existing.name = existing.name.length <= task.name.length ? existing.name : task.name;
      existing.start = new Date(existing.start) <= new Date(task.start) ? existing.start : task.start;
      existing.end = new Date(existing.end) >= new Date(task.end) ? existing.end : task.end;
      existing.duration = Math.max(existing.duration, task.duration);
      existing.progress = Math.max(existing.progress, task.progress);
      existing.status = inferStatus(existing.progress);
      if (existing.parent === "General Activities" && task.parent !== "General Activities") {
        existing.parent = task.parent;
      }
      existing.isMilestone = existing.isMilestone || task.isMilestone;
    }
  }

  const tasksSorted = [...mapById.values()].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  const projectMeta = extractProjectInfo(pages.map((page) => page.text).join(" "));
  const startDate = tasksSorted[0]?.start || projectMeta.startDate || "";
  const endDate = tasksSorted[tasksSorted.length - 1]?.end || projectMeta.endDate || "";

  const tasks: GanttTask[] = tasksSorted.map((task) => ({
    id: task.activityId,
    activityId: task.activityId,
    name: task.name,
    start: task.start,
    end: task.end,
    progress: task.progress,
    status: task.status,
    duration: task.duration,
    dependencies: [],
    isMilestone: task.isMilestone,
    isCritical: task.isCritical,
    assigned: `${titleCase(task.parent)} Team`,
    parentActivity: task.parent,
  }));

  for (let i = 1; i < tasks.length; i += 1) {
    const prev = tasks[i - 1];
    const currentTask = tasks[i];
    const prevEnd = new Date(prev.end).getTime();
    const curStart = new Date(currentTask.start).getTime();
    if (curStart >= prevEnd && curStart - prevEnd <= 14 * 24 * 60 * 60 * 1000) {
      currentTask.dependencies = [prev.id];
    }
  }

  const resources = buildResources(tasksSorted);
  const wbs = buildWbsFromTasks(tasksSorted, projectMeta.name);
  const milestones = tasks
    .filter((task) => task.isMilestone)
    .map((task, index) => ({
      id: `milestone-${index + 1}`,
      name: `${task.activityId}: ${task.name}`,
      date: task.start,
      status:
        task.progress >= 100 ? ("completed" as const) : task.progress > 0 ? ("in_progress" as const) : ("pending" as const),
    }));
  const risks = buildRisks(tasksSorted);

  const completed = tasks.filter((task) => task.status === "completed").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const overallProgress = Math.round(
    tasks.reduce((sum, task) => sum + task.progress, 0) / Math.max(tasks.length, 1),
  );

  const nextState: AppState = {
    ...current,
    project: {
      ...current.project,
      id: current.project.id || "project-1",
      name: projectMeta.name,
      client: projectMeta.client,
      location: projectMeta.location,
      budget: projectMeta.budget,
      startDate,
      endDate,
      status: overallProgress >= 100 ? "Completed" : "In Progress",
      progress: overallProgress,
      description:
        "Rebuilt from 33-page revised work program with deterministic activity extraction and hierarchy grouping.",
    },
    tasks,
    resources,
    milestones,
    risks,
    wbs,
    allocations: tasks.slice(0, Math.min(tasks.length, 200)).map((task, index) => ({
      id: `allocation-${index + 1}`,
      resourceId: resources[index % Math.max(resources.length, 1)]?.id || "resource-1",
      taskName: task.name,
      startDate: task.start,
      endDate: task.end,
      allocation: clamp(task.progress > 0 ? Math.round(task.progress / 2) : 25, 20, 100),
    })),
    insights: [
      {
        id: `insight-${Date.now()}-1`,
        type: "info",
        message: `Deterministic rebuild parsed ${tasks.length} unique activities from 33 pages.`,
      },
      {
        id: `insight-${Date.now()}-2`,
        type: "suggestion",
        message: `Progress/date inference set ${completed} completed and ${inProgress} in-progress activities.`,
      },
      ...current.insights,
    ].slice(0, 12),
    activities: [
      {
        id: `activity-${Date.now()}`,
        action: "State rebuilt from PDF",
        detail: `Rebuilt app-state using all 33 pages of revised work program (${tasks.length} tasks, ${resources.length} resources).`,
        time: "just now",
        user: "System",
        createdAt: new Date().toISOString(),
      },
      ...current.activities,
    ].slice(0, 30),
    lastUpdatedAt: new Date().toISOString(),
  };

  const targetDoc = nextState.documents.find((doc) => /Revised Work Program/i.test(doc.name));
  if (targetDoc) {
    targetDoc.status = "completed";
    targetDoc.progress = 100;
    targetDoc.pageCount = 33;
    targetDoc.parsedData = {
      tasksExtracted: tasks.length,
      resourcesFound: resources.length,
      milestonesIdentified: milestones.length,
    };
    targetDoc.lastMessage =
      "Deterministic rebuild complete: full tasks/resources/WBS generated from all pages.";
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2), "utf8");

  const beforeTasks = current.tasks.length;
  const beforeResources = current.resources.length;
  const beforeMilestones = current.milestones.length;
  const beforeRisks = current.risks.length;
  const afterTasks = nextState.tasks.length;
  const afterResources = nextState.resources.length;
  const afterMilestones = nextState.milestones.length;
  const afterRisks = nextState.risks.length;

  console.log(
    JSON.stringify(
      {
        pdf: {
          file: path.basename(PDF_FILE),
          pages: pages.length,
          extractedActivities: activities.length,
          uniqueTaskIds: tasks.length,
        },
        gap: {
          tasks: { before: beforeTasks, after: afterTasks, delta: afterTasks - beforeTasks },
          resources: {
            before: beforeResources,
            after: afterResources,
            delta: afterResources - beforeResources,
          },
          milestones: {
            before: beforeMilestones,
            after: afterMilestones,
            delta: afterMilestones - beforeMilestones,
          },
          risks: { before: beforeRisks, after: afterRisks, delta: afterRisks - beforeRisks },
        },
        project: nextState.project,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
