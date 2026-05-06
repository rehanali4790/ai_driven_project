import OpenAI from "openai";
import { z } from "zod";
import {
  AggregatedExtraction,
  AppState,
  DocumentPageAnalysis,
  OpenAIArtifacts,
  PartialMilestone,
  PartialResource,
  PartialTask,
  RiskItem,
  TaskStatus,
  WBSNode,
} from "./types";

type AIProvider = "ollama" | "openai";

const taskStatusSchema = z.enum(["completed", "in_progress", "not_started", "at_risk"]);
const resourceTypeSchema = z.enum(["person", "equipment", "material"]).optional();
const resourceStatusSchema = z.enum(["available", "allocated", "on_leave"]).optional();
const milestoneStatusSchema = z.enum(["completed", "in_progress", "pending"]).optional();

const partialTaskSchema = z.object({
  name: z.string(),
  activityId: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  status: taskStatusSchema.optional(),
  duration: z.number().optional(),
  assigned: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  isMilestone: z.boolean().optional(),
  isCritical: z.boolean().optional(),
  parentActivity: z.string().optional(),
});

const partialResourceSchema = z.object({
  name: z.string(),
  role: z.string(),
  type: resourceTypeSchema,
  allocated: z.number().min(0).max(100).optional(),
  capacity: z.number().min(0).max(100).optional(),
  status: resourceStatusSchema,
  costRate: z.number().optional(),
  skills: z.array(z.string()).optional(),
  email: z.string().optional(),
});

const partialMilestoneSchema = z.object({
  name: z.string(),
  date: z.string().optional(),
  status: milestoneStatusSchema,
});

const riskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  description: z.string(),
  mitigation: z.string(),
});

const pageAnalysisSchema = z.object({
  extractedSummary: z.string(),
  projectUpdates: z
    .object({
      name: z.string().optional(),
      client: z.string().optional(),
      location: z.string().optional(),
      budget: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
      progress: z.number().min(0).max(100).optional(),
      description: z.string().optional(),
    })
    .optional(),
  tasks: z.array(partialTaskSchema),
  resources: z.array(partialResourceSchema),
  milestones: z.array(partialMilestoneSchema),
  risks: z.array(riskSchema),
  insights: z.array(z.string()).optional(),
});

const wbsNodeSchema: z.ZodType<WBSNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    level: z.number(),
    type: z.enum(["project", "phase", "deliverable", "work_package", "task"]),
    progress: z.number().min(0).max(100),
    status: taskStatusSchema,
    children: z.array(wbsNodeSchema).optional(),
  }),
);

const artifactSchema = z.object({
  summary: z.string(),
  projectUpdates: z
    .object({
      name: z.string().optional(),
      client: z.string().optional(),
      location: z.string().optional(),
      budget: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
      progress: z.number().min(0).max(100).optional(),
      description: z.string().optional(),
    })
    .optional(),
  tasks: z.array(partialTaskSchema),
  resources: z.array(partialResourceSchema),
  milestones: z.array(partialMilestoneSchema),
  risks: z.array(riskSchema),
  wbs: wbsNodeSchema,
});

function coerceObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function normalizePageAnalysisPayload(payload: unknown) {
  const obj = coerceObject(payload);
  return {
    extractedSummary:
      typeof obj.extractedSummary === "string" ? obj.extractedSummary : "No summary provided.",
    projectUpdates: coerceObject(obj.projectUpdates),
    tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
    resources: Array.isArray(obj.resources) ? obj.resources : [],
    milestones: Array.isArray(obj.milestones) ? obj.milestones : [],
    risks: Array.isArray(obj.risks) ? obj.risks : [],
    insights: coerceStringArray(obj.insights),
  };
}

function normalizeArtifactPayload(payload: unknown, currentState: AppState) {
  const obj = coerceObject(payload);
  const fallbackProject = currentState.project.name || "Project";
  return {
    summary: typeof obj.summary === "string" ? obj.summary : "Artifact generation completed.",
    projectUpdates: coerceObject(obj.projectUpdates),
    tasks: Array.isArray(obj.tasks) ? obj.tasks : [],
    resources: Array.isArray(obj.resources) ? obj.resources : [],
    milestones: Array.isArray(obj.milestones) ? obj.milestones : [],
    risks: Array.isArray(obj.risks) ? obj.risks : [],
    wbs:
      obj.wbs && typeof obj.wbs === "object"
        ? obj.wbs
        : {
            id: "1",
            code: "1.0",
            name: fallbackProject,
            level: 0,
            type: "project",
            progress: currentState.project.progress || 0,
            status: "in_progress",
            children: [],
          },
  };
}

function getConfiguredProvider(): AIProvider {
  const preferred = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (preferred === "openai") return "openai";
  if (preferred === "ollama") return "ollama";
  return process.env.OPENAI_API_KEY ? "openai" : "ollama";
}

function getConfiguredModel(provider: AIProvider) {
  if (provider === "ollama") {
    // Prefer the strongest locally available general model for structured PM tasks.
    return process.env.OLLAMA_MODEL || "qwen3.6:latest";
  }
  return process.env.OPENAI_MODEL || "gpt-4o";
}

function logAi(event: string, meta: Record<string, unknown> = {}) {
  const time = new Date().toISOString();
  console.log(`[ai][${time}][${event}] ${JSON.stringify(meta)}`);
}

export function getClient() {
  const provider = getConfiguredProvider();
  if (provider === "ollama") {
    const baseURL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
    return {
      provider,
      client: new OpenAI({
        apiKey: process.env.OLLAMA_API_KEY || "ollama",
        baseURL,
      }),
    } as const;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return {
    provider,
    client: new OpenAI({ apiKey }),
  } as const;
}

async function createJsonCompletion(
  client: OpenAI,
  provider: AIProvider,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  temperature = 0.2,
) {
  const configuredModel = getConfiguredModel(provider);
  const modelCandidates =
    provider === "ollama"
      ? Array.from(
          new Set([
            configuredModel,
            "qwen3.6:latest",
            "deepseek-r1:14b",
            "hf.co/Grimxlock/Arbiter-GL9b:latest",
            "llama3.2-vision:latest",
          ]),
        )
      : Array.from(new Set([configuredModel, "gpt-4o"]));
  let lastError: unknown;
  logAi("completion_start", {
    provider,
    configuredModel,
    candidateModels: modelCandidates,
    messageCount: messages.length,
  });

  for (const model of modelCandidates) {
    try {
      const response =
        provider === "ollama"
          ? await client.chat.completions.create({
              model,
              temperature,
              messages,
            })
          : await client.chat.completions.create({
              model,
              temperature,
              response_format: { type: "json_object" },
              messages,
            });
      return { response, modelUsed: model };
    } catch (error) {
      logAi("completion_model_failed", {
        provider,
        model,
        error: error instanceof Error ? error.message : String(error),
      });
      lastError = error;
    }
  }

  throw lastError ?? new Error("OpenAI completion failed for all model candidates.");
}

function extractJson(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1];
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Could not parse JSON from OpenAI response.");
}

function safeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function inferTaskStatus(progress: number): TaskStatus {
  if (progress >= 100) return "completed";
  if (progress > 0) return "in_progress";
  return "not_started";
}

function inferProgressFromDates(start?: string, end?: string) {
  if (!start || !end) return 0;
  const startMs = +new Date(start);
  const endMs = +new Date(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  const now = Date.now();
  if (now <= startMs) return 0;
  if (now >= endMs) return 100;
  return Math.max(1, Math.min(99, Math.round(((now - startMs) / (endMs - startMs)) * 100)));
}

function inferProgressFromDatesAt(start?: string, end?: string, at?: Date) {
  if (!start || !end) return 0;
  const startMs = +new Date(start);
  const endMs = +new Date(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  const now = (at ?? new Date()).getTime();
  if (now <= startMs) return 0;
  if (now >= endMs) return 100;
  return Math.max(1, Math.min(99, Math.round(((now - startMs) / (endMs - startMs)) * 100)));
}

function dedupeByName<T extends { name: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeTasks(items: PartialTask[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.activityId
      ? `id:${item.activityId.trim().toLowerCase()}`
      : `name:${item.name.trim().toLowerCase()}|${item.start ?? ""}|${item.end ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePrimaveraDate(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
  if (!match) return safeDate(trimmed);

  const [, dayRaw, monthRaw, yearRaw] = match;
  const monthMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const month = monthMap[monthRaw.toLowerCase()];
  if (!month) return undefined;

  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  const normalized = `${year}-${month}-${dayRaw.padStart(2, "0")}`;
  return safeDate(normalized);
}

function parseActivityRowsFromText(pageText: string): PartialTask[] {
  const normalized = pageText.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parsed: PartialTask[] = [];
  const activityPattern =
    /\b([A-Z]\d{3,6})\b\s+(.+?)\s+(\d{1,4})\s+(\d{1,2}-[A-Za-z]{3}-\d{2,4})\s+(\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/g;

  for (const match of normalized.matchAll(activityPattern)) {
    const [, activityId, activityName, durationRaw, startRaw, endRaw] = match;
    const duration = Number.parseInt(durationRaw, 10);
    const start = parsePrimaveraDate(startRaw);
    const end = parsePrimaveraDate(endRaw);
    const isMilestone = duration === 0;
    const cleanName = activityName
      .replace(/\b(Activity ID|Activity Name|Original Duration|BL Project Start|BL Project Finish)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanName || cleanName.length < 2) continue;

    parsed.push({
      name: cleanName,
      activityId,
      duration: Number.isFinite(duration) ? duration : undefined,
      start,
      end,
      isMilestone,
      progress: isMilestone ? 100 : undefined,
      status: isMilestone ? "completed" : undefined,
      parentActivity: undefined,
    });
  }

  return dedupeByName(parsed);
}

function parseProjectUpdatesFromText(pageText: string) {
  const compact = pageText.replace(/\s+/g, " ").trim();
  const updates: Partial<AppState["project"]> = {};

  const nameMatch =
    compact.match(/(?:Project(?: Name)?|Infrastructure Development)\s*[:\-]?\s*([A-Za-z0-9 ,&().-]{10,120})/i) ??
    compact.match(/(Education City Infrastructure(?: Development)?(?: - Phase \d+)?)/i);
  if (nameMatch?.[1]) updates.name = nameMatch[1].trim();

  const clientMatch = compact.match(/(?:Client|Employer)\s*[:\-]?\s*([A-Za-z0-9 ,&().-]{3,80})/i);
  if (clientMatch?.[1]) updates.client = clientMatch[1].trim();

  const locationMatch = compact.match(/(?:Location|Site)\s*[:\-]?\s*([A-Za-z0-9 ,().-]{3,80})/i);
  if (locationMatch?.[1]) updates.location = locationMatch[1].trim();

  const budgetMatch = compact.match(
    /((?:PKR|USD|EUR|AED)\s*[0-9][0-9., ]*(?:million|billion|mn|bn)?)/i,
  );
  if (budgetMatch?.[1]) updates.budget = budgetMatch[1].trim();

  const datePair = compact.match(
    /(\d{1,2}-[A-Za-z]{3}-\d{2,4})\s+(?:to|[-–])\s+(\d{1,2}-[A-Za-z]{3}-\d{2,4})/i,
  );
  if (datePair?.[1]) updates.startDate = parsePrimaveraDate(datePair[1]);
  if (datePair?.[2]) updates.endDate = parsePrimaveraDate(datePair[2]);

  return updates;
}

function fallbackPageAnalysis(pageText: string, pageNumber: number) {
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 60);

  const structuredTasks = parseActivityRowsFromText(pageText);
  const candidateTasks: PartialTask[] =
    structuredTasks.length > 0
      ? structuredTasks
      : lines
          .filter((line) => /task|activity|construction|design|install|survey|commission/i.test(line))
          .slice(0, 12)
          .map((line, index) => ({
            name: line,
            progress: Math.max(5, 100 - index * 8),
            status: inferTaskStatus(Math.max(5, 100 - index * 8)),
            isCritical: index < 3,
            assigned: index % 2 === 0 ? "Project Team" : "Engineering Team",
          }));

  return {
    extractedSummary:
      lines.slice(0, 4).join(" ") || `Parsed page ${pageNumber} with limited heuristic extraction.`,
    tasks: candidateTasks,
    resources: [] as PartialResource[],
    milestones: extractMilestones(candidateTasks),
    risks: [] as RiskItem[],
    projectUpdates: parseProjectUpdatesFromText(pageText),
    insights: [
      structuredTasks.length
        ? `Page ${pageNumber} parsed with deterministic schedule extraction fallback.`
        : `Page ${pageNumber} extracted locally because OpenAI is unavailable.`,
    ],
  };
}

export async function analyzePdfPage(
  pageText: string,
  pageNumber: number,
  fileName: string,
): Promise<Omit<DocumentPageAnalysis, "pageNumber" | "rawText"> & { projectUpdates?: AppState["project"] | Record<string, never>; insights?: string[] }> {
  const ai = getClient();
  if (!ai) {
    logAi("page_analysis_fallback_no_provider", { pageNumber, fileName });
    return fallbackPageAnalysis(pageText, pageNumber);
  }

  try {
    logAi("page_analysis_start", {
      pageNumber,
      fileName,
      provider: ai.provider,
      model: getConfiguredModel(ai.provider),
      inputChars: pageText.length,
    });
    const completion = await createJsonCompletion(
      ai.client,
      ai.provider,
      [
        {
          role: "system",
          content: `You are analyzing a construction project schedule PDF (Primavera P6 or MS Project format).

CRITICAL INSTRUCTIONS:
1. Extract STRUCTURED data, not raw text dumps
2. Parse each activity row with these columns: Activity ID, Activity Name, Duration, Start Date, End Date
3. Activity IDs follow pattern: A1002, A50010, etc.
4. Dates are in format: DD-MMM-YY (e.g., 21-Feb-25)
5. Identify parent-child relationships (indented items are children)
6. Groups/Phases have no Activity ID but have names like "Road 4", "Earthwork", "Drain works"
7. Milestones have duration = 0

EXTRACT:
- extractedSummary: Brief summary of this page's content
- projectUpdates: { name, client, location, budget, startDate, endDate, description } if found in header
- tasks: Array of activities with proper structure:
  {
    "name": "Full activity name (not truncated)",
    "activityId": "A1002" (if present),
    "start": "2025-02-21" (ISO format),
    "end": "2025-03-08" (ISO format),
    "progress": 0-100 (estimate based on context),
    "status": "completed" | "in_progress" | "not_started" | "at_risk",
    "duration": 14 (days),
    "assigned": "Team name if mentioned",
    "dependencies": [],
    "isMilestone": false,
    "isCritical": false,
    "parentActivity": "Parent name if this is a child activity"
  }
- resources: Extract team names, equipment, materials mentioned
- milestones: Activities with duration = 0
- risks: Identify delayed tasks, critical path items, resource conflicts
- insights: Notable observations about schedule, progress, issues

Return JSON only. Do not invent data. If a field is unclear, omit it or set to null.`,
        },
        {
          role: "user",
          content: `Analyze page ${pageNumber} from document "${fileName}".

Page text:
${pageText.slice(0, 20000)}

Extract all activities in structured format. Parse dates from DD-MMM-YY to YYYY-MM-DD format.`,
        },
      ],
      0.2,
    );

    const content = completion.response.choices[0]?.message?.content ?? "{}";
    const parsed = pageAnalysisSchema.parse(
      normalizePageAnalysisPayload(JSON.parse(extractJson(content))),
    );
    logAi("page_analysis_success", {
      pageNumber,
      fileName,
      provider: ai.provider,
      modelUsed: completion.modelUsed,
      tasks: parsed.tasks.length,
      resources: parsed.resources.length,
      milestones: parsed.milestones.length,
      risks: parsed.risks.length,
    });
    return parsed;
  } catch (_err) {
    logAi("page_analysis_fallback_error", {
      pageNumber,
      fileName,
      provider: ai.provider,
      error: _err instanceof Error ? _err.message : String(_err),
    });
    // If OpenAI is down/quota-limited, keep ingestion functional.
    return fallbackPageAnalysis(pageText, pageNumber);
  }
}

function fallbackArtifacts(aggregate: AggregatedExtraction, currentState: AppState): OpenAIArtifacts {
  const tasks = dedupeByName(
    aggregate.tasks.length
      ? aggregate.tasks
      : currentState.tasks.map((task) => ({
          name: task.name,
          start: task.start,
          end: task.end,
          progress: task.progress,
          status: task.status,
          assigned: task.assigned,
          dependencies: task.dependencies,
          isMilestone: task.isMilestone,
          isCritical: task.isCritical,
        })),
  );

  const phases = [
    { id: "1.1", code: "1.1", name: "Planning & Design", level: 1, type: "phase" as const },
    { id: "1.2", code: "1.2", name: "Construction Delivery", level: 1, type: "phase" as const },
    { id: "1.3", code: "1.3", name: "Testing & Handover", level: 1, type: "phase" as const },
  ];

  const wbsChildren = phases.map((phase, phaseIndex) => ({
    ...phase,
    progress:
      phaseIndex === 0 ? 100 : phaseIndex === 1 ? currentState.project.progress : 10,
    status:
      phaseIndex === 0
        ? "completed"
        : phaseIndex === 1
          ? ("in_progress" as const)
          : ("not_started" as const),
    children: tasks.slice(phaseIndex * 4, phaseIndex * 4 + 4).map((task, taskIndex) => ({
      id: `${phase.id}.${taskIndex + 1}`,
      code: `${phase.code}.${taskIndex + 1}`,
      name: task.name,
      level: 2,
      type: "work_package" as const,
      progress: task.progress ?? 0,
      status: task.status ?? inferTaskStatus(task.progress ?? 0),
    })),
  }));

  return {
    summary:
      aggregate.summary ||
      "Generated project plan, WBS, schedule, and resource updates from extracted document content.",
    projectUpdates: aggregate.projectUpdates,
    tasks,
    resources: dedupeByName(aggregate.resources),
    milestones: dedupeByName(aggregate.milestones),
    risks: aggregate.risks,
    wbs: {
      id: "1",
      code: "1.0",
      name: currentState.project.name,
      level: 0,
      type: "project",
      progress: aggregate.projectUpdates?.progress ?? currentState.project.progress,
      status: "in_progress",
      children: wbsChildren,
    },
  };
}

/**
 * Calculate task dependencies based on date sequences
 * If task B starts when task A ends, B depends on A
 */
function calculateDependencies(tasks: PartialTask[]): PartialTask[] {
  return tasks.map(task => {
    if (!task.start) return task;
    
    const dependencies = tasks
      .filter(t => t.end === task.start && t.name !== task.name && t.activityId)
      .map(t => t.activityId!)
      .slice(0, 5); // Limit to 5 dependencies
    
    return {
      ...task,
      dependencies: dependencies.length > 0 ? dependencies : task.dependencies || [],
    };
  });
}

/**
 * Build WBS hierarchy from flat task list with parentActivity relationships
 */
function buildWBSFromTasks(tasks: PartialTask[], projectName: string, projectProgress: number): WBSNode {
  // Group tasks by parent
  const tasksByParent = new Map<string, PartialTask[]>();
  const rootTasks: PartialTask[] = [];
  
  for (const task of tasks) {
    if (task.parentActivity) {
      if (!tasksByParent.has(task.parentActivity)) {
        tasksByParent.set(task.parentActivity, []);
      }
      tasksByParent.get(task.parentActivity)!.push(task);
    } else {
      rootTasks.push(task);
    }
  }

  // Find all unique parents (these become WBS phase nodes)
  const parents = Array.from(tasksByParent.keys());

  // Build WBS nodes for parents
  const wbsNodes: WBSNode[] = [];
  let nodeIndex = 1;

  for (const parent of parents) {
    const childTasks = tasksByParent.get(parent) || [];
    const avgProgress = childTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / Math.max(childTasks.length, 1);
    
    const children: WBSNode[] = childTasks.map((task, idx) => ({
      id: `1.${nodeIndex}.${idx + 1}`,
      code: `1.${nodeIndex}.${idx + 1}`,
      name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
      level: 2,
      type: "work_package" as const,
      progress: task.progress || 0,
      status: task.status || "not_started",
    }));

    const phaseStatus: TaskStatus = 
      avgProgress >= 100 ? "completed" : 
      avgProgress > 0 ? "in_progress" : 
      "not_started";

    wbsNodes.push({
      id: `1.${nodeIndex}`,
      code: `1.${nodeIndex}`,
      name: parent,
      level: 1,
      type: "phase" as const,
      progress: Math.round(avgProgress),
      status: phaseStatus,
      children,
    });

    nodeIndex++;
  }

  // Add root tasks if any (no parent)
  if (rootTasks.length > 0) {
    const children: WBSNode[] = rootTasks.map((task, idx) => ({
      id: `1.${nodeIndex}.${idx + 1}`,
      code: `1.${nodeIndex}.${idx + 1}`,
      name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
      level: 2,
      type: "work_package" as const,
      progress: task.progress || 0,
      status: task.status || "not_started",
    }));

    const avgProgress = rootTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / rootTasks.length;

    wbsNodes.push({
      id: `1.${nodeIndex}`,
      code: `1.${nodeIndex}`,
      name: "Other Activities",
      level: 1,
      type: "phase" as const,
      progress: Math.round(avgProgress),
      status: avgProgress > 0 ? "in_progress" : "not_started",
      children,
    });
  }

  return {
    id: "1",
    code: "1.0",
    name: projectName || "Project",
    level: 0,
    type: "project",
    progress: projectProgress,
    status: "in_progress",
    children: wbsNodes,
  };
}

function categorizeTask(task: PartialTask) {
  const text = `${task.name} ${task.parentActivity ?? ""}`.toLowerCase();
  const roadMatch = text.match(/\broad\s*([1-9]\d*)\b/);
  if (roadMatch) return `Road ${roadMatch[1]}`;
  if (/milestone|commencement|completion|handover/.test(text) || task.isMilestone) return "Milestones";
  if (/mobilization|survey|pre[-\s]?construction/.test(text)) return "Pre-Construction";
  if (/box culvert|culvert|bridge|pier|abutment/.test(text)) return "Structures";
  if (/earthwork|cut and fill|subgrade|embankment|excavation/.test(text)) return "Earthwork";
  if (/drain|stormwater|catch basin/.test(text)) return "Drainage";
  if (/sewer|manhole/.test(text)) return "Sewerage";
  if (/water|tube well|reservoir|pump station/.test(text)) return "Water Supply";
  if (/road|asphalt|kerb|pavement|sub base|aggregate/.test(text)) return "Road Works";
  if (/electrical|street light|mv|power|cable|transformer/.test(text)) return "Electrical";
  if (/horticulture|landscap|garden|miyawaki|tree/.test(text)) return "Horticulture";
  if (/gate house|entry plaza|architecture|mep/.test(text)) return "Buildings";
  return "General";
}

function buildGenericWbs(tasks: PartialTask[], projectName: string, projectProgress: number): WBSNode {
  const groups = new Map<string, PartialTask[]>();
  for (const task of tasks) {
    const parent = task.parentActivity?.trim();
    const group = parent && parent.length > 1 ? parent : categorizeTask(task);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(task);
  }

  const normalizePhaseName = (name: string) => {
    const n = name.trim();
    if (/^road\s*\d+$/i.test(n)) return n.replace(/\s+/, " ");
    if (/pre[-\s]?construction/i.test(n)) return "Pre-Construction Phase";
    if (/water supply/i.test(n)) return "Water Supply System";
    if (/sewerage|drainage|drain/.test(n.toLowerCase())) return "Sewerage & Drainage";
    if (/electrical/i.test(n)) return "Electrical & Street Lighting";
    if (/horticulture/i.test(n)) return "Horticulture Works";
    if (/structure|bridge|culvert/i.test(n.toLowerCase())) return "Structures";
    if (/building|gate house|entry plaza/i.test(n.toLowerCase())) return "Gate House & Entry Plaza";
    if (/milestone/i.test(n.toLowerCase())) return "Milestones";
    return n;
  };

  const consolidated = new Map<string, PartialTask[]>();
  for (const [group, items] of groups.entries()) {
    const phase = normalizePhaseName(group);
    if (!consolidated.has(phase)) consolidated.set(phase, []);
    consolidated.get(phase)!.push(...items);
  }

  const phaseOrder = [
    "Pre-Construction Phase",
    "Road 1",
    "Road 2",
    "Road 3",
    "Road 4",
    "Road 5",
    "Structures",
    "Gate House & Entry Plaza",
    "Water Supply System",
    "Horticulture Works",
    "Electrical & Street Lighting",
    "Sewerage & Drainage",
    "Milestones",
    "General",
  ];
  const rank = (name: string) => {
    const idx = phaseOrder.findIndex((phase) => phase.toLowerCase() === name.toLowerCase());
    return idx === -1 ? phaseOrder.length + name.localeCompare("z") : idx;
  };

  const phaseNodes: WBSNode[] = [...consolidated.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1].length - a[1].length)
    .map(([group, items], groupIndex) => {
      const children: WBSNode[] = items
        .slice()
        .sort((a, b) => +new Date(a.start ?? "2100-01-01") - +new Date(b.start ?? "2100-01-01"))
        .map((task, idx) => {
          const p = task.progress ?? 0;
          return {
            id: `1.${groupIndex + 1}.${idx + 1}`,
            code: `1.${groupIndex + 1}.${idx + 1}`,
            name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
            level: 2,
            type: "work_package",
            progress: p,
            status: task.status ?? inferTaskStatus(p),
          };
        });
      const avg = Math.round(
        children.reduce((sum, node) => sum + node.progress, 0) / Math.max(children.length, 1),
      );
      return {
        id: `1.${groupIndex + 1}`,
        code: `1.${groupIndex + 1}`,
        name: group,
        level: 1,
        type: "phase",
        progress: avg,
        status: avg >= 100 ? "completed" : avg > 0 ? "in_progress" : "not_started",
        children,
      };
    });

  return {
    id: "1",
    code: "1.0",
    name: projectName || "Project",
    level: 0,
    type: "project",
    progress: projectProgress,
    status: projectProgress >= 100 ? "completed" : projectProgress > 0 ? "in_progress" : "not_started",
    children: phaseNodes,
  };
}

function inferProjectWindow(tasks: PartialTask[]) {
  const starts = tasks
    .map((t) => (t.start ? +new Date(t.start) : Number.NaN))
    .filter((x) => Number.isFinite(x)) as number[];
  const ends = tasks
    .map((t) => (t.end ? +new Date(t.end) : Number.NaN))
    .filter((x) => Number.isFinite(x)) as number[];
  return {
    startDate: starts.length ? new Date(Math.min(...starts)).toISOString().slice(0, 10) : undefined,
    endDate: ends.length ? new Date(Math.max(...ends)).toISOString().slice(0, 10) : undefined,
  };
}

function buildGenericResources(tasks: PartialTask[]): PartialResource[] {
  const byCategory = new Map<string, number>();
  for (const task of tasks) {
    const key = task.parentActivity?.trim() || categorizeTask(task);
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
  }

  const resources = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({
      name: `${name} Team`,
      role: count > 25 ? "Core Delivery Team" : "Execution Team",
      type: "person" as const,
      allocated: Math.max(25, Math.min(95, Math.round((count / Math.max(tasks.length, 1)) * 220))),
      capacity: 100,
      status: "allocated" as const,
      skills: [],
      email: "",
    }));
  while (resources.length < 20) {
    resources.push({
      name: `Support Team ${resources.length + 1}`,
      role: "Execution Team",
      type: "person",
      allocated: 35,
      capacity: 100,
      status: "available",
      skills: [],
      email: "",
    });
  }
  return resources.slice(0, 20);
}

function buildGenericMilestones(tasks: PartialTask[]): PartialMilestone[] {
  const direct = extractMilestones(tasks);
  const window = inferProjectWindow(tasks);
  const inferred: PartialMilestone[] = [];

  const grouped = new Map<string, PartialTask[]>();
  for (const task of tasks) {
    const key = task.parentActivity?.trim() || categorizeTask(task);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  const phaseMilestones = [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 11)
    .map(([group, items]) => {
      const ends = items
        .map((item) => (item.end ? +new Date(item.end) : Number.NaN))
        .filter((value) => Number.isFinite(value)) as number[];
      const avgProgress = Math.round(
        items.reduce((sum, item) => sum + (item.progress ?? 0), 0) / Math.max(items.length, 1),
      );
      return {
        name: `${group} Completion`,
        date: ends.length ? new Date(Math.max(...ends)).toISOString().slice(0, 10) : undefined,
        status: avgProgress >= 100 ? "completed" : avgProgress > 0 ? "in_progress" : "pending",
      } satisfies PartialMilestone;
    });

  inferred.push(...phaseMilestones);
  if (window.startDate) {
    inferred.push({ name: "Project Commencement", date: window.startDate, status: "completed" });
  }
  if (window.endDate) {
    inferred.push({ name: "Project Completion", date: window.endDate, status: "pending" });
  }
  return dedupeByName([...direct, ...inferred]).slice(0, 24);
}

function buildGenericRisks(tasks: PartialTask[]): RiskItem[] {
  const inferred = analyzeRisks(tasks);
  if (inferred.length > 0) return inferred;
  if (tasks.length < 30) return inferred;

  return [
    {
      id: "risk-schedule-compression",
      title: "Schedule Compression Risk",
      severity: "medium",
      description: "Dense activity sequencing may reduce schedule float in later phases.",
      mitigation: "Track look-ahead plans weekly and protect predecessor completion dates.",
    },
    {
      id: "risk-resource-contention",
      title: "Resource Contention Across Parallel Workfronts",
      severity: "medium",
      description: "Multiple concurrent disciplines may compete for shared crews and equipment.",
      mitigation: "Use weekly resource leveling and reserve contingency crews for critical windows.",
    },
    {
      id: "risk-critical-path-visibility",
      title: "Critical Path Drift",
      severity: "high",
      description: "Without continuous dependency validation, critical activities can shift unnoticed.",
      mitigation: "Recompute critical path after each schedule update and flag variance early.",
    },
    {
      id: "risk-interface-coordination",
      title: "Interface Coordination Risk",
      severity: "medium",
      description: "Civil, utility, electrical, and finishing interfaces can cause rework if misaligned.",
      mitigation: "Hold cross-discipline coordination reviews before each phase handoff.",
    },
    {
      id: "risk-data-quality",
      title: "Source Data Quality Variability",
      severity: "low",
      description: "Document-only extraction may miss hidden assumptions not present in schedule rows.",
      mitigation: "Validate extracted outputs against updated baseline submissions each cycle.",
    },
    {
      id: "risk-external-factors",
      title: "External Disruption Risk",
      severity: "medium",
      description: "Weather, procurement, or permitting disruptions may affect key milestone dates.",
      mitigation: "Maintain contingency buffers and monitor external dependencies monthly.",
    },
  ];
}

function buildDeterministicArtifacts(
  aggregate: AggregatedExtraction,
  currentState: AppState,
  baseTasks: PartialTask[],
): OpenAIArtifacts {
  const pipelineSteps: NonNullable<OpenAIArtifacts["debug"]>["pipelineSteps"] = [];
  pipelineSteps.push({
    name: "collect_input_tasks",
    inputCount: baseTasks.length,
    outputCount: baseTasks.length,
    note: "Collected aggregated extraction tasks.",
  });
  const fixedDateRaw = process.env.PROGRESS_REFERENCE_DATE?.trim();
  const fixedDate = fixedDateRaw ? new Date(fixedDateRaw) : undefined;

  const tasks = dedupeTasks(baseTasks).map((task) => {
    const inferred = inferProgressFromDatesAt(task.start, task.end, fixedDate);
    const providedProgress = typeof task.progress === "number" ? task.progress : undefined;
    const providedStatus = task.status;

    // Agentic normalization: if upstream provides 0 for dated tasks, treat that as weak
    // signal and recompute from schedule window. Keep explicit completed values.
    const progress =
      providedProgress === undefined
        ? inferred
        : providedProgress === 0 && inferred > 0 && providedStatus !== "completed"
          ? inferred
          : providedProgress;

    return {
      ...task,
      progress,
      status:
        providedStatus && !(providedStatus === "not_started" && progress > 0)
          ? providedStatus
          : inferTaskStatus(progress),
    };
  });
  pipelineSteps.push({
    name: "dedupe_and_normalize_tasks",
    inputCount: baseTasks.length,
    outputCount: tasks.length,
    note: "Deduped by activityId first, then name+dates fallback.",
  });
  const window = inferProjectWindow(tasks);
  const projectName =
    aggregate.projectUpdates?.name ||
    currentState.project.name ||
    "Infrastructure Development Project";
  const projectProgress = Math.round(
    tasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) / Math.max(tasks.length, 1),
  );
  const wbs = buildGenericWbs(tasks, projectName, projectProgress);
  pipelineSteps.push({
    name: "build_wbs_hierarchy",
    inputCount: tasks.length,
    outputCount: wbs.children?.length ?? 0,
    note: "Built phase-oriented WBS from parentActivity + task semantics.",
  });
  const resources = aggregate.resources.length ? aggregate.resources : buildGenericResources(tasks);
  const milestones = aggregate.milestones.length ? aggregate.milestones : buildGenericMilestones(tasks);
  const risks = aggregate.risks.length ? aggregate.risks : buildGenericRisks(tasks);
  pipelineSteps.push({
    name: "enrich_resources_milestones_risks",
    outputCount: resources.length + milestones.length + risks.length,
    note: `resources=${resources.length}, milestones=${milestones.length}, risks=${risks.length}`,
  });

  return {
    summary:
      aggregate.summary ||
      `Deterministic post-processing generated canonical artifacts from ${tasks.length} schedule activities.`,
    projectUpdates: {
      ...aggregate.projectUpdates,
      name: projectName,
      startDate: aggregate.projectUpdates?.startDate ?? window.startDate,
      endDate: aggregate.projectUpdates?.endDate ?? window.endDate,
      progress: projectProgress,
      status: projectProgress >= 100 ? "Completed" : "In Progress",
    },
    tasks,
    resources,
    milestones,
    risks,
    wbs,
    debug: {
      source: "fallback",
      parsedTaskCount: tasks.length,
      chosenTaskCount: tasks.length,
      aggregateTaskCount: aggregate.tasks.length,
      usedAggregateTaskFallback: true,
      pipelineSteps,
      qualitySignals: getTaskQualitySignals(tasks),
    },
  };
}

export function generateDeterministicProjectArtifacts(
  aggregate: AggregatedExtraction,
  currentState: AppState,
): OpenAIArtifacts {
  return buildDeterministicArtifacts(aggregate, currentState, aggregate.tasks);
}

/**
 * Extract milestones from tasks (duration = 0 or isMilestone = true)
 */
function extractMilestones(tasks: PartialTask[]): PartialMilestone[] {
  return tasks
    .filter(task => task.isMilestone || task.duration === 0)
    .map(task => ({
      name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
      date: task.start || task.end,
      status: task.status === "completed" ? "completed" : 
              task.status === "in_progress" ? "in_progress" : 
              "pending",
    }));
}

/**
 * Analyze risks from task data
 */
function analyzeRisks(tasks: PartialTask[], currentDate: string = new Date().toISOString().slice(0, 10)): RiskItem[] {
  const risks: RiskItem[] = [];
  
  // Find overdue tasks
  const overdueTasks = tasks.filter(task => 
    task.end && task.end < currentDate && task.status !== "completed"
  );
  
  if (overdueTasks.length > 0) {
    risks.push({
      id: `risk-overdue-${Date.now()}`,
      title: `${overdueTasks.length} Overdue Tasks`,
      severity: overdueTasks.length > 10 ? "high" : overdueTasks.length > 5 ? "medium" : "low",
      description: `${overdueTasks.length} tasks are past their deadline and not completed. This may impact project timeline.`,
      mitigation: "Review overdue tasks, reallocate resources, and update schedule baseline.",
    });
  }

  // Find critical tasks at risk
  const criticalAtRisk = tasks.filter(task => 
    task.isCritical && task.status === "at_risk"
  );
  
  if (criticalAtRisk.length > 0) {
    risks.push({
      id: `risk-critical-${Date.now()}`,
      title: `${criticalAtRisk.length} Critical Tasks At Risk`,
      severity: "high",
      description: `${criticalAtRisk.length} critical path tasks are at risk, which could delay project completion.`,
      mitigation: "Prioritize critical tasks, add resources, and monitor daily progress.",
    });
  }

  // Find tasks with no assigned resources
  const unassignedTasks = tasks.filter(task => 
    !task.assigned || task.assigned === "Project Team" || task.assigned === "Engineering Team"
  );
  
  if (unassignedTasks.length > tasks.length * 0.3) {
    risks.push({
      id: `risk-unassigned-${Date.now()}`,
      title: "Many Tasks Without Specific Assignments",
      severity: "medium",
      description: `${unassignedTasks.length} tasks have generic or no resource assignments.`,
      mitigation: "Assign specific team members to tasks for better accountability.",
    });
  }

  return risks;
}

function looksLikeLowQualityTaskSet(tasks: PartialTask[]) {
  if (!tasks.length) return true;
  const hasDates = tasks.filter((task) => task.start && task.end).length;
  const hasActivityIds = tasks.filter((task) => task.activityId).length;
  const headerLike = tasks.filter((task) =>
    /^(activity id|activity name|original duration|bl project start|bl project finish)$/i.test(
      task.name.trim(),
    ),
  ).length;
  return (
    tasks.length < 20 ||
    hasDates / tasks.length < 0.4 ||
    hasActivityIds / tasks.length < 0.4 ||
    headerLike > 0
  );
}

function getTaskQualitySignals(tasks: PartialTask[]) {
  if (!tasks.length) {
    return {
      lowQualityDetected: true,
      hasHeaderLikeTasks: true,
      hasSparseDates: true,
      hasSparseActivityIds: true,
    };
  }
  const hasDates = tasks.filter((task) => task.start && task.end).length;
  const hasActivityIds = tasks.filter((task) => task.activityId).length;
  const headerLike = tasks.filter((task) =>
    /^(activity id|activity name|original duration|bl project start|bl project finish)$/i.test(
      task.name.trim(),
    ),
  ).length;
  const hasSparseDates = hasDates / tasks.length < 0.4;
  const hasSparseActivityIds = hasActivityIds / tasks.length < 0.4;
  const hasHeaderLikeTasks = headerLike > 0;
  return {
    lowQualityDetected:
      tasks.length < 20 || hasSparseDates || hasSparseActivityIds || hasHeaderLikeTasks,
    hasHeaderLikeTasks,
    hasSparseDates,
    hasSparseActivityIds,
  };
}

export async function generateProjectArtifacts(
  aggregate: AggregatedExtraction,
  currentState: AppState,
): Promise<OpenAIArtifacts> {
  const ai = getClient();
  if (!ai) {
    logAi("artifact_generation_fallback_no_provider", {
      aggregateTasks: aggregate.tasks.length,
      aggregateResources: aggregate.resources.length,
    });
    return buildDeterministicArtifacts(aggregate, currentState, aggregate.tasks);
  }

  try {
    logAi("artifact_generation_start", {
      provider: ai.provider,
      model: getConfiguredModel(ai.provider),
      aggregateTasks: aggregate.tasks.length,
      aggregateResources: aggregate.resources.length,
      aggregateMilestones: aggregate.milestones.length,
      aggregateRisks: aggregate.risks.length,
    });
    const completion = await createJsonCompletion(
      ai.client,
      ai.provider,
      [
        {
          role: "system",
          content: `You are an expert PMO AI. Convert extracted construction project information into canonical project artifacts.

CRITICAL INSTRUCTIONS:
1. Build a proper WBS hierarchy based on parentActivity relationships
2. Use activityId as the unique identifier when available
3. Preserve all extracted metadata (duration, activityId, parentActivity)
4. Create realistic WBS levels: Project > Phase > Deliverable > Work Package > Task
5. Group related activities under common parents
6. Extract complete project metadata from headers

Return JSON with this exact structure:
{
  "summary": "Brief project summary",
  "projectUpdates": {
    "name": "Full project name",
    "client": "Client name if found",
    "location": "Location if found",
    "budget": "Budget if found",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "description": "Project description",
    "progress": 0-100
  },
  "tasks": [
    {
      "name": "Task name",
      "activityId": "A1002",
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "progress": 0-100,
      "status": "completed|in_progress|not_started|at_risk",
      "duration": 14,
      "assigned": "Team name",
      "dependencies": [],
      "isMilestone": false,
      "isCritical": false,
      "parentActivity": "Parent name"
    }
  ],
  "resources": [...],
  "milestones": [...],
  "risks": [...],
  "wbs": { ... }
}

Do not invent data. Use extracted information only.`,
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              currentProject: currentState.project,
              extracted: aggregate,
            },
            null,
            2,
          ),
        },
      ],
      0.2,
    );
    const content = completion.response.choices[0]?.message?.content ?? "{}";
    const parsed = artifactSchema.parse(
      normalizeArtifactPayload(JSON.parse(extractJson(content)), currentState),
    );
    const aggregateTasks = aggregate.tasks;
    const qualitySignals = getTaskQualitySignals(parsed.tasks);
    const useAggregateFallback = qualitySignals.lowQualityDetected && aggregateTasks.length > 0;
    const chosenTasks = useAggregateFallback ? aggregateTasks : parsed.tasks;

    // Post-process: Calculate dependencies
    const tasksWithDeps = calculateDependencies(chosenTasks);
    const deterministic = buildDeterministicArtifacts(aggregate, currentState, tasksWithDeps);
    const parsedWbsLooksWeak = (parsed.wbs.children?.length ?? 0) < 3;

    return {
      ...parsed,
      projectUpdates: {
        ...deterministic.projectUpdates,
        ...parsed.projectUpdates,
      },
      tasks: tasksWithDeps,
      resources: parsed.resources.length >= 3 ? parsed.resources : deterministic.resources,
      wbs: useAggregateFallback || parsedWbsLooksWeak ? deterministic.wbs : parsed.wbs,
      milestones: parsed.milestones.length >= 3 ? parsed.milestones : deterministic.milestones,
      risks: parsed.risks.length > 0 ? parsed.risks : deterministic.risks,
      debug: {
        source: "openai",
        modelUsed: completion.modelUsed,
        parsedTaskCount: parsed.tasks.length,
        chosenTaskCount: tasksWithDeps.length,
        aggregateTaskCount: aggregateTasks.length,
        usedAggregateTaskFallback: useAggregateFallback,
        qualitySignals,
      },
    };
  } catch (_err) {
    logAi("artifact_generation_fallback_error", {
      provider: ai.provider,
      error: _err instanceof Error ? _err.message : String(_err),
      aggregateTasks: aggregate.tasks.length,
    });
    return buildDeterministicArtifacts(aggregate, currentState, aggregate.tasks);
  }
}

type RagEvidence = {
  type: "project" | "task" | "resource" | "milestone" | "risk" | "wbs" | "document";
  id: string;
  text: string;
  relevance: number;
};

function sanitizeLabel(text: string) {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (cleaned.length > 120) return `${cleaned.slice(0, 117)}...`;
  return cleaned;
}

function tokenizeQuery(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function overlapScore(tokens: string[], haystack: string) {
  if (!tokens.length) return 0;
  const lower = haystack.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 1;
  }
  return score / tokens.length;
}

function buildEvidenceIndex(state: AppState, question: string): RagEvidence[] {
  const tokens = tokenizeQuery(question);
  const evidence: RagEvidence[] = [];

  const projectText = [
    state.project.name,
    state.project.client,
    state.project.location,
    state.project.budget,
    state.project.description,
    `progress ${state.project.progress}%`,
  ]
    .filter(Boolean)
    .join(" | ");
  evidence.push({
    type: "project",
    id: state.project.id || "project",
    text: projectText,
    relevance: 0.6 + overlapScore(tokens, projectText),
  });

  state.tasks.forEach((task) => {
    const label = sanitizeLabel(task.name);
    const text = `${task.activityId ?? task.id} | ${label} | ${task.status} | ${task.progress}% | ${task.start} -> ${task.end} | ${task.assigned} | ${task.parentActivity ?? ""}`;
    const noisyPenalty =
      /project completion 0|bl project start|activity id|activity name/i.test(task.name) ? 0.25 : 0;
    evidence.push({
      type: "task",
      id: task.activityId || task.id,
      text,
      relevance: overlapScore(tokens, text) + (task.status === "in_progress" ? 0.03 : 0) - noisyPenalty,
    });
  });

  state.resources.forEach((resource) => {
    const text = `${resource.name} | ${resource.role} | ${resource.status} | allocated ${resource.allocated}% capacity ${resource.capacity}%`;
    evidence.push({
      type: "resource",
      id: resource.id,
      text,
      relevance: overlapScore(tokens, text),
    });
  });

  state.milestones.forEach((milestone) => {
    const text = `${milestone.name} | ${milestone.date} | ${milestone.status}`;
    evidence.push({
      type: "milestone",
      id: milestone.id,
      text,
      relevance: overlapScore(tokens, text),
    });
  });

  state.risks.forEach((risk) => {
    const text = `${risk.title} | ${risk.severity} | ${risk.description} | mitigation: ${risk.mitigation}`;
    evidence.push({
      type: "risk",
      id: risk.id,
      text,
      relevance: overlapScore(tokens, text) + 0.03,
    });
  });

  const walkWbs = (node: WBSNode) => {
    const text = `${node.code} | ${node.name} | ${node.status} | ${node.progress}%`;
    evidence.push({
      type: "wbs",
      id: node.id,
      text,
      relevance: overlapScore(tokens, text),
    });
    (node.children || []).forEach(walkWbs);
  };
  walkWbs(state.wbs);

  state.documents.forEach((doc) => {
    const text = `${doc.name} | ${doc.type} | ${doc.status} | pages ${doc.pageCount ?? 0} | parsed ${
      doc.parsedData ? `${doc.parsedData.tasksExtracted} tasks` : "n/a"
    }`;
    evidence.push({
      type: "document",
      id: doc.id,
      text,
      relevance: overlapScore(tokens, text),
    });
  });

  return evidence
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 60);
}

function buildDeterministicChatAnswer(question: string, state: AppState, evidence: RagEvidence[]) {
  const lower = question.toLowerCase();
  const ongoing = state.tasks.filter((t) => t.status === "in_progress");
  const completed = state.tasks.filter((t) => t.status === "completed");
  const notStarted = state.tasks.filter((t) => t.status === "not_started");
  const overdue = state.tasks.filter(
    (task) => task.end && task.status !== "completed" && +new Date(task.end) < Date.now(),
  );
  const criticalOpen = state.tasks.filter((task) => task.isCritical && task.status !== "completed");
  const upcomingMilestones = [...state.milestones]
    .filter((m) => m.status !== "completed")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 8);
  const topRisks = [...state.risks].slice(0, 4);
  const low = lower;

  const statusIntent =
    /current status|project status|overall status|where we stand|health/i.test(low) ||
    /based on uploaded documents/.test(low);
  const progressIntent = /ongoing|in progress|progress|milestone/i.test(low);
  const riskIntent = /risk|mitigation|threat|issue/i.test(low);
  const resourceIntent = /resource|allocation|utilization|workload|capacity/i.test(low);
  const greetingIntent =
    /^(hi|hello|hey|salam|assalam|good morning|good afternoon|good evening)[!. ]*$/i.test(
      question.trim(),
    ) || /how are you|what can you do|help/i.test(low);
  const vagueIntent =
    tokenizeQuery(question).length <= 2 &&
    !statusIntent &&
    !progressIntent &&
    !riskIntent &&
    !resourceIntent;

  if (greetingIntent || vagueIntent) {
    return [
      "Ready. I can give precise project answers from your current data.",
      "",
      `Current snapshot: ${state.project.name}, progress ${state.project.progress}%, tasks ${state.tasks.length}, milestones ${state.milestones.length}, risks ${state.risks.length}.`,
      "",
      "Try one of these:",
      "- What are the top 5 overdue tasks with owners?",
      "- Show critical-path tasks at risk this week.",
      "- Which resources are overloaded above 85%?",
      "- What changed since the last update?",
    ].join("\n");
  }

  if (statusIntent) {
    return [
      `Overall status: ${state.project.status || "In Progress"} (${state.project.progress}%).`,
      "",
      "Execution snapshot:",
      `- Completed tasks: ${completed.length}/${state.tasks.length}`,
      `- In-progress tasks: ${ongoing.length}`,
      `- Not-started tasks: ${notStarted.length}`,
      `- Overdue active tasks: ${overdue.length}`,
      `- Critical open tasks: ${criticalOpen.length}`,
      "",
      "Milestone status:",
      ...[...state.milestones]
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))
        .slice(0, 6)
        .map((m) => `- ${sanitizeLabel(m.name)} | ${m.date} | ${m.status}`),
      "",
      `Risk posture: ${state.risks.length} tracked risk(s). ${
        topRisks[0] ? `Top risk: ${sanitizeLabel(topRisks[0].title)} (${topRisks[0].severity}).` : ""
      }`,
    ].join("\n");
  }

  if (riskIntent) {
    return [
      "Top risks and mitigations:",
      ...(topRisks.length
        ? topRisks.map(
            (r, i) => `${i + 1}. [${r.severity.toUpperCase()}] ${sanitizeLabel(r.title)}\n   Mitigation: ${sanitizeLabel(r.mitigation)}`,
          )
        : [
            "1. No explicit risk register entries found.",
            `   Mitigation: monitor overdue tasks (${overdue.length}) and critical open tasks (${criticalOpen.length}) weekly.`,
          ]),
      "",
      `Context: overdue=${overdue.length}, critical-open=${criticalOpen.length}, in-progress=${ongoing.length}.`,
    ].join("\n");
  }

  if (resourceIntent) {
    const topResources = [...state.resources]
      .sort((a, b) => b.allocated - a.allocated)
      .slice(0, 10);
    return [
      "Resource utilization snapshot:",
      ...topResources.map(
        (r) => `- ${sanitizeLabel(r.name)} | ${sanitizeLabel(r.role)} | allocated ${r.allocated}% / capacity ${r.capacity}% | ${r.status}`,
      ),
      "",
      `Total resources: ${state.resources.length}, allocations: ${state.allocations.length}.`,
    ].join("\n");
  }

  if (progressIntent) {
    const lines = [
      `Current progress snapshot: ${state.tasks.filter((t) => t.status === "completed").length}/${state.tasks.length} tasks completed, ${ongoing.length} in progress, project progress ${state.project.progress}%.`,
      "",
      "Ongoing tasks (top by nearest finish):",
      ...[...ongoing]
        .sort((a, b) => +new Date(a.end) - +new Date(b.end))
        .slice(0, 15)
        .map(
          (t) =>
            `- ${t.activityId ?? t.id}: ${sanitizeLabel(t.name)} | ${t.progress}% | ${t.start} -> ${t.end} | owner: ${t.assigned}`,
        ),
      "",
      "Key milestones:",
      ...upcomingMilestones.map((m) => `- ${sanitizeLabel(m.name)} | ${m.date} | ${m.status}`),
    ];
    return lines.join("\n");
  }

  return [
    `I can answer that, but I need a bit more direction.`,
    "",
    `Current state: ${state.project.name}, progress ${state.project.progress}%, tasks ${state.tasks.length}, resources ${state.resources.length}.`,
    "",
    "Please ask by area, for example:",
    "- status",
    "- risks",
    "- resources",
    "- schedule / milestones",
    "",
    "Top related context:",
    ...evidence.slice(0, 4).map((item) => `- [${item.type}] ${item.text}`),
  ].join("\n");
}

export async function askProjectQuestion(question: string, currentState: AppState) {
  const evidence = buildEvidenceIndex(currentState, question);
  const ai = getClient();
  const sources = evidence.slice(0, 8).map((item) => ({
    type: item.type,
    id: item.id,
    relevance: Number(item.relevance.toFixed(3)),
  }));

  if (!ai) {
    return {
      answer: buildDeterministicChatAnswer(question, currentState, evidence),
      confidence: 0.78,
      sources,
    };
  }

  try {
    const context = {
      question,
      projectSnapshot: {
        name: currentState.project.name,
        progress: currentState.project.progress,
        tasks: currentState.tasks.length,
        completed: currentState.tasks.filter((t) => t.status === "completed").length,
        inProgress: currentState.tasks.filter((t) => t.status === "in_progress").length,
        resources: currentState.resources.length,
        milestones: currentState.milestones.length,
        risks: currentState.risks.length,
      },
      retrievedEvidence: evidence.slice(0, 40),
    };

    const response = await ai.client.chat.completions.create({
      model: getConfiguredModel(ai.provider),
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a retrieval-grounded project copilot. Answer ONLY using retrievedEvidence facts. If evidence is insufficient, say what is missing. Be concise, operational, and specific. Never invent counts, dates, or statuses. For greetings or short/vague prompts (like 'hi', 'hello', 'ok'), do not dump evidence. Instead respond briefly, then suggest 3-5 useful project questions.",
        },
        {
          role: "user",
          content: JSON.stringify(context, null, 2),
        },
      ],
    });

    const answer = response.choices[0]?.message?.content?.trim();
    return {
      answer: answer || buildDeterministicChatAnswer(question, currentState, evidence),
      confidence: 0.9,
      sources,
    };
  } catch (_err) {
    return {
      answer: buildDeterministicChatAnswer(question, currentState, evidence),
      confidence: 0.74,
      sources,
    };
  }
}

export async function pingOpenAI() {
  const ai = getClient();
  if (!ai) return { ok: false, openaiConfigured: false, error: "No AI provider configured." };
  try {
    await ai.client.chat.completions.create({
      model: getConfiguredModel(ai.provider),
      temperature: 0,
      max_tokens: 8,
      messages: [
        { role: "system", content: "Return exactly: OK" },
        { role: "user", content: "Ping" },
      ],
    });

    return {
      ok: true,
      openaiConfigured: true,
      provider: ai.provider,
      model: getConfiguredModel(ai.provider),
    } as const;
  } catch (err: any) {
    return {
      ok: false,
      openaiConfigured: true,
      provider: ai.provider,
      model: getConfiguredModel(ai.provider),
      error: err?.message || String(err),
    };
  }
}

export function sanitizePageAnalysisResult(
  analysis: Awaited<ReturnType<typeof analyzePdfPage>>,
  pageText: string,
  pageNumber: number,
): DocumentPageAnalysis {
  return {
    pageNumber,
    rawText: pageText,
    extractedSummary: analysis.extractedSummary,
    tasks: analysis.tasks,
    resources: analysis.resources,
    milestones: analysis.milestones,
    risks: analysis.risks,
  };
}

export function aggregatePageAnalyses(
  analyses: Awaited<ReturnType<typeof analyzePdfPage>>[],
): AggregatedExtraction {
  const projectUpdates = analyses.reduce<Record<string, unknown>>((acc, analysis) => {
    return { ...acc, ...(analysis.projectUpdates ?? {}) };
  }, {});

  const tasks = dedupeByName(
    analyses.flatMap((analysis) =>
      analysis.tasks.map((task) => ({
        ...task,
        start: safeDate(task.start),
        end: safeDate(task.end),
      })),
    ),
  );
  const dedupedTasks = dedupeTasks(tasks);

  const resources = dedupeByName(analyses.flatMap((analysis) => analysis.resources));
  const milestones = dedupeByName(
    analyses.flatMap((analysis) =>
      analysis.milestones.map((milestone) => ({
        ...milestone,
        date: safeDate(milestone.date),
      })),
    ),
  );
  const risks = analyses.flatMap((analysis) => analysis.risks);
  const insights = analyses.flatMap((analysis) => analysis.insights ?? []);

  return {
    projectUpdates,
    summary: analyses.map((analysis) => analysis.extractedSummary).join(" ").slice(0, 2500),
    tasks: dedupedTasks,
    resources,
    milestones,
    risks,
    insights,
  };
}
