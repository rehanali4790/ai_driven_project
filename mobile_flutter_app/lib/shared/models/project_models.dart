class WorkspaceMeta {
  final String activeProjectId;
  final List<ProjectListEntry> projectList;
  final List<dynamic> calendars;
  final List<ResourceItem> globalResources;

  WorkspaceMeta({
    required this.activeProjectId,
    required this.projectList,
    required this.calendars,
    required this.globalResources,
  });

  factory WorkspaceMeta.fromJson(Map<String, dynamic> json) {
    final rawList = (json["projectList"] as List<dynamic>? ?? <dynamic>[])
        .map((e) => ProjectListEntry.fromJson(e as Map<String, dynamic>))
        .toList();
    final g = (json["globalResources"] as List<dynamic>? ?? <dynamic>[])
        .map((e) => ResourceItem.fromJson(e as Map<String, dynamic>))
        .toList();
    return WorkspaceMeta(
      activeProjectId: (json["activeProjectId"] ?? "").toString(),
      projectList: rawList,
      calendars: json["calendars"] as List<dynamic>? ?? <dynamic>[],
      globalResources: g,
    );
  }
}

class ProjectListEntry {
  final String id;
  final String name;
  final String? calendarId;

  ProjectListEntry({required this.id, required this.name, this.calendarId});

  factory ProjectListEntry.fromJson(Map<String, dynamic> json) {
    return ProjectListEntry(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      calendarId: json["calendarId"]?.toString(),
    );
  }
}

class BootstrapResponse {
  final AppState state;
  final DashboardStats dashboard;
  final WorkspaceMeta? workspace;

  BootstrapResponse({required this.state, required this.dashboard, this.workspace});

  factory BootstrapResponse.fromJson(Map<String, dynamic> json) {
    return BootstrapResponse(
      state: AppState.fromJson(json["state"] as Map<String, dynamic>),
      dashboard: DashboardStats.fromJson(json["dashboard"] as Map<String, dynamic>),
      workspace: json["workspace"] != null
          ? WorkspaceMeta.fromJson(json["workspace"] as Map<String, dynamic>)
          : null,
    );
  }
}

class AppState {
  final ProjectInfo project;
  final List<GanttTask> tasks;
  final List<ResourceItem> resources;
  final List<Milestone> milestones;
  final List<RiskItem> risks;
  final List<DocumentRecord> documents;

  AppState({
    required this.project,
    required this.tasks,
    required this.resources,
    required this.milestones,
    required this.risks,
    required this.documents,
  });

  factory AppState.fromJson(Map<String, dynamic> json) {
    List<T> parseList<T>(
      String key,
      T Function(Map<String, dynamic>) parser,
    ) {
      final raw = (json[key] as List<dynamic>? ?? <dynamic>[]);
      return raw.map((e) => parser(e as Map<String, dynamic>)).toList();
    }

    return AppState(
      project: ProjectInfo.fromJson(json["project"] as Map<String, dynamic>),
      tasks: parseList("tasks", GanttTask.fromJson),
      resources: parseList("resources", ResourceItem.fromJson),
      milestones: parseList("milestones", Milestone.fromJson),
      risks: parseList("risks", RiskItem.fromJson),
      documents: parseList("documents", DocumentRecord.fromJson),
    );
  }
}

class ProjectInfo {
  final String id;
  final String name;
  final String client;
  final String location;
  final String budget;
  final String status;
  final int progress;
  final String description;
  final String? calendarId;

  ProjectInfo({
    required this.id,
    required this.name,
    required this.client,
    required this.location,
    required this.budget,
    required this.status,
    required this.progress,
    required this.description,
    this.calendarId,
  });

  factory ProjectInfo.fromJson(Map<String, dynamic> json) {
    return ProjectInfo(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      client: (json["client"] ?? "").toString(),
      location: (json["location"] ?? "").toString(),
      budget: (json["budget"] ?? "").toString(),
      status: (json["status"] ?? "").toString(),
      progress: (json["progress"] ?? 0) as int,
      description: (json["description"] ?? "").toString(),
      calendarId: json["calendarId"]?.toString(),
    );
  }
}

class GanttTask {
  final String id;
  final String name;
  final String status;
  final int progress;
  final String assigned;
  final String? assignedResourceId;
  final String? baselineStart;
  final String? baselineEnd;
  final int? totalFloat;
  final bool isCritical;

  GanttTask({
    required this.id,
    required this.name,
    required this.status,
    required this.progress,
    required this.assigned,
    this.assignedResourceId,
    this.baselineStart,
    this.baselineEnd,
    this.totalFloat,
    this.isCritical = false,
  });

  factory GanttTask.fromJson(Map<String, dynamic> json) {
    return GanttTask(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      status: (json["status"] ?? "").toString(),
      progress: (json["progress"] ?? 0) as int,
      assigned: (json["assigned"] ?? "Unassigned").toString(),
      assignedResourceId: json["assignedResourceId"]?.toString(),
      baselineStart: json["baselineStart"]?.toString(),
      baselineEnd: json["baselineEnd"]?.toString(),
      totalFloat: json["totalFloat"] as int?,
      isCritical: (json["isCritical"] ?? false) as bool,
    );
  }
}

class ResourceItem {
  final String id;
  final String name;
  final String role;
  final int allocated;
  final int capacity;
  final int costRate;
  final String rateBasis;
  final String scope;
  final String? projectId;

  ResourceItem({
    required this.id,
    required this.name,
    required this.role,
    required this.allocated,
    required this.capacity,
    this.costRate = 0,
    this.rateBasis = "hour",
    this.scope = "project",
    this.projectId,
  });

  factory ResourceItem.fromJson(Map<String, dynamic> json) {
    return ResourceItem(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      role: (json["role"] ?? "").toString(),
      allocated: (json["allocated"] ?? 0) as int,
      capacity: (json["capacity"] ?? 0) as int,
      costRate: (json["costRate"] ?? 0) as int,
      rateBasis: (json["rateBasis"] ?? "hour").toString(),
      scope: (json["scope"] ?? "project").toString(),
      projectId: json["projectId"]?.toString(),
    );
  }
}

class Milestone {
  final String id;
  final String name;
  final String date;
  final String status;

  Milestone({
    required this.id,
    required this.name,
    required this.date,
    required this.status,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) {
    return Milestone(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      date: (json["date"] ?? "").toString(),
      status: (json["status"] ?? "").toString(),
    );
  }
}

class RiskItem {
  final String id;
  final String title;
  final String severity;
  final String mitigation;

  RiskItem({
    required this.id,
    required this.title,
    required this.severity,
    required this.mitigation,
  });

  factory RiskItem.fromJson(Map<String, dynamic> json) {
    return RiskItem(
      id: (json["id"] ?? "").toString(),
      title: (json["title"] ?? "").toString(),
      severity: (json["severity"] ?? "").toString(),
      mitigation: (json["mitigation"] ?? "").toString(),
    );
  }
}

class DocumentRecord {
  final String id;
  final String name;
  final String status;
  final int? progress;

  DocumentRecord({
    required this.id,
    required this.name,
    required this.status,
    required this.progress,
  });

  factory DocumentRecord.fromJson(Map<String, dynamic> json) {
    return DocumentRecord(
      id: (json["id"] ?? "").toString(),
      name: (json["name"] ?? "").toString(),
      status: (json["status"] ?? "").toString(),
      progress: json["progress"] as int?,
    );
  }
}

class DashboardStats {
  final int overallProgress;
  final int tasksCompleted;
  final int totalTasks;
  final int inProgress;
  final int overdueTasks;
  final int criticalTasks;
  final int resourceUtilization;

  DashboardStats({
    required this.overallProgress,
    required this.tasksCompleted,
    required this.totalTasks,
    required this.inProgress,
    required this.overdueTasks,
    required this.criticalTasks,
    required this.resourceUtilization,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      overallProgress: (json["overallProgress"] ?? 0) as int,
      tasksCompleted: (json["tasksCompleted"] ?? 0) as int,
      totalTasks: (json["totalTasks"] ?? 0) as int,
      inProgress: (json["inProgress"] ?? 0) as int,
      overdueTasks: (json["overdueTasks"] ?? 0) as int,
      criticalTasks: (json["criticalTasks"] ?? 0) as int,
      resourceUtilization: (json["resourceUtilization"] ?? 0) as int,
    );
  }
}

class ChatSource {
  final String type;
  final String id;
  final num relevance;

  ChatSource({required this.type, required this.id, required this.relevance});

  factory ChatSource.fromJson(Map<String, dynamic> json) {
    return ChatSource(
      type: (json["type"] ?? "").toString(),
      id: (json["id"] ?? "").toString(),
      relevance: (json["relevance"] ?? 0) as num,
    );
  }
}

class ChatResponse {
  final String answer;
  final num confidence;
  final List<ChatSource> sources;

  ChatResponse({
    required this.answer,
    required this.confidence,
    required this.sources,
  });

  factory ChatResponse.fromJson(Map<String, dynamic> json) {
    final raw = (json["sources"] as List<dynamic>? ?? <dynamic>[]);
    return ChatResponse(
      answer: (json["answer"] ?? "").toString(),
      confidence: (json["confidence"] ?? 0) as num,
      sources: raw.map((e) => ChatSource.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}
