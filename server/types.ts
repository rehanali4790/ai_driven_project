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
  /** When type is override, optional working hours for that date */
  hours?: number;
}

export interface WorkingCalendar {
  id: string;
  name: string;
  timeZone?: string;
  /** Monday (index 0) through Sunday (index 6) */
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
  /** Optional default calendar for scheduling this project */
  calendarId?: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  user: string;
  createdAt: string;
}

export interface RiskItem {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
  mitigation: string;
}

export interface InsightItem {
  id: string;
  type: InsightType;
  message: string;
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
  status: "completed" | "in_progress" | "pending";
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
  tasks: PartialTask[];
  resources: PartialResource[];
  milestones: PartialMilestone[];
  risks: RiskItem[];
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
  /** Optional lag in working/calendar days per predecessor id (FS); omitted means 0 */
  dependencyLagByPredecessor?: Record<string, number>;
  isMilestone: boolean;
  isCritical: boolean;
  assigned: string;
  /** Single assignee resource id (merged global + project pool) */
  assignedResourceId?: string;
  parentActivity?: string;
  wbsNodeId?: string;
  baselineStart?: string;
  baselineEnd?: string;
  baselineDuration?: number;
  /** Total float in whole calendar days from CPM */
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
  /** Set when scope is project */
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

export interface InventoryItem {
  id: string;
  name: string;
  category: "equipment" | "material";
  quantity: number;
  singleUnitPrice?: number;
  bulkPrice?: number;
  unit: string;
  updatedAt: string;
}

export interface InventoryAllocationItem {
  id: string;
  inventoryId: string;
  resourceId: string;
  taskId: string;
  quantity: number;
  createdAt: string;
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
  /** Project-scoped resources only (global resources live on Workspace) */
  resources: ResourceItem[];
  allocations: AllocationItem[];
  inventories: InventoryItem[];
  inventoryAllocations: InventoryAllocationItem[];
  inventoryUnits: string[];
  risks: RiskItem[];
  milestones: Milestone[];
  activities: ActivityItem[];
  insights: InsightItem[];
  lastUpdatedAt: string;
}

/** One project bucket inside the workspace file */
export interface ProjectRecord {
  id: string;
  name: string;
  calendarId?: string;
  state: AppState;
}

export interface Workspace {
  activeProjectId: string;
  calendars: WorkingCalendar[];
  globalResources: ResourceItem[];
  projects: ProjectRecord[];
  lastUpdatedAt: string;
}

export interface WorkspaceMeta {
  activeProjectId: string;
  projectList: Array<{ id: string; name: string; calendarId?: string }>;
  calendars: WorkingCalendar[];
  globalResources: ResourceItem[];
}

export interface PartialTask {
  name: string;
  activityId?: string;
  start?: string;
  end?: string;
  progress?: number;
  status?: TaskStatus;
  duration?: number;
  assigned?: string;
  assignedResourceId?: string;
  dependencies?: string[];
  dependencyLagByPredecessor?: Record<string, number>;
  isMilestone?: boolean;
  isCritical?: boolean;
  parentActivity?: string;
  wbsNodeId?: string;
}

export interface PartialResource {
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

export interface PartialInventory {
  id?: string;
  name: string;
  category?: "equipment" | "material";
  quantity: number;
  singleUnitPrice?: number;
  bulkPrice?: number;
  unit: string;
}

export interface InventoryAllocationInput {
  inventoryId: string;
  resourceId: string;
  taskId: string;
  quantity: number;
}

export interface PartialMilestone {
  name: string;
  date?: string;
  status?: "completed" | "in_progress" | "pending";
}

export interface UnifiedPlanChildInput {
  name: string;
  durationDays: number;
  assignedResourceId?: string;
  status?: TaskStatus;
}

export interface UnifiedPlanInput {
  parentName: string;
  startDate: string;
  summaryDurationDays: number;
  parentWbsId?: string;
  children: UnifiedPlanChildInput[];
}

export interface PlannedTaskNodeInput {
  name: string;
  parentWbsId?: string;
  durationDays: number;
  startDate?: string;
  predecessorTaskId?: string;
  assignedResourceId?: string;
  summary?: boolean;
}

export interface AggregatedExtraction {
  projectUpdates?: Partial<ProjectInfo>;
  summary: string;
  tasks: PartialTask[];
  resources: PartialResource[];
  milestones: PartialMilestone[];
  risks: RiskItem[];
  insights: string[];
}

export interface OpenAIArtifacts {
  summary: string;
  projectUpdates?: Partial<ProjectInfo>;
  tasks: PartialTask[];
  resources: PartialResource[];
  milestones: PartialMilestone[];
  risks: RiskItem[];
  wbs: WBSNode;
  debug?: {
    source: "openai" | "fallback";
    modelUsed?: string;
    parsedTaskCount?: number;
    chosenTaskCount?: number;
    aggregateTaskCount?: number;
    usedAggregateTaskFallback?: boolean;
    pipelineSteps?: Array<{
      name: string;
      inputCount?: number;
      outputCount?: number;
      note?: string;
    }>;
    qualitySignals?: {
      lowQualityDetected: boolean;
      hasHeaderLikeTasks: boolean;
      hasSparseDates: boolean;
      hasSparseActivityIds: boolean;
    };
  };
}

export interface BootstrapResponse {
  state: AppState;
  dashboard: DashboardStats;
  workspace: WorkspaceMeta;
}
