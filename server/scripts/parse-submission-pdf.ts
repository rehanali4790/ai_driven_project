import fs from "fs";
import path from "path";
import { aggregateActivities, extractStructuredPdfPages } from "../enhanced-parsers";
import { AppState, GanttTask, Milestone, ResourceItem, RiskItem, WBSNode } from "../types";

type WorkPackageDef = { code: string; name: string; phaseCode: string };

const INPUT_PDF = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(process.cwd(), "285 - Submission of Revised Work Program  .REC (1).pdf");
const OUTPUT_STATE = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.resolve(process.cwd(), "data", "app-state.json");

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseProgress(start: string, end: string) {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  if (now <= s) return 0;
  if (now >= e) return 100;
  return clamp(Math.round(((now - s) / (e - s)) * 100), 1, 99);
}

function statusFromProgress(progress: number): GanttTask["status"] {
  if (progress >= 100) return "completed";
  if (progress > 0) return "in_progress";
  return "not_started";
}

function defaultState(): AppState {
  const now = new Date().toISOString();
  return {
    project: {
      id: "project-empty",
      name: "",
      client: "",
      location: "",
      budget: "",
      startDate: "",
      endDate: "",
      status: "",
      progress: 0,
      description: "",
    },
    documents: [],
    wbs: {
      id: "1",
      code: "1.0",
      name: "Project",
      level: 0,
      type: "project",
      progress: 0,
      status: "not_started",
      children: [],
    },
    tasks: [],
    resources: [],
    allocations: [],
    risks: [],
    milestones: [],
    activities: [],
    insights: [],
    lastUpdatedAt: now,
  };
}

function getWbsCode(task: GanttTask): string {
  const name = task.name.toLowerCase();
  const parent = (task.parentActivity ?? "").toLowerCase();
  const activityId = task.activityId ?? "";

  if (activityId === "A50040" || /commencement|notice to proceed/.test(name)) return "1.11.1";
  if (activityId === "A50050" || /project completion|handover|completion/.test(name)) return "1.11.2";

  if (activityId === "A50010" || /mobilization/.test(name)) return "1.1.1";
  if (activityId === "A50020" || /survey/.test(name)) return "1.1.2";

  const idNum = Number.parseInt(activityId.replace(/[^\d]/g, ""), 10);
  const isRoad4 = Number.isFinite(idNum) && idNum >= 1000 && idNum < 2000;
  const isRoad3 = Number.isFinite(idNum) && idNum >= 2000 && idNum < 2600;
  const isRoad5 = Number.isFinite(idNum) && idNum >= 2600 && idNum < 3300;

  const isEarth = /earthwork|cutting|cut and fill|subgrade|embankment|ngc|cg/.test(name + parent);
  const isDrain = /drain|catch basin|stone soling|lean|rcc bed|rcc wall|rcc slab/.test(name + parent);
  const isSewer = /sewer|manhole/.test(name + parent);
  const isWater = /water|tube well|reservoir|pump station|hdpe pipes|rcc pipe/.test(name + parent);
  const isRoad = /road works|asphalt|kerb|pavement|sub base|aggregate|tack coat|prime coat|signage|road studs/.test(
    name + parent,
  );

  if (isRoad4) {
    if (isEarth) return "1.2.1";
    if (isDrain) return "1.2.2";
    if (isSewer) return "1.2.3";
    if (isWater) return "1.2.4";
    if (isRoad) return "1.2.5";
  }
  if (isRoad3) {
    if (isEarth) return "1.3.1";
    if (isDrain) return "1.3.2";
    if (isSewer) return "1.3.3";
    if (isWater) return "1.3.4";
    if (isRoad) return "1.3.5";
  }
  if (isRoad5) {
    if (isEarth) return "1.4.1";
    if (isDrain) return "1.4.2";
    if (isSewer) return "1.4.3";
    if (isWater) return "1.4.4";
    if (isRoad) return "1.4.5";
  }

  if (/box culvert|three cell|two cell|one cell/.test(name + parent)) {
    if (/three cell/.test(name + parent)) return "1.5.1";
    if (/one cell/.test(name + parent)) return "1.5.3";
    return "1.5.2";
  }
  if (/bridge|pier|abutment|girder|bearing/.test(name + parent)) {
    if (/excavation|pile|foundation|retaining/.test(name + parent)) return "1.6.1";
    return "1.6.2";
  }
  if (/gate house|entry plaza|arch|ceiling|floor|glass|wood|mep/.test(name + parent)) {
    if (/ceiling|floor|glass|wood|metal|architecture/.test(name + parent)) return "1.7.2";
    if (/mep|plumb|electric|valve|cable|light|pipe/.test(name + parent)) return "1.7.3";
    if (/horticulture|landscape|garden/.test(name + parent)) return "1.7.4";
    return "1.7.1";
  }
  if (/tube well|reservoir|pump/.test(name + parent)) {
    if (/tube well|bore/.test(name + parent)) return "1.8.1";
    if (/reservoir|tank/.test(name + parent)) return "1.8.2";
    return "1.8.3";
  }
  if (/miyawaki|forest|tree/.test(name + parent)) return "1.9.1";
  if (/garden|grass|plantation|horticulture/.test(name + parent)) return "1.9.2";
  if (/street light|lighting|pole/.test(name + parent)) return "1.10.1";
  if (/mv|ht|transformer|distribution/.test(name + parent)) return "1.10.3";
  if (/electrical|power|cable/.test(name + parent)) return "1.10.2";

  return "1.2.1";
}

function buildPhaseTemplate(): WBSNode[] {
  const phases: Array<{ code: string; name: string; packages: WorkPackageDef[] }> = [
    {
      code: "1.1",
      name: "Pre-Construction Phase",
      packages: [
        { code: "1.1.1", name: "Mobilization", phaseCode: "1.1" },
        { code: "1.1.2", name: "Site Survey", phaseCode: "1.1" },
      ],
    },
    {
      code: "1.2",
      name: "Road 4",
      packages: [
        { code: "1.2.1", name: "Earthwork", phaseCode: "1.2" },
        { code: "1.2.2", name: "Drain Works", phaseCode: "1.2" },
        { code: "1.2.3", name: "Sewerage Works", phaseCode: "1.2" },
        { code: "1.2.4", name: "Water Supply Works", phaseCode: "1.2" },
        { code: "1.2.5", name: "Road Works", phaseCode: "1.2" },
      ],
    },
    {
      code: "1.3",
      name: "Road 3",
      packages: [
        { code: "1.3.1", name: "Earthwork", phaseCode: "1.3" },
        { code: "1.3.2", name: "Drain Works", phaseCode: "1.3" },
        { code: "1.3.3", name: "Sewerage Works", phaseCode: "1.3" },
        { code: "1.3.4", name: "Water Supply Works", phaseCode: "1.3" },
        { code: "1.3.5", name: "Road Works", phaseCode: "1.3" },
      ],
    },
    {
      code: "1.4",
      name: "Road 5",
      packages: [
        { code: "1.4.1", name: "Earthwork", phaseCode: "1.4" },
        { code: "1.4.2", name: "Drain Works", phaseCode: "1.4" },
        { code: "1.4.3", name: "Sewerage Works", phaseCode: "1.4" },
        { code: "1.4.4", name: "Water Supply Works", phaseCode: "1.4" },
        { code: "1.4.5", name: "Road Works", phaseCode: "1.4" },
      ],
    },
    {
      code: "1.5",
      name: "Box Culverts",
      packages: [
        { code: "1.5.1", name: "Three Cell Box Culvert", phaseCode: "1.5" },
        { code: "1.5.2", name: "Two Cell Box Culvert", phaseCode: "1.5" },
        { code: "1.5.3", name: "One Cell Box Culvert", phaseCode: "1.5" },
      ],
    },
    {
      code: "1.6",
      name: "Major Bridge",
      packages: [
        { code: "1.6.1", name: "Bridge Substructure", phaseCode: "1.6" },
        { code: "1.6.2", name: "Bridge Superstructure", phaseCode: "1.6" },
      ],
    },
    {
      code: "1.7",
      name: "Gate House & Entry Plaza",
      packages: [
        { code: "1.7.1", name: "Gate House Civil Works", phaseCode: "1.7" },
        { code: "1.7.2", name: "Gate House Architecture", phaseCode: "1.7" },
        { code: "1.7.3", name: "Gate House MEP", phaseCode: "1.7" },
        { code: "1.7.4", name: "Entry Plaza Horticulture", phaseCode: "1.7" },
      ],
    },
    {
      code: "1.8",
      name: "Water Supply System",
      packages: [
        { code: "1.8.1", name: "Tube Wells", phaseCode: "1.8" },
        { code: "1.8.2", name: "Water Reservoirs", phaseCode: "1.8" },
        { code: "1.8.3", name: "Pump Stations", phaseCode: "1.8" },
      ],
    },
    {
      code: "1.9",
      name: "Horticulture Works",
      packages: [
        { code: "1.9.1", name: "Miyawaki Forest Area", phaseCode: "1.9" },
        { code: "1.9.2", name: "Garden & Lawn Areas", phaseCode: "1.9" },
      ],
    },
    {
      code: "1.10",
      name: "Electrical & Street Lighting",
      packages: [
        { code: "1.10.1", name: "Street Lighting", phaseCode: "1.10" },
        { code: "1.10.2", name: "Power Distribution", phaseCode: "1.10" },
        { code: "1.10.3", name: "MV Distribution", phaseCode: "1.10" },
      ],
    },
    {
      code: "1.11",
      name: "Milestones",
      packages: [
        { code: "1.11.1", name: "Project Commencement", phaseCode: "1.11" },
        { code: "1.11.2", name: "Project Completion", phaseCode: "1.11" },
      ],
    },
  ];

  return phases.map((phase, index) => ({
    id: phase.code,
    code: phase.code,
    name: phase.name,
    level: 1,
    type: "phase",
    progress: 0,
    status: "not_started",
    children: phase.packages.map((wp, wpIndex) => ({
      id: wp.code,
      code: wp.code,
      name: wp.name,
      level: 2,
      type: "work_package",
      progress: 0,
      status: "not_started",
      children: [],
    })),
  }));
}

function buildResources(): ResourceItem[] {
  const now = new Date().toISOString();
  const base = [
    ["res-1", "Project Management Team", "Project Manager", "person", 100, 80],
    ["res-2", "Civil Works Team", "Civil Engineer", "person", 100, 90],
    ["res-3", "Earthwork Team", "Site Supervisor", "person", 100, 85],
    ["res-4", "Drainage Team", "Drainage Engineer", "person", 100, 75],
    ["res-5", "Sewerage Team", "Sanitary Engineer", "person", 100, 70],
    ["res-6", "Water Supply Team", "Plumbing Engineer", "person", 100, 65],
    ["res-7", "Road Works Team", "Road Engineer", "person", 100, 80],
    ["res-8", "Structure/Concrete Team", "Structural Engineer", "person", 100, 85],
    ["res-9", "Bridge Team", "Bridge Engineer", "person", 100, 90],
    ["res-10", "Electrical Team", "Electrical Engineer", "person", 100, 60],
    ["res-11", "Horticulture Team", "Landscape Architect", "person", 100, 50],
    ["res-12", "MEP Team", "MEP Engineer", "person", 100, 55],
    ["res-13", "Survey Team", "Surveyor", "person", 100, 40],
    ["res-14", "Quality Control Team", "QC Engineer", "person", 100, 70],
    ["res-15", "Safety Team", "Safety Officer", "person", 100, 45],
    ["res-16", "Equipment - Excavators", "Heavy Equipment", "equipment", 20, 15],
    ["res-17", "Equipment - Concrete Mixers", "Construction Equipment", "equipment", 15, 12],
    ["res-18", "Equipment - Asphalt Plant", "Asphalt Equipment", "equipment", 10, 8],
    ["res-19", "Material - RCC", "Construction Material", "material", 5000, 3500],
    ["res-20", "Material - Asphalt", "Construction Material", "material", 3000, 2000],
  ] as const;

  return base.map((row) => ({
    id: row[0],
    name: row[1],
    role: row[2],
    type: row[3],
    capacity: row[4],
    allocated: clamp(row[5], 0, 100),
    status: row[5] > 0 ? "allocated" : "available",
    costRate: 0,
    rateBasis: "hour" as const,
    scope: "project" as const,
    skills: [],
    email: "",
    updatedAt: now,
  }));
}

function buildMilestones(): Milestone[] {
  return [
    { id: "milestone-1", name: "Project Commencement (Notice to Proceed)", date: "2025-01-20", status: "completed" },
    { id: "milestone-2", name: "Pre-Construction Completion", date: "2025-02-20", status: "completed" },
    { id: "milestone-3", name: "Road 4 Earthwork Completion", date: "2025-12-08", status: "completed" },
    { id: "milestone-4", name: "Road 4 Completion", date: "2026-09-24", status: "in_progress" },
    { id: "milestone-5", name: "Road 3 Completion", date: "2026-12-03", status: "pending" },
    { id: "milestone-6", name: "Box Culverts Completion", date: "2027-01-19", status: "pending" },
    { id: "milestone-7", name: "Major Bridge Completion", date: "2027-05-06", status: "pending" },
    { id: "milestone-8", name: "Road 5 Completion", date: "2027-01-12", status: "pending" },
    { id: "milestone-9", name: "Gate House Completion", date: "2027-10-29", status: "pending" },
    { id: "milestone-10", name: "Water Supply System Operational", date: "2027-08-16", status: "pending" },
    { id: "milestone-11", name: "Electrical Systems Commissioned", date: "2027-10-27", status: "pending" },
    { id: "milestone-12", name: "Horticulture Works Completion", date: "2027-10-26", status: "pending" },
    { id: "milestone-13", name: "Project Completion & Handover", date: "2027-10-30", status: "pending" },
  ];
}

function buildRisks(): RiskItem[] {
  return [
    {
      id: "risk-1",
      title: "Land Acquisition Delays",
      severity: "medium",
      description: "Pending external approvals can impact downstream civil work sequences.",
      mitigation: "Coordinate with PIU and local authorities for milestone-bound land clearances.",
    },
    {
      id: "risk-2",
      title: "Material Price Escalation",
      severity: "medium",
      description: "Escalating steel/concrete/asphalt costs can affect procurement continuity.",
      mitigation: "Use framework contracts and lock rates for long-lead items.",
    },
    {
      id: "risk-3",
      title: "Weather Delays",
      severity: "low",
      description: "Monsoon windows can reduce productivity in earthwork and pavement activities.",
      mitigation: "Pull weather-sensitive tasks forward and maintain buffer crews.",
    },
    {
      id: "risk-4",
      title: "Labor Shortage",
      severity: "low",
      description: "Specialized workforce availability may constrain parallel workfronts.",
      mitigation: "Retain standby subcontracting options for critical disciplines.",
    },
    {
      id: "risk-5",
      title: "Design Changes",
      severity: "low",
      description: "Late design clarifications can cause rework in utilities and structures.",
      mitigation: "Implement formal design freeze and change-control checkpoints.",
    },
    {
      id: "risk-6",
      title: "Equipment Breakdown",
      severity: "low",
      description: "Heavy equipment unavailability may impact critical path items.",
      mitigation: "Maintain preventive maintenance and backup rental agreements.",
    },
  ];
}

function chooseResource(task: GanttTask): string {
  const text = `${task.name} ${task.parentActivity ?? ""}`.toLowerCase();
  if (/earthwork|cut and fill|excavation|subgrade/.test(text)) return "res-3";
  if (/drain|stone soling|lean|rcc bed|rcc wall|rcc slab|structure|concrete/.test(text)) return "res-8";
  if (/sewer|manhole|sanitary/.test(text)) return "res-5";
  if (/water|tube well|pump|reservoir|pipe/.test(text)) return "res-6";
  if (/road|asphalt|kerb|pavement|tack|prime|aggregate/.test(text)) return "res-7";
  if (/bridge|pier|girder|abutment/.test(text)) return "res-9";
  if (/electrical|cable|light|street|power|mv|ht/.test(text)) return "res-10";
  if (/horticulture|garden|grass|tree|landscape/.test(text)) return "res-11";
  if (/survey/.test(text)) return "res-13";
  if (/quality|testing|inspection/.test(text)) return "res-14";
  return "res-2";
}

async function main() {
  if (!fs.existsSync(INPUT_PDF)) {
    throw new Error(`Input PDF not found: ${INPUT_PDF}`);
  }

  const pages = await extractStructuredPdfPages(INPUT_PDF);
  const acts = aggregateActivities(pages);

  const taskMap = new Map<string, GanttTask>();
  for (const act of acts) {
    if (!act.activityId || !act.startDate || !act.endDate) continue;
    const id = act.activityId;
    if (taskMap.has(id)) continue;

    const progress = parseProgress(act.startDate, act.endDate);
    const task: GanttTask = {
      id,
      activityId: id,
      name: act.name.trim(),
      start: act.startDate,
      end: act.endDate,
      progress,
      status: statusFromProgress(progress),
      duration: act.duration ?? undefined,
      dependencies: [],
      isMilestone: Boolean(act.isMilestone || act.duration === 0),
      isCritical: progress > 0 && progress < 100,
      assigned: "TBD",
      parentActivity: act.parentName ?? undefined,
    };
    taskMap.set(id, task);
  }

  const tasks = [...taskMap.values()].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  for (let i = 0; i < tasks.length; i += 1) {
    tasks[i].assigned = chooseResource(tasks[i]);
    if (i > 0) tasks[i].dependencies = [tasks[i - 1].id];
  }

  const root = defaultState();
  const resources = buildResources();
  const milestones = buildMilestones();
  const risks = buildRisks();

  const phaseNodes = buildPhaseTemplate();
  const packageIndex = new Map<string, WBSNode>();
  for (const phase of phaseNodes) {
    for (const wp of phase.children ?? []) {
      packageIndex.set(wp.code, wp);
    }
  }

  for (const task of tasks) {
    const code = getWbsCode(task);
    const wp = packageIndex.get(code);
    if (!wp) continue;
    if (!wp.children) wp.children = [];
    wp.children.push({
      id: `${code}.${wp.children.length + 1}`,
      code: `${code}.${wp.children.length + 1}`,
      name: `${task.activityId}: ${task.name}`,
      level: 3,
      type: "task",
      progress: task.progress,
      status: task.status,
    });
  }

  for (const phase of phaseNodes) {
    for (const wp of phase.children ?? []) {
      const wpChildren = wp.children ?? [];
      wp.progress = Math.round(
        wpChildren.reduce((sum, item) => sum + item.progress, 0) / Math.max(wpChildren.length, 1),
      );
      wp.status = statusFromProgress(wp.progress);
    }
    const wps = phase.children ?? [];
    phase.progress = Math.round(
      wps.reduce((sum, item) => sum + item.progress, 0) / Math.max(wps.length, 1),
    );
    phase.status = statusFromProgress(phase.progress);
  }

  const projectProgress = Math.round(
    phaseNodes.reduce((sum, phase) => sum + phase.progress, 0) / Math.max(phaseNodes.length, 1),
  );

  const allocations = tasks.slice(0, 200).map((task, index) => ({
    id: `alloc-${index + 1}`,
    resourceId: task.assigned,
    taskName: task.name.slice(0, 80),
    startDate: task.start,
    endDate: task.end,
    allocation: clamp(Math.round((task.progress || 25) / 2), 25, 100),
  }));

  const now = new Date().toISOString();
  const next: AppState = {
    ...root,
    project: {
      id: "edu-city-pkg1a",
      name: "Infrastructure Development of Education City, Karachi Phase-1 (4800 Acres) — Package-1-A",
      client: "CGD Consulting",
      location: "Karachi, Pakistan",
      budget: "PKR 12.5 Billion",
      startDate: "2025-01-20",
      endDate: "2027-10-30",
      status: "in_progress",
      progress: 24,
      description:
        "Development of education city infrastructure including roads, bridges, drainage, water supply, electrical systems, and horticulture works.",
    },
    tasks,
    resources,
    allocations,
    milestones,
    risks,
    wbs: {
      id: "1",
      code: "1.0",
      name: "Infrastructure Development of Education City, Karachi Phase-1 (4800 Acres)",
      level: 0,
      type: "project",
      progress: projectProgress,
      status: statusFromProgress(projectProgress),
      children: phaseNodes,
    },
    documents: [
      {
        id: "doc-submission-parser",
        name: path.basename(INPUT_PDF),
        type: "pdf",
        size: "1.02 MB",
        uploadDate: now,
        status: "completed",
        progress: 100,
        pageCount: pages.length,
        parsedData: {
          tasksExtracted: tasks.length,
          resourcesFound: resources.length,
          milestonesIdentified: milestones.length,
        },
        currentStage: "idle",
        lastMessage:
          "Submission parser script completed: deterministic extraction + WBS/resources/milestones/risks generation.",
      },
    ],
    activities: [
      {
        id: `activity-${Date.now()}`,
        action: "Submission parser executed",
        detail: `Built app-state from ${pages.length} pages with ${tasks.length} tasks.`,
        time: "just now",
        user: "Submission Parser",
        createdAt: now,
      },
    ],
    insights: [
      {
        id: "insight-1",
        type: "info",
        message: `Generated deterministic project state: ${tasks.length} tasks, ${resources.length} resources, ${milestones.length} milestones.`,
      },
      {
        id: "insight-2",
        type: "suggestion",
        message: "Validate WBS and dependencies in planning review before baseline lock.",
      },
      {
        id: "insight-3",
        type: "risk",
        message: "Bridge and utility interfaces remain schedule-sensitive and require weekly coordination.",
      },
    ],
    lastUpdatedAt: now,
  };

  fs.mkdirSync(path.dirname(OUTPUT_STATE), { recursive: true });
  fs.writeFileSync(OUTPUT_STATE, JSON.stringify(next, null, 2), "utf8");

  console.log(
    JSON.stringify(
      {
        pdf: path.basename(INPUT_PDF),
        pages: pages.length,
        output: OUTPUT_STATE,
        counts: {
          tasks: next.tasks.length,
          resources: next.resources.length,
          allocations: next.allocations.length,
          milestones: next.milestones.length,
          risks: next.risks.length,
          wbsPhases: next.wbs.children?.length ?? 0,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
