import "dart:convert";

import "package:http/http.dart" as http;

import "../../core/config/app_config.dart";
import "../../shared/models/project_models.dart";

class AssistantMessage {
  final String role;
  final String content;

  const AssistantMessage({required this.role, required this.content});

  Map<String, String> toJson() => <String, String>{
        "role": role,
        "content": content,
      };
}

class OpenAiAssistantService {
  final http.Client _http;

  OpenAiAssistantService({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  bool get isConfigured => AppConfig.openAiApiKey.trim().isNotEmpty;

  Future<String> askProjectQuestion({
    required String question,
    required BootstrapResponse snapshot,
    required List<AssistantMessage> history,
  }) async {
    if (!isConfigured) {
      throw Exception("OPENAI_API_KEY missing. Pass it with --dart-define=OPENAI_API_KEY=...");
    }

    final project = snapshot.state.project;
    final tasks = snapshot.state.tasks;
    final risks = snapshot.state.risks;
    final milestones = snapshot.state.milestones;
    final resources = snapshot.state.resources;

    final pendingTasks = tasks.where((t) => t.status != "completed").take(12).toList();
    final blockerLike = tasks
        .where((t) => t.status == "at_risk" || t.progress < 20)
        .take(8)
        .toList();

    final context = StringBuffer()
      ..writeln("Project: ${project.name}")
      ..writeln("Client: ${project.client}")
      ..writeln("Status: ${project.status}, Overall progress: ${snapshot.dashboard.overallProgress}%")
      ..writeln("Budget: ${project.budget}")
      ..writeln("Location: ${project.location}")
      ..writeln("")
      ..writeln("Top pending tasks:")
      ..writeln(
        pendingTasks.isEmpty
            ? "- None"
            : pendingTasks.map((t) => "- ${t.name} | ${t.status} | ${t.progress}% | owner: ${t.assigned}").join("\n"),
      )
      ..writeln("")
      ..writeln("Potential blockers:")
      ..writeln(
        blockerLike.isEmpty
            ? "- None obvious"
            : blockerLike.map((t) => "- ${t.name} | ${t.status} | ${t.progress}%").join("\n"),
      )
      ..writeln("")
      ..writeln("Risks:")
      ..writeln(
        risks.isEmpty ? "- None" : risks.take(8).map((r) => "- ${r.title} (${r.severity})").join("\n"),
      )
      ..writeln("")
      ..writeln("Upcoming milestones:")
      ..writeln(
        milestones.isEmpty ? "- None" : milestones.take(8).map((m) => "- ${m.name} | ${m.date} | ${m.status}").join("\n"),
      )
      ..writeln("")
      ..writeln("Resource snapshot:")
      ..writeln(
        resources.isEmpty
            ? "- None"
            : resources
                .take(8)
                .map((r) => "- ${r.name} (${r.role}) allocated ${r.allocated}% / capacity ${r.capacity}%")
                .join("\n"),
      );

    final memoryWindow = history.length > 10 ? history.sublist(history.length - 10) : history;
    final payload = <String, dynamic>{
      "model": AppConfig.openAiModel,
      "temperature": 0.2,
      "messages": [
        {
          "role": "system",
          "content":
              "You are a project controls AI assistant. Answer using only provided project context. If data is missing, say so clearly. Format output in short sections: Summary, Pending Tasks, Blockers, Recommended Actions."
        },
        ...memoryWindow.map((m) => m.toJson()),
        {
          "role": "user",
          "content": "Project context:\n${context.toString()}\n\nQuestion: $question",
        },
      ]
    };

    final response = await _http.post(
      Uri.parse("https://api.openai.com/v1/chat/completions"),
      headers: <String, String>{
        "Content-Type": "application/json",
        "Authorization": "Bearer ${AppConfig.openAiApiKey}",
      },
      body: jsonEncode(payload),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(data["error"]?["message"]?.toString() ?? "OpenAI request failed.");
    }

    final choices = data["choices"] as List<dynamic>? ?? <dynamic>[];
    final first = choices.isEmpty ? null : choices.first as Map<String, dynamic>;
    final message = first?["message"] as Map<String, dynamic>?;
    return (message?["content"] ?? "").toString().trim();
  }
}
