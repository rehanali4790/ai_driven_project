export type ViewType =
  | "dashboard"
  | "overview"
  | "wbs"
  | "wbs_editor"
  | "gantt"
  | "gantt_editor"
  | "resources"
  | "ai"
  | "documents";

export type DocumentType = "pdf" | "excel" | "image" | "word" | "other";
export type DocumentStatus = "pending" | "processing" | "completed" | "failed";
export type TaskStatus = "completed" | "in_progress" | "not_started" | "at_risk";
export type ResourceType = "person" | "equipment" | "material";
export type ResourceStatus = "available" | "allocated" | "on_leave";
export type InsightType = "risk" | "suggestion" | "info";
export type UserRole = "admin" | "manager" | "member" | "viewer";
export type ResourceScope = "global" | "project";
export type RateBasis = "hour";
export type DurationUnit = "calendar_day" | "working_day" | "hour";

export interface CalendarException {
  date: string;
  type: "holiday" | "override";
  hours?: number;
}

export interface WorkingCalendar {
  id: string;
  name: string;
  timeZone?: string;
  workWeek: boolean[];
  dailyHours: number;
  exceptions: CalendarException[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  client: string;
  location: string;
  budget: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  description: string;
  calendarId?: string;
}

export interface ParsedStats {
  tasksExtracted: number;
  resourcesFound: number;
  milestonesIdentified: number;
}

export interface DocumentPageAnalysis {
  pageNumber: number;
  rawText: string;
  extractedSummary: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  type: DocumentType;
  size: string;
  uploadDate: string;
  status: DocumentStatus;
  progress?: number;
  parsedData?: ParsedStats;
  localPath?: string;
  pageCount?: number;
  pageAnalyses?: DocumentPageAnalysis[];
  error?: string;
  currentStage?: "idle" | "extracting" | "parsing" | "aggregating" | "generating_artifacts" | "failed";
  currentPage?: number;
  lastMessage?: string;
}

export interface WBSNode {
  id: string;
  code: string;
  name: string;
  level: number;
  type: "project" | "phase" | "deliverable" | "work_package" | "task";
  progress: number;
  status: TaskStatus;
  children?: WBSNode[];
}

export interface GanttTask {
  id: string;
  name: string;
  activityId?: string;
  start: string;
  end: string;
  progress: number;
  status: TaskStatus;
  duration?: number;
  durationUnit?: DurationUnit;
  dependencies: string[];
  dependencyLagByPredecessor?: Record<string, number>;
  isMilestone: boolean;
  isCritical: boolean;
  assigned: string;
  assignedResourceId?: string;
  parentActivity?: string;
  wbsNodeId?: string;
  baselineStart?: string;
  baselineEnd?: string;
  baselineDuration?: number;
  totalFloat?: number;
}

export interface ResourceItem {
  id: string;
  name: string;
  role: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity: number;
  allocated: number;
  costRate: number;
  rateBasis: RateBasis;
  scope: ResourceScope;
  projectId?: string;
  skills: string[];
  email: string;
  updatedAt: string;
}

export interface AllocationItem {
  id: string;
  resourceId: string;
  taskId: string;
  taskName: string;
  startDate: string;
  endDate: string;
  allocation: number;
}

export interface RiskItem {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
  mitigation: string;
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
  status: "completed" | "in_progress" | "pending";
}

export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  user: string;
  createdAt: string;
}

export interface InsightItem {
  id: string;
  type: InsightType;
  message: string;
}

export interface DashboardStats {
  overallProgress: number;
  tasksCompleted: number;
  totalTasks: number;
  inProgress: number;
  overdueTasks: number;
  criticalTasks: number;
  resourceUtilization: number;
}

export interface AppState {
  project: ProjectInfo;
  documents: DocumentRecord[];
  wbs: WBSNode;
  tasks: GanttTask[];
  resources: ResourceItem[];
  allocations: AllocationItem[];
  risks: RiskItem[];
  milestones: Milestone[];
  activities: ActivityItem[];
  insights: InsightItem[];
  lastUpdatedAt: string;
}

export interface WorkspaceMeta {
  activeProjectId: string;
  projectList: Array<{ id: string; name: string; calendarId?: string }>;
  calendars: WorkingCalendar[];
  globalResources: ResourceItem[];
}

export interface BootstrapResponse {
  state: AppState;
  dashboard: DashboardStats;
  workspace: WorkspaceMeta;
}

export interface ChatResponse {
  answer: string;
  confidence: number;
  sources: { type: string; id: string; relevance: number }[];
}

export interface ResourceDraft {
  name: string;
  role: string;
  type?: ResourceType;
  allocated?: number;
  capacity?: number;
  status?: ResourceStatus;
  costRate?: number;
  rateBasis?: RateBasis;
  scope?: ResourceScope;
  projectId?: string;
  id?: string;
  skills?: string[];
  email?: string;
}

export interface TaskUpdateDraft {
  name?: string;
  start?: string;
  end?: string;
  progress?: number;
  status?: TaskStatus;
  assigned?: string;
  assignedResourceId?: string;
  dependencies?: string[];
  isCritical?: boolean;
  isMilestone?: boolean;
}

export interface WbsNodeUpdateDraft {
  name?: string;
  status?: TaskStatus;
  progress?: number;
  type?: WBSNode["type"];
}

export interface WbsNodeCreateDraft {
  name: string;
  type: WBSNode["type"];
  status: TaskStatus;
  progress: number;
}
