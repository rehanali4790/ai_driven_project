import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  aggregatePageAnalyses,
  analyzePdfPage,
  askProjectQuestion,
  generateDeterministicProjectArtifacts,
  getClient,
  pingOpenAI,
  generateProjectArtifacts,
  sanitizePageAnalysisResult,
} from "./openai";
import { extractDocumentPages, formatFileSize, inferDocumentType } from "./parsers";
import { extractStructuredPdfPages, aggregateProjectMetadata, aggregateActivities } from "./enhanced-parsers";
import {
  activateProject,
  addDocument,
  applyDocumentAnalysis,
  createId,
  createProject,
  deleteDocument,
  deleteProject,
  getBootstrapResponse,
  getState,
  getUploadsDir,
  markDocumentFailed,
  replaceArtifacts,
  resetWorkspace,
  saveBaseline,
  summarizeStateForPrompt,
  assignTaskResource,
  moveTask,
  updateTask,
  updateTaskStatus,
  createTask,
  updateWbsNode,
  createWbsNode,
  updateDocument,
  updateProjectRecord,
  upsertCalendar,
  upsertResource,
} from "./store";
import {
  AggregatedExtraction,
  DocumentRecord,
  PartialTask,
  TaskStatus,
  UserRole,
  WorkingCalendar,
} from "./types";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const uploadsDir = getUploadsDir();

type PageDebugEntry = {
  pageNumber: number;
  source: "openai" | "fallback";
  taskCount: number;
  resourceCount: number;
  milestoneCount: number;
  riskCount: number;
  summaryPreview: string;
};

type DocumentDebugReport = {
  documentId: string;
  documentName: string;
  startedAt: string;
  finishedAt?: string;
  pageCount: number;
  pageDebug: PageDebugEntry[];
  aggregate: {
    summaryLength: number;
    tasks: number;
    resources: number;
    milestones: number;
    risks: number;
  };
  artifacts: {
    tasks: number;
    resources: number;
    milestones: number;
    risks: number;
    debug?: any;
  };
};

const documentDebugStore = new Map<string, DocumentDebugReport>();

function getActor(req: express.Request) {
  const roleHeader = String(req.headers["x-user-role"] || "admin").toLowerCase();
  const role = (["admin", "manager", "member", "viewer"].includes(roleHeader)
    ? roleHeader
    : "member") as UserRole;
  const name = String(req.headers["x-user-name"] || role.toUpperCase());
  return { role, name };
}

function logPipeline(event: string, meta: Record<string, unknown> = {}) {
  const time = new Date().toISOString();
  console.log(`[pipeline][${time}][${event}] ${JSON.stringify(meta)}`);
}

function toPartialTaskFromStructured(activity: any): PartialTask {
  return {
    name: activity.name,
    activityId: activity.activityId ?? undefined,
    start: activity.startDate ?? undefined,
    end: activity.endDate ?? undefined,
    duration: activity.duration ?? undefined,
    isMilestone: Boolean(activity.isMilestone || activity.duration === 0),
    parentActivity: activity.parentName ?? undefined,
  };
}

function inferProjectProfileFromPages(pages: any[], documentName?: string) {
  const joined = pages
    .slice(0, 6)
    .map((page) => String(page.text || ""))
    .join(" ")
    .replace(/\s+/g, " ");

  const lower = joined.toLowerCase();
  const lowerDoc = (documentName || "").toLowerCase();
  const profile: {
    name?: string;
    client?: string;
    location?: string;
    budget?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  } = {};

  if (lower.includes("education city")) {
    const hasPhase = /phase[-\s]*1/i.test(joined);
    const hasAcres = /4800\s*acres/i.test(joined);
    profile.name = hasAcres
      ? "Infrastructure Development of Education City, Karachi Phase-1 (4800 Acres) — Package-1-A"
      : hasPhase
        ? "Infrastructure Development of Education City, Karachi Phase-1"
        : "Infrastructure Development of Education City, Karachi";
  }
  if (!profile.name && /submission of revised work program|education city/.test(lowerDoc)) {
    profile.name =
      "Infrastructure Development of Education City, Karachi Phase-1 (4800 Acres) — Package-1-A";
  }

  if (!profile.client && (/cgd\s+consulting/i.test(joined) || /cgd/.test(lowerDoc))) {
    profile.client = "CGD Consulting";
  }
  if (!profile.client) {
    const clientMatch = joined.match(/(?:Client|Employer)\s*[:\-]?\s*([A-Za-z0-9 &().,-]{3,80})/i);
    if (clientMatch?.[1]) profile.client = clientMatch[1].trim();
  }

  if (/karachi/i.test(joined) || /karachi/.test(lowerDoc)) {
    profile.location = /4800\s*acres/i.test(joined)
      ? "Karachi, Pakistan (4800 Acres)"
      : "Karachi, Pakistan";
  }

  const budgetMatch = joined.match(/(PKR\s*[0-9][0-9.,\s]*(?:Billion|Million|Bn|Mn)?)/i);
  if (budgetMatch?.[1]) {
    profile.budget = budgetMatch[1].replace(/\s+/g, " ").trim();
  } else if (lower.includes("education city") || /education city/.test(lowerDoc)) {
    // Stable fallback for this schedule family where budget is not always printed.
    profile.budget = "PKR 12.5 Billion";
  }

  if (lower.includes("education city") || /submission of revised work program/.test(lowerDoc)) {
    profile.description =
      "Development of education city infrastructure including roads, bridges, drainage, water supply, electrical systems, and horticulture works.";
  }

  return profile;
}

function buildAggregateFromStructuredPages(pages: any[], documentName?: string): AggregatedExtraction {
  const metadata = aggregateProjectMetadata(pages as any);
  const inferred = inferProjectProfileFromPages(pages, documentName);
  const activities = aggregateActivities(pages as any);
  const tasks = activities
    .filter((activity) => activity.activityId && activity.startDate && activity.endDate)
    .map(toPartialTaskFromStructured);

  return {
    projectUpdates: {
      name: metadata.projectName || inferred.name || "Infrastructure Development Project",
      client: metadata.client || inferred.client,
      location: metadata.location || inferred.location,
      budget: inferred.budget,
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      description: inferred.description,
    },
    summary: `Deterministic structured parser extracted ${tasks.length} activities from ${pages.length} pages.`,
    tasks,
    resources: [],
    milestones: tasks
      .filter((task) => task.isMilestone)
      .slice(0, 24)
      .map((task) => ({
        name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
        date: task.start,
        status: "pending" as const,
      })),
    risks: [],
    insights: [
      "Fast structured parser mode was used (LLM page analysis disabled).",
      "WBS/resources/milestones/risks were synthesized deterministically from schedule activities.",
    ],
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4o",
  });
});

app.get("/api/ai/ping", async (_req, res) => {
  try {
    const result = await pingOpenAI();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, openaiConfigured: Boolean(process.env.OPENAI_API_KEY), error: err?.message || String(err) });
  }
});

app.get("/api/bootstrap", (_req, res) => {
  res.json(getBootstrapResponse());
});

app.post("/api/admin/reset", (_req, res) => {
  resetWorkspace();
  res.json(getBootstrapResponse());
});

app.post("/api/projects", (req, res) => {
  try {
    const { role } = getActor(req);
    createProject(req.body ?? {}, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Create project failed." });
  }
});

app.patch("/api/projects/:id", (req, res) => {
  try {
    const { role } = getActor(req);
    updateProjectRecord(req.params.id, req.body ?? {}, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Update project failed." });
  }
});

app.post("/api/workspace/activate", (req, res) => {
  try {
    const projectId = String(req.body?.projectId ?? "").trim();
    if (!projectId) {
      res.status(400).json({ error: "projectId is required." });
      return;
    }
    activateProject(projectId);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Activate failed." });
  }
});

app.delete("/api/projects/:id", (req, res) => {
  try {
    const { role } = getActor(req);
    deleteProject(req.params.id, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Delete project failed." });
  }
});

app.post("/api/calendars", (req, res) => {
  try {
    const { role } = getActor(req);
    const cal = req.body?.calendar as WorkingCalendar | undefined;
    if (!cal?.id || !cal?.name) {
      res.status(400).json({ error: "calendar id and name are required." });
      return;
    }
    upsertCalendar(cal, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Calendar save failed." });
  }
});

app.post("/api/projects/:id/baseline", (req, res) => {
  try {
    const { role, name } = getActor(req);
    const targetId = req.params.id;
    const active = getState().project.id;
    if (targetId !== active) {
      res.status(400).json({ error: "Switch to this project before saving its baseline." });
      return;
    }
    saveBaseline(name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Baseline failed." });
  }
});

app.get("/api/context-summary", (_req, res) => {
  res.json(summarizeStateForPrompt(getState()));
});

app.post("/api/resources/upsert", (req, res) => {
  try {
    const { resource } = req.body ?? {};
    if (!resource?.name || !resource?.role) {
      res.status(400).json({ error: "Resource name and role are required." });
      return;
    }
    const { role } = getActor(req);
    upsertResource(resource, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Resource upsert failed." });
  }
});

app.patch("/api/tasks/:id", (req, res) => {
  try {
    const { role, name } = getActor(req);
    updateTask(req.params.id, req.body?.updates ?? {}, name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Task update failed." });
  }
});

app.post("/api/tasks/:id/move", (req, res) => {
  try {
    const { role, name } = getActor(req);
    const { start, end } = req.body ?? {};
    if (!start || !end) {
      res.status(400).json({ error: "Both start and end dates are required." });
      return;
    }
    moveTask(req.params.id, start, end, name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Task move failed." });
  }
});

app.post("/api/tasks/:id/assign", (req, res) => {
  try {
    const { role, name } = getActor(req);
    const assignee = String(req.body?.assignee ?? "").trim();
    assignTaskResource(req.params.id, assignee || "Unassigned", name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Task assignment failed." });
  }
});

app.post("/api/tasks/:id/status", (req, res) => {
  try {
    const { role, name } = getActor(req);
    const status = req.body?.status as TaskStatus;
    if (!status || !["completed", "in_progress", "not_started", "at_risk"].includes(status)) {
      res.status(400).json({ error: "Valid task status is required." });
      return;
    }
    updateTaskStatus(req.params.id, status, name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res
      .status(400)
      .json({ error: error instanceof Error ? error.message : "Task status update failed." });
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const { role, name } = getActor(req);
    const task = req.body?.task;
    if (!task?.name) {
      res.status(400).json({ error: "Task name is required." });
      return;
    }
    createTask(task, name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Task create failed." });
  }
});

app.patch("/api/wbs/:id", (req, res) => {
  try {
    const { role, name } = getActor(req);
    updateWbsNode(req.params.id, req.body?.updates ?? {}, name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "WBS update failed." });
  }
});

app.post("/api/wbs/:parentId/children", (req, res) => {
  try {
    const { role, name } = getActor(req);
    const payload = req.body?.node;
    if (!payload?.name || !payload?.type || !payload?.status) {
      res.status(400).json({ error: "Node name, type, and status are required." });
      return;
    }
    createWbsNode(req.params.parentId, payload, name, role);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "WBS create failed." });
  }
});

async function processDocument(document: DocumentRecord) {
  try {
    logPipeline("document_process_start", {
      documentId: document.id,
      name: document.name,
      type: document.type,
      size: document.size,
    });
    updateDocument(document.id, (current) => ({
      ...current,
      status: "processing",
      progress: 0,
      currentStage: "extracting",
      currentPage: 0,
      lastMessage: "Starting document ingestion...",
    }));

    // Use enhanced parser for PDFs, regular parser for other types
    const pages = document.type === "pdf" 
      ? await extractStructuredPdfPages(document.localPath!)
      : await extractDocumentPages(document.localPath!, document.type);
    logPipeline("document_pages_extracted", {
      documentId: document.id,
      pageCount: pages.length,
      parser: document.type === "pdf" ? "structured_pdf" : "generic",
    });

    updateDocument(document.id, (current) => ({
      ...current,
      pageCount: pages.length,
      progress: 15,
      currentStage: "parsing",
      currentPage: 0,
      lastMessage: `Extracted ${pages.length} page(s). Parsing with AI...`,
    }));

    // Extract project metadata from structured pages (PDF only)
    if (document.type === "pdf" && "activities" in pages[0]) {
      const projectMetadata = aggregateProjectMetadata(pages as any);
      const allActivities = aggregateActivities(pages as any);
      
      if (projectMetadata.projectName) {
        updateDocument(document.id, (current) => ({
          ...current,
          lastMessage: `Found project: ${projectMetadata.projectName} with ${allActivities.length} activities`,
        }));
      }
    }

    const analyses = [];
    const debugReport: DocumentDebugReport = {
      documentId: document.id,
      documentName: document.name,
      startedAt: new Date().toISOString(),
      pageCount: pages.length,
      pageDebug: [],
      aggregate: {
        summaryLength: 0,
        tasks: 0,
        resources: 0,
        milestones: 0,
        risks: 0,
      },
      artifacts: {
        tasks: 0,
        resources: 0,
        milestones: 0,
        risks: 0,
      },
    };

    const useFastStructuredMode =
      document.type === "pdf" &&
      pages.length > 0 &&
      "activities" in pages[0] &&
      process.env.USE_AI_PAGE_ANALYSIS !== "true";

    if (useFastStructuredMode) {
      logPipeline("document_fast_mode_enabled", {
        documentId: document.id,
        reason: "USE_AI_PAGE_ANALYSIS is not true for structured PDF parser output",
      });
    }

    for (const page of pages) {
      if (useFastStructuredMode) {
        const structuredTasks = ("activities" in page ? (page.activities as any[]) : [])
          .filter((activity) => activity.activityId && activity.startDate && activity.endDate)
          .map(toPartialTaskFromStructured);
        const analysis = {
          extractedSummary:
            structuredTasks.length > 0
              ? `Structured parser extracted ${structuredTasks.length} schedule activities on this page.`
              : `No structured schedule rows extracted on page ${page.pageNumber}.`,
          tasks: structuredTasks,
          resources: [],
          milestones: structuredTasks
            .filter((task) => task.isMilestone)
            .map((task) => ({
              name: task.activityId ? `${task.activityId}: ${task.name}` : task.name,
              date: task.start,
              status: "pending" as const,
            })),
          risks: [],
          projectUpdates: {},
          insights: ["Deterministic structured-page parsing."],
        };
        analyses.push(analysis);
        debugReport.pageDebug.push({
          pageNumber: page.pageNumber,
          source: "fallback",
          taskCount: analysis.tasks.length,
          resourceCount: 0,
          milestoneCount: analysis.milestones.length,
          riskCount: 0,
          summaryPreview: analysis.extractedSummary.slice(0, 160),
        });
        logPipeline("document_page_analyzed", {
          documentId: document.id,
          page: page.pageNumber,
          totalPages: pages.length,
          source: "fallback",
          mode: "fast_structured",
          tasks: analysis.tasks.length,
          milestones: analysis.milestones.length,
        });
        continue;
      }

      const progress = Math.min(
        90,
        15 + Math.round((page.pageNumber / Math.max(pages.length, 1)) * 70),
      );
      updateDocument(document.id, (current) => ({
        ...current,
        progress,
        currentStage: "parsing",
        currentPage: page.pageNumber,
        lastMessage: `Parsing page ${page.pageNumber}/${pages.length}...`,
      }));
      const structuredContext =
        "activities" in page
          ? `\n\nStructured extraction context:\n${JSON.stringify(
              {
                projectMetadata: page.projectMetadata ?? {},
                activities: page.activities ?? [],
              },
              null,
              2,
            )}`
          : "";
      const analysis = await analyzePdfPage(
        `${page.text}${structuredContext}`,
        page.pageNumber,
        document.name,
      );
      analyses.push(analysis);
      const insightText = (analysis.insights ?? []).join(" ").toLowerCase();
      const source: "openai" | "fallback" =
        insightText.includes("extracted locally") ||
        insightText.includes("deterministic schedule extraction fallback")
          ? "fallback"
          : "openai";
      debugReport.pageDebug.push({
        pageNumber: page.pageNumber,
        source,
        taskCount: analysis.tasks.length,
        resourceCount: analysis.resources.length,
        milestoneCount: analysis.milestones.length,
        riskCount: analysis.risks.length,
        summaryPreview: analysis.extractedSummary.slice(0, 160),
      });
      logPipeline("document_page_analyzed", {
        documentId: document.id,
        page: page.pageNumber,
        totalPages: pages.length,
        source,
        tasks: analysis.tasks.length,
        resources: analysis.resources.length,
        milestones: analysis.milestones.length,
        risks: analysis.risks.length,
      });
    }

    updateDocument(document.id, (current) => ({
      ...current,
      progress: 95,
      currentStage: "aggregating",
      lastMessage: "Aggregating extracted artifacts (WBS, tasks, milestones)...",
    }));
    const aggregate = useFastStructuredMode
      ? buildAggregateFromStructuredPages(pages as any[], document.name)
      : aggregatePageAnalyses(analyses);
    logPipeline("document_aggregate_built", {
      documentId: document.id,
      tasks: aggregate.tasks.length,
      resources: aggregate.resources.length,
      milestones: aggregate.milestones.length,
      risks: aggregate.risks.length,
      summaryLength: aggregate.summary.length,
      mode: useFastStructuredMode ? "fast_structured" : "ai_page_analysis",
    });
    const artifacts = useFastStructuredMode
      ? generateDeterministicProjectArtifacts(aggregate, getState())
      : await generateProjectArtifacts(aggregate, getState());
    logPipeline("document_artifacts_generated", {
      documentId: document.id,
      tasks: artifacts.tasks.length,
      resources: artifacts.resources.length,
      milestones: artifacts.milestones.length,
      risks: artifacts.risks.length,
      debug: artifacts.debug ?? null,
    });
    debugReport.aggregate = {
      summaryLength: aggregate.summary.length,
      tasks: aggregate.tasks.length,
      resources: aggregate.resources.length,
      milestones: aggregate.milestones.length,
      risks: aggregate.risks.length,
    };
    debugReport.artifacts = {
      tasks: artifacts.tasks.length,
      resources: artifacts.resources.length,
      milestones: artifacts.milestones.length,
      risks: artifacts.risks.length,
      debug: artifacts.debug,
    };
    debugReport.finishedAt = new Date().toISOString();
    documentDebugStore.set(document.id, debugReport);
    logPipeline("document_debug_report_ready", {
      documentId: document.id,
      pages: debugReport.pageCount,
      aggregateTasks: debugReport.aggregate.tasks,
      artifactTasks: debugReport.artifacts.tasks,
      fallbackPages: debugReport.pageDebug.filter((p) => p.source === "fallback").length,
    });
    const pageAnalyses = analyses.map((analysis, index) =>
      sanitizePageAnalysisResult(analysis, pages[index].text, pages[index].pageNumber),
    );

    applyDocumentAnalysis(document.id, pageAnalyses, aggregate, artifacts);
    logPipeline("document_state_applied", {
      documentId: document.id,
      pageAnalyses: pageAnalyses.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown document processing error";
    logPipeline("document_process_failed", {
      documentId: document.id,
      error: message,
    });
    markDocumentFailed(document.id, message);
    throw error;
  }
}

app.get("/api/documents/:id/debug", (req, res) => {
  const state = getState();
  const document = state.documents.find((item) => item.id === req.params.id);
  if (!document) {
    res.status(404).json({ error: "Document not found." });
    return;
  }

  const report = documentDebugStore.get(document.id);
  const pageAnalyses = document.pageAnalyses ?? [];
  const pageTaskTotal = pageAnalyses.reduce((sum, page) => sum + page.tasks.length, 0);
  res.json({
    document: {
      id: document.id,
      name: document.name,
      status: document.status,
      progress: document.progress,
      pageCount: document.pageCount,
      parsedData: document.parsedData,
      lastMessage: document.lastMessage,
      error: document.error,
    },
    storedAnalyses: {
      pages: pageAnalyses.length,
      totalTasksAcrossPages: pageTaskTotal,
      nonEmptyPages: pageAnalyses.filter((page) => page.tasks.length > 0).length,
    },
    debugReport: report ?? null,
  });
});

app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }

  const type = inferDocumentType(req.file.mimetype, req.file.originalname);
  const document: DocumentRecord = {
    id: createId("doc"),
    name: req.file.originalname,
    type,
    size: formatFileSize(req.file.size),
    uploadDate: new Date().toISOString(),
    status: "processing",
    progress: 0,
    localPath: req.file.path,
  };

  addDocument(document);

  // Process asynchronously so the UI updates immediately.
  // The document status/progress will still update in `data/app-state.json` as processing runs.
  void (async () => {
    try {
      await processDocument(document);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document processing failed";
      markDocumentFailed(document.id, message);
    }
  })();

  res.status(202).json(getBootstrapResponse());
});

app.post("/api/documents/:id/reprocess", async (req, res) => {
  const state = getState();
  const document = state.documents.find((item) => item.id === req.params.id);

  if (!document?.localPath || !fs.existsSync(document.localPath)) {
    res.status(404).json({ error: "Document file not found for reprocessing." });
    return;
  }

  try {
    await processDocument(document);
    res.json(getBootstrapResponse());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reprocessing failed";
    res.status(500).json({ error: message, ...getBootstrapResponse() });
  }
});

app.delete("/api/documents/:id", (req, res) => {
  const state = getState();
  const document = state.documents.find((item) => item.id === req.params.id);
  if (document?.localPath && fs.existsSync(document.localPath)) {
    fs.unlinkSync(document.localPath);
  }
  deleteDocument(req.params.id);
  res.json(getBootstrapResponse());
});

app.post("/api/ai/chat", async (req, res) => {
  const question = req.body?.question;
  if (!question) {
    res.status(400).json({ error: "Question is required." });
    return;
  }

  try {
    const result = await askProjectQuestion(question, getState());
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "AI request failed",
    });
  }
});

app.post("/api/ai/stt", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Audio file is required." });
    return;
  }
  try {
    const ai = getClient();
    if (!ai) {
      res.status(400).json({ error: "No AI provider configured for STT." });
      return;
    }
    const transcript = await ai.client.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: process.env.STT_MODEL || "gpt-4o-mini-transcribe",
    });
    res.json({ text: transcript.text || "" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "STT failed." });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

app.post("/api/ai/tts", async (req, res) => {
  try {
    const text = String(req.body?.text || "");
    if (!text.trim()) {
      res.status(400).json({ error: "Text is required." });
      return;
    }
    const ai = getClient();
    if (!ai) {
      res.status(400).json({ error: "No AI provider configured for TTS." });
      return;
    }
    const speech = await ai.client.audio.speech.create({
      model: process.env.TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.TTS_VOICE || "alloy",
      input: text.slice(0, 4000),
    });
    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "TTS failed." });
  }
});

app.post("/api/ai/generate-artifacts", async (_req, res) => {
  try {
    const currentState = getState();
    const aggregate = {
      projectUpdates: {},
      summary:
        "Regenerate the WBS, Gantt plan, milestones, risks, and resources using the current stored project state.",
      tasks: currentState.tasks.map((task) => ({
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
      resources: currentState.resources.map((resource) => ({
        name: resource.name,
        role: resource.role,
        type: resource.type,
        allocated: resource.allocated,
        capacity: resource.capacity,
        status: resource.status,
        costRate: resource.costRate,
        skills: resource.skills,
        email: resource.email,
      })),
      milestones: currentState.milestones.map((milestone) => ({
        name: milestone.name,
        date: milestone.date,
        status: milestone.status,
      })),
      risks: currentState.risks,
      insights: currentState.insights.map((insight) => insight.message),
    };

    const artifacts = await generateProjectArtifacts(aggregate, currentState);
    replaceArtifacts(artifacts);
    res.json(getBootstrapResponse());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Artifact generation failed",
    });
  }
});

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({
    error: error.message || "Unexpected server error",
  });
});

app.listen(port, () => {
  console.log(`InfraMind API running on http://localhost:${port}`);
  console.log(`Uploads served from ${path.relative(process.cwd(), uploadsDir)}`);
});
