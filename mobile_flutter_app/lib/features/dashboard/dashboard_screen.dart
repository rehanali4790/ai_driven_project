import "package:fl_chart/fl_chart.dart";
import "package:flutter/material.dart";

import "../../core/network/api_client.dart";
import "../ai/openai_assistant_service.dart";
import "../../shared/models/project_models.dart";

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiClient _api = ApiClient();
  final OpenAiAssistantService _assistant = OpenAiAssistantService();
  final TextEditingController _questionController = TextEditingController();
  late Future<BootstrapResponse> _bootstrap;
  final List<AssistantMessage> _conversation = <AssistantMessage>[];
  bool _asking = false;
  String? _chatError;

  @override
  void initState() {
    super.initState();
    _bootstrap = _api.bootstrap();
  }

  Future<void> _refresh() async {
    setState(() {
      _bootstrap = _api.bootstrap();
    });
  }

  Future<void> _askQuestion() async {
    final question = _questionController.text.trim();
    if (question.isEmpty) return;
    setState(() {
      _asking = true;
      _chatError = null;
    });
    try {
      final snapshot = await _api.bootstrap();
      final userMessage = AssistantMessage(role: "user", content: question);
      setState(() => _conversation.add(userMessage));
      final result = await _assistant.askProjectQuestion(
        question: question,
        snapshot: snapshot,
        history: _conversation,
      );
      setState(() {
        _conversation.add(AssistantMessage(role: "assistant", content: result));
        _questionController.clear();
      });
    } catch (e) {
      setState(() => _chatError = e.toString());
    } finally {
      if (mounted) setState(() => _asking = false);
    }
  }

  @override
  void dispose() {
    _questionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<BootstrapResponse>(
      future: _bootstrap,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text("Failed to load data: ${snapshot.error}"),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _refresh, child: const Text("Retry")),
                ],
              ),
            ),
          );
        }
        final data = snapshot.data!;
        return DefaultTabController(
          length: 2,
          child: Scaffold(
            appBar: AppBar(
              title: Text(data.state.project.name),
              actions: [IconButton(onPressed: _refresh, icon: const Icon(Icons.refresh))],
              bottom: const TabBar(
                isScrollable: true,
                tabs: [
                  Tab(text: "Overview"),
                  Tab(text: "AI Assistant"),
                ],
              ),
            ),
            body: TabBarView(
              children: [
                _OverviewTab(data: data),
                _AiTab(
                  controller: _questionController,
                  openAiConfigured: _assistant.isConfigured,
                  asking: _asking,
                  conversation: _conversation,
                  chatError: _chatError,
                  onAsk: _askQuestion,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _OverviewTab extends StatelessWidget {
  final BootstrapResponse data;

  const _OverviewTab({required this.data});

  @override
  Widget build(BuildContext context) {
    final project = data.state.project;
    final stats = data.dashboard;
    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: const LinearGradient(
                colors: [Color(0xFF3E63DD), Color(0xFF7B61FF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  project.name,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  project.description,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              _KpiCard(label: "Progress", value: "${stats.overallProgress}%"),
              _KpiCard(label: "Completed", value: "${stats.tasksCompleted}/${stats.totalTasks}"),
              _KpiCard(label: "In Progress", value: "${stats.inProgress}"),
              _KpiCard(label: "At Risk", value: "${stats.criticalTasks}"),
              _KpiCard(label: "Overdue", value: "${stats.overdueTasks}"),
              _KpiCard(label: "Resource Utilization", value: "${stats.resourceUtilization}%"),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 220,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: PieChart(
                  PieChartData(
                    sectionsSpace: 2,
                    centerSpaceRadius: 40,
                    sections: [
                      PieChartSectionData(
                        value: stats.tasksCompleted.toDouble(),
                        title: "Done",
                        radius: 40,
                      ),
                      PieChartSectionData(
                        value: stats.inProgress.toDouble(),
                        title: "In-Flight",
                        radius: 40,
                      ),
                      PieChartSectionData(
                        value: (stats.totalTasks - stats.tasksCompleted - stats.inProgress)
                            .clamp(0, 9999)
                            .toDouble(),
                        title: "Pending",
                        radius: 40,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 220,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: BarChart(
                  BarChartData(
                    titlesData: FlTitlesData(
                      leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (value, _) {
                            const labels = ["Done", "In", "Risk", "Overdue"];
                            return Text(labels[value.toInt()]);
                          },
                        ),
                      ),
                    ),
                    barGroups: [
                      BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: stats.tasksCompleted.toDouble())]),
                      BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: stats.inProgress.toDouble())]),
                      BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: stats.criticalTasks.toDouble())]),
                      BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: stats.overdueTasks.toDouble())]),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;

  const _KpiCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 170,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 8),
              Text(value, style: Theme.of(context).textTheme.titleLarge),
            ],
          ),
        ),
      ),
    );
  }
}


class _AiTab extends StatelessWidget {
  final TextEditingController controller;
  final bool openAiConfigured;
  final bool asking;
  final List<AssistantMessage> conversation;
  final String? chatError;
  final VoidCallback onAsk;

  const _AiTab({
    required this.controller,
    required this.openAiConfigured,
    required this.asking,
    required this.conversation,
    required this.chatError,
    required this.onAsk,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: const LinearGradient(
                colors: [Color(0xFF4F46E5), Color(0xFF9333EA)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Ask Project AI",
                  style: theme.textTheme.titleLarge?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  "Beautiful, grounded responses with rolling conversation memory (last 10 turns).",
                  style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white70),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (!openAiConfigured)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                "OPENAI_API_KEY is not configured. Run with --dart-define=OPENAI_API_KEY=your_key",
              ),
            ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ActionChip(
                label: const Text("Project health overview"),
                onPressed: () => controller.text = "What is project health right now?",
              ),
              ActionChip(
                label: const Text("Which tasks are pending?"),
                onPressed: () => controller.text = "Which tasks are pending and why?",
              ),
              ActionChip(
                label: const Text("What are blockers?"),
                onPressed: () => controller.text = "Which tasks are blockers right now and suggested mitigation?",
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: controller,
            maxLines: 3,
            decoration: const InputDecoration(
              hintText: "Ask the project AI assistant...",
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
              onPressed: asking ? null : onAsk,
              icon: const Icon(Icons.smart_toy_outlined),
              label: Text(asking ? "Thinking..." : "Ask AI"),
            ),
          ),
          const SizedBox(height: 12),
          if (chatError != null)
            Text(chatError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 8),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: conversation.isEmpty
                  ? const Center(
                      child: Text("Start chatting: ask about pending tasks, blockers, or project health."),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: conversation.length,
                      itemBuilder: (context, index) {
                        final msg = conversation[index];
                        return _ChatBubble(message: msg);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final AssistantMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == "user";
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        constraints: const BoxConstraints(maxWidth: 360),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: isUser
              ? const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)])
              : const LinearGradient(colors: [Color(0xFFF3F4F6), Color(0xFFE5E7EB)]),
        ),
        child: _PrettyText(
          text: message.content,
          color: isUser ? Colors.white : const Color(0xFF111827),
        ),
      ),
    );
  }
}

class _PrettyText extends StatelessWidget {
  final String text;
  final Color color;

  const _PrettyText({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    final lines = text.split("\n").where((e) => e.trim().isNotEmpty).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: lines
          .map(
            (line) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                line.replaceFirst(RegExp(r"^[-*]\s*"), "• "),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color, height: 1.4),
              ),
            ),
          )
          .toList(),
    );
  }
}

