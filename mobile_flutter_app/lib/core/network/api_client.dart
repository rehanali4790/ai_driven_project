import "dart:convert";

import "package:http/http.dart" as http;

import "../config/app_config.dart";
import "../../shared/models/project_models.dart";

class ApiClient {
  final http.Client _http;

  ApiClient({http.Client? httpClient}) : _http = httpClient ?? http.Client();

  Uri _uri(String path) => Uri.parse("${AppConfig.baseUrl}$path");

  Map<String, String> get _actorHeaders => <String, String>{
        "x-user-role": AppConfig.actorRole,
        "x-user-name": AppConfig.actorName,
      };

  Future<BootstrapResponse> bootstrap() async {
    final response = await _http.get(_uri("/api/bootstrap"));
    return _decode(response, BootstrapResponse.fromJson);
  }

  Future<ChatResponse> askQuestion(String question) async {
    final response = await _http.post(
      _uri("/api/ai/chat"),
      headers: <String, String>{
        "Content-Type": "application/json",
        ..._actorHeaders,
      },
      body: jsonEncode(<String, dynamic>{"question": question}),
    );
    return _decode(response, ChatResponse.fromJson);
  }

  Future<T> _decode<T>(
    http.Response response,
    T Function(Map<String, dynamic>) parser,
  ) async {
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(data["error"] ?? "Request failed.");
    }
    return parser(data);
  }
}
