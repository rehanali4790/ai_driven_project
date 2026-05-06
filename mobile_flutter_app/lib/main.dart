import "package:flutter/material.dart";

import "core/theme/app_theme.dart";
import "features/dashboard/dashboard_screen.dart";

void main() {
  runApp(const ProjectDashboardApp());
}

class ProjectDashboardApp extends StatelessWidget {
  const ProjectDashboardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "InfraMind Enterprise",
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const DashboardScreen(),
    );
  }
}
