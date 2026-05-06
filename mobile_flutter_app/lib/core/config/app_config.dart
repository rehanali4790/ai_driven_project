class AppConfig {
  static const String baseUrl =
      String.fromEnvironment("API_BASE_URL", defaultValue: "http://localhost:8787");
  static const String actorRole =
      String.fromEnvironment("API_ACTOR_ROLE", defaultValue: "admin");
  static const String actorName =
      String.fromEnvironment("API_ACTOR_NAME", defaultValue: "SYSTEM_ADMIN");
  static const String openAiApiKey =
      String.fromEnvironment("OPENAI_API_KEY", defaultValue: "");
  static const String openAiModel =
      String.fromEnvironment("OPENAI_MODEL", defaultValue: "gpt-4o-mini");
}
