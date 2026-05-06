import "package:flutter/material.dart";
import "package:google_fonts/google_fonts.dart";

import "features/dashboard/dashboard_screen.dart";

void main() {
  runApp(const ProjectDashboardApp());
}

class ProjectDashboardApp extends StatelessWidget {
  const ProjectDashboardApp({super.key});

  @override
  Widget build(BuildContext context) {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF4F46E5)),
    );
    return MaterialApp(
      title: "Project Dashboard AI",
      debugShowCheckedModeBanner: false,
      theme: base.copyWith(
        textTheme: GoogleFonts.interTextTheme(base.textTheme),
        scaffoldBackgroundColor: const Color(0xFFF7F9FC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF111827),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        cardTheme: CardTheme(
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        chipTheme: base.chipTheme.copyWith(
          backgroundColor: const Color(0xFFEEF2FF),
          side: BorderSide.none,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      home: const DashboardScreen(),
    );
  }
}
