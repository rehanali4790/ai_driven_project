import "package:fl_chart/fl_chart.dart";
import "package:flutter/material.dart";

import "../../core/network/api_client.dart";
import "../../core/theme/app_theme.dart";
import "../../shared/models/project_models.dart";

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiClient _api = ApiClient();
  final TextEditingController _questionController = TextEditingController();
  late Future<BootstrapResponse> _bootstrap;
  final List<_AssistantMessage> _conversation = <_AssistantMessage>[];
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

  Future<void> _switchProject(String projectId) async {
    setState(() {
      _bootstrap = _api.activateProject(projectId);
    });
  }

  Future<void> _openProjectPicker(BootstrapResponse data) async {
    final projects = data.workspace?.projectList ?? <ProjectListEntry>[];
    if (projects.isEmpty) return;
    String query = "";
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final filtered = projects
                .where((project) => project.name.toLowerCase().contains(query.toLowerCase()))
                .toList();
            final maxHeight = MediaQuery.of(context).size.height * 0.75;
            return SizedBox(
              height: maxHeight,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.borderColorDark,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                    Text(
                      "Switch Project",
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      onChanged: (value) => setModalState(() => query = value),
                      decoration: const InputDecoration(
                        hintText: "Search project...",
                        prefixIcon: Icon(Icons.search_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: ListView.separated(
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final project = filtered[index];
                          final active = project.id == data.workspace?.activeProjectId;
                          return ListTile(
                            onTap: () {
                              Navigator.of(context).pop();
                              _switchProject(project.id);
                            },
                            contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                            leading: Icon(
                              active ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                              color: active ? AppTheme.primary : AppTheme.textTertiary,
                            ),
                            title: Text(
                              project.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: active ? AppTheme.textPrimary : AppTheme.textSecondary,
                                    fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                                  ),
                            ),
                            subtitle: Text("ID: ${project.id}"),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _askQuestion() async {
    final question = _questionController.text.trim();
    if (question.isEmpty) return;
    setState(() {
      _asking = true;
      _chatError = null;
    });
    try {
      final userMessage = _AssistantMessage(role: "user", content: question);
      setState(() => _conversation.add(userMessage));
      final result = await _api.askQuestion(question);
      setState(() {
        _conversation.add(_AssistantMessage(role: "assistant", content: result.answer));
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
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            ),
          );
        }
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: AppTheme.error),
                  const SizedBox(height: 16),
                  Text(
                    "Failed to load data",
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "${snapshot.error}",
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: _refresh,
                    icon: const Icon(Icons.refresh),
                    label: const Text("Retry"),
                  ),
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
              backgroundColor: Colors.white,
              title: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.lightTeal,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.description,
                      color: AppTheme.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          "InfraMind",
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: AppTheme.textPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        Text(
                          "ENTERPRISE",
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: AppTheme.textTertiary,
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              actions: [
                Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.lightTeal,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppTheme.lightTealBorder,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppTheme.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "ACTIVE",
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: AppTheme.primary,
                            ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _refresh,
                  icon: const Icon(Icons.refresh_rounded),
                  tooltip: "Refresh",
                ),
                if ((data.workspace?.projectList.length ?? 0) > 1)
                  IconButton(
                    tooltip: "Switch Project",
                    onPressed: () => _openProjectPicker(data),
                    icon: const Icon(Icons.swap_horiz_rounded),
                  ),
              ],
              bottom: const TabBar(
                isScrollable: false,
                indicatorColor: AppTheme.primary,
                labelColor: AppTheme.primary,
                unselectedLabelColor: AppTheme.textTertiary,
                tabs: [
                  Tab(text: "DASHBOARD"),
                  Tab(text: "AI ASSISTANT"),
                ],
              ),
            ),
            body: TabBarView(
              children: [
                _OverviewTab(data: data),
                _AiTab(
                  controller: _questionController,
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
    final runningTasks = data.state.tasks
        .where((task) => task.status == "in_progress" || task.status == "at_risk")
        .toList();
    return RefreshIndicator(
      onRefresh: () async {},
      color: AppTheme.primary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Project Header Card - Dark Theme
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              color: AppTheme.darkBackground,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.folder_special_rounded,
                        color: AppTheme.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            project.name,
                            style: Theme.of(context).textTheme.displaySmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "DELIVERY WORKSPACE",
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: AppTheme.primary,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  project.description,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: const Color(0xFFA0C4C2),
                      ),
                ),
                if (data.workspace != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.play_circle_fill_rounded, color: AppTheme.primary, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "Running Project: ${project.name}",
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          "${data.workspace!.projectList.length} total",
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                color: const Color(0xFFA0C4C2),
                              ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.play_circle_rounded, color: AppTheme.primary, size: 20),
                      const SizedBox(width: 8),
                      Text("Running Tasks", style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (runningTasks.isEmpty)
                    Text("No running tasks in this project.", style: Theme.of(context).textTheme.bodySmall)
                  else
                    ...runningTasks.take(6).map(
                          (task) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    task.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                          color: AppTheme.textPrimary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  "${task.progress}%",
                                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                        color: task.status == "at_risk"
                                            ? AppTheme.error
                                            : AppTheme.primary,
                                      ),
                                ),
                              ],
                            ),
                          ),
                        ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          
          // Stats Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final cardWidth = (constraints.maxWidth - 12) / 2;
              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _KpiCard(
                    width: cardWidth,
                    label: "OVERALL PROGRESS",
                    value: "${stats.overallProgress}%",
                    icon: Icons.trending_up_rounded,
                    trend: "${data.state.documents.length} docs",
                    isPositive: true,
                  ),
                  _KpiCard(
                    width: cardWidth,
                    label: "TASKS COMPLETED",
                    value: "${stats.tasksCompleted}/${stats.totalTasks}",
                    icon: Icons.check_circle_rounded,
                    trend: "${stats.inProgress} active",
                    isPositive: true,
                  ),
                  _KpiCard(
                    width: cardWidth,
                    label: "RESOURCE LOAD",
                    value: "${stats.resourceUtilization}%",
                    icon: Icons.people_rounded,
                    trend: "${data.state.resources.length} resources",
                    isPositive: true,
                  ),
                  _KpiCard(
                    width: cardWidth,
                    label: "OVERDUE TASKS",
                    value: "${stats.overdueTasks}",
                    icon: Icons.warning_rounded,
                    trend: "${stats.criticalTasks} critical",
                    isPositive: stats.overdueTasks == 0,
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),
          
          // Charts Section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.lightTeal,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.pie_chart_rounded,
                          color: AppTheme.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        "Task Distribution",
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 200,
                    child: PieChart(
                      PieChartData(
                        sectionsSpace: 3,
                        centerSpaceRadius: 50,
                        sections: [
                          PieChartSectionData(
                            value: stats.tasksCompleted.toDouble(),
                            title: "${stats.tasksCompleted}",
                            color: AppTheme.statusCompleted,
                            radius: 50,
                            titleStyle: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          PieChartSectionData(
                            value: stats.inProgress.toDouble(),
                            title: "${stats.inProgress}",
                            color: AppTheme.statusInProgress,
                            radius: 50,
                            titleStyle: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          PieChartSectionData(
                            value: (stats.totalTasks - stats.tasksCompleted - stats.inProgress)
                                .clamp(0, 9999)
                                .toDouble(),
                            title: "${stats.totalTasks - stats.tasksCompleted - stats.inProgress}",
                            color: AppTheme.statusNotStarted,
                            radius: 50,
                            titleStyle: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _LegendItem(
                        color: AppTheme.statusCompleted,
                        label: "Completed",
                      ),
                      _LegendItem(
                        color: AppTheme.statusInProgress,
                        label: "In Progress",
                      ),
                      _LegendItem(
                        color: AppTheme.statusNotStarted,
                        label: "Pending",
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Bar Chart
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.lightTeal,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.bar_chart_rounded,
                          color: AppTheme.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        "Project Metrics",
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 200,
                    child: BarChart(
                      BarChartData(
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          horizontalInterval: 5,
                          getDrawingHorizontalLine: (value) {
                            return const FlLine(
                              color: AppTheme.borderColor,
                              strokeWidth: 1,
                            );
                          },
                        ),
                        titlesData: FlTitlesData(
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 40,
                              getTitlesWidget: (value, _) {
                                return Text(
                                  value.toInt().toString(),
                                  style: Theme.of(context).textTheme.labelSmall,
                                );
                              },
                            ),
                          ),
                          rightTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                          topTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false),
                          ),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (value, _) {
                                const labels = ["Done", "Active", "Risk", "Late"];
                                if (value.toInt() >= 0 && value.toInt() < labels.length) {
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Text(
                                      labels[value.toInt()],
                                      style: Theme.of(context).textTheme.labelMedium,
                                    ),
                                  );
                                }
                                return const SizedBox();
                              },
                            ),
                          ),
                        ),
                        borderData: FlBorderData(show: false),
                        barGroups: [
                          BarChartGroupData(
                            x: 0,
                            barRods: [
                              BarChartRodData(
                                toY: stats.tasksCompleted.toDouble(),
                                color: AppTheme.statusCompleted,
                                width: 32,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(8),
                                ),
                              ),
                            ],
                          ),
                          BarChartGroupData(
                            x: 1,
                            barRods: [
                              BarChartRodData(
                                toY: stats.inProgress.toDouble(),
                                color: AppTheme.statusInProgress,
                                width: 32,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(8),
                                ),
                              ),
                            ],
                          ),
                          BarChartGroupData(
                            x: 2,
                            barRods: [
                              BarChartRodData(
                                toY: stats.criticalTasks.toDouble(),
                                color: AppTheme.statusAtRisk,
                                width: 32,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(8),
                                ),
                              ),
                            ],
                          ),
                          BarChartGroupData(
                            x: 3,
                            barRods: [
                              BarChartRodData(
                                toY: stats.overdueTasks.toDouble(),
                                color: AppTheme.statusOverdue,
                                width: 32,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(8),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          
          // CTA Footer
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              color: AppTheme.darkBackground,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.auto_awesome_rounded,
                      color: AppTheme.primary,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      "AI-Powered Insights",
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: Colors.white,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  "Ask AI to parse PDFs, regenerate WBS, or identify critical path delays in seconds.",
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: const Color(0xFFA0C4C2),
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final double width;
  final String label;
  final String value;
  final IconData icon;
  final String trend;
  final bool isPositive;

  const _KpiCard({
    required this.width,
    required this.label,
    required this.value,
    required this.icon,
    required this.trend,
    required this.isPositive,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    icon,
                    color: AppTheme.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      label,
                      style: Theme.of(context).textTheme.labelMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    value,
                    style: Theme.of(context).textTheme.displayMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: isPositive
                            ? AppTheme.success.withValues(alpha: 0.1)
                            : AppTheme.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isPositive
                                ? Icons.trending_up_rounded
                                : Icons.trending_down_rounded,
                            size: 12,
                            color: isPositive ? AppTheme.success : AppTheme.error,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              trend,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: isPositive
                                        ? AppTheme.success
                                        : AppTheme.error,
                                    fontSize: 9,
                                  ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({
    required this.color,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                fontSize: 10,
              ),
        ),
      ],
    );
  }
}


class _AiTab extends StatelessWidget {
  final TextEditingController controller;
  final bool asking;
  final List<_AssistantMessage> conversation;
  final String? chatError;
  final VoidCallback onAsk;

  const _AiTab({
    required this.controller,
    required this.asking,
    required this.conversation,
    required this.chatError,
    required this.onAsk,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        // Header Section
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: AppTheme.darkBackground,
            border: Border(
              bottom: BorderSide(
                color: AppTheme.borderColor,
                width: 1,
              ),
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
                child: const Icon(
                  Icons.smart_toy_rounded,
                  color: AppTheme.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "InfraMind Logic Engine",
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          Icons.auto_awesome_rounded,
                          color: AppTheme.primary,
                          size: 12,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          "CONTEXT-AWARE ANALYSIS",
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: const Color(0xFFA0C4C2),
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        
        // Main Content
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Quick Actions
                if (conversation.isEmpty) ...[
                  Text(
                    "QUICK ANALYSIS",
                    style: theme.textTheme.labelMedium,
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _QuickActionChip(
                        icon: Icons.health_and_safety_rounded,
                        label: "Project Status",
                        onTap: () => controller.text = "What is the current status of the project?",
                      ),
                      _QuickActionChip(
                        icon: Icons.warning_rounded,
                        label: "Top Risks",
                        onTap: () => controller.text = "Identify the top risks and suggest mitigations.",
                      ),
                      _QuickActionChip(
                        icon: Icons.check_circle_rounded,
                        label: "Progress Report",
                        onTap: () => controller.text = "Show me the progress of all ongoing tasks.",
                      ),
                      _QuickActionChip(
                        icon: Icons.bolt_rounded,
                        label: "Optimization",
                        onTap: () => controller.text = "How can we optimize resource allocation?",
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
                
                // Chat Messages
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppTheme.borderColorDark,
                      ),
                    ),
                    child: conversation.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(20),
                                  decoration: const BoxDecoration(
                                    color: AppTheme.lightTeal,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.chat_bubble_outline_rounded,
                                    size: 48,
                                    color: AppTheme.primary,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  "Start a Conversation",
                                  style: theme.textTheme.titleMedium,
                                ),
                                const SizedBox(height: 8),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 32),
                                  child: Text(
                                    "Ask about project status, risks, blockers, or resource allocation.",
                                    style: theme.textTheme.bodySmall,
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: conversation.length,
                            itemBuilder: (context, index) {
                              final msg = conversation[index];
                              return _ChatBubble(message: msg);
                            },
                          ),
                  ),
                ),
                const SizedBox(height: 16),
                
                // Input Section
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppTheme.borderColorDark,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 15,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: controller,
                          maxLines: null,
                          decoration: InputDecoration(
                            hintText: "Query project state, risks, or artifacts...",
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            hintStyle: theme.textTheme.bodyMedium?.copyWith(
                              color: AppTheme.textTertiary,
                            ),
                          ),
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Container(
                        margin: const EdgeInsets.only(right: 4),
                        child: FilledButton(
                          onPressed: asking ? null : onAsk,
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.all(12),
                            minimumSize: const Size(48, 48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: asking
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.send_rounded, size: 20),
                        ),
                      ),
                    ],
                  ),
                ),
                if (chatError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      chatError!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppTheme.error,
                      ),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Center(
                    child: Text(
                      "AI ANALYSIS IS BASED ON EXTRACTED DOCUMENT CONTEXT",
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontSize: 9,
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QuickActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.lightTeal,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.lightTealBorder,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: AppTheme.primary,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppTheme.textPrimary,
                    fontSize: 11,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final _AssistantMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == "user";
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          color: isUser ? AppTheme.darkBackground : AppTheme.lightTeal,
          border: isUser
              ? null
              : Border.all(
                  color: AppTheme.lightTealBorder,
                ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _PrettyText(
              text: message.content,
              color: isUser ? Colors.white : AppTheme.textPrimary,
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  DateTime.now().toString().substring(11, 16),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: isUser
                            ? Colors.white.withValues(alpha: 0.6)
                            : AppTheme.textTertiary,
                        fontSize: 9,
                      ),
                ),
                if (!isUser) ...[
                  const SizedBox(width: 12),
                  const Icon(
                    Icons.volume_up_rounded,
                    size: 12,
                    color: AppTheme.textTertiary,
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.content_copy_rounded,
                    size: 12,
                    color: AppTheme.textTertiary,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AssistantMessage {
  final String role;
  final String content;

  const _AssistantMessage({required this.role, required this.content});
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
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(
                line.replaceFirst(RegExp(r"^[-*]\s*"), "• "),
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: color,
                      height: 1.5,
                      fontWeight: FontWeight.w500,
                    ),
              ),
            ),
          )
          .toList(),
    );
  }
}

