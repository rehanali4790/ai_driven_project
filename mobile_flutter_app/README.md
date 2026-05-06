# Mobile Flutter App

Project dashboard and agentic AI assistant client for the existing Node backend.

## Features

- Multi-tab clean interface: `Overview`, `Tasks`, `WBS`, `Resources`, `Milestones/Risks`, `AI Assistant`, `Documents`
- Project overview KPI cards and charts (pie + bar) for progress/throughput visibility
- AI assistant tab backed by `/api/ai/chat` with confidence + source chips
- API contract aligned to backend schema from `server/types.ts`

## Prerequisites

- Flutter SDK installed
- Existing backend running from repository root (`server/index.ts` app)
- On Windows, enable Developer Mode for Flutter plugin symlink support:
  - Run: `start ms-settings:developers`

## Run Backend

From repository root:

```bash
pnpm install
pnpm dev
```

Default backend URL is `http://localhost:8787`.

## Run Flutter App

From `mobile_flutter_app`:

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:8787
```

## Runtime Configuration

Use `--dart-define` values:

- `API_BASE_URL` (default: `http://localhost:8787`)
- `API_ACTOR_ROLE` (default: `admin`)
- `API_ACTOR_NAME` (default: `SYSTEM_ADMIN`)
- `OPENAI_API_KEY` (required for dedicated Flutter AI assistant)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)

Example:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://localhost:8787 \
  --dart-define=API_ACTOR_ROLE=manager \
  --dart-define=API_ACTOR_NAME=MOBILE_PM \
  --dart-define=OPENAI_API_KEY=sk-... \
  --dart-define=OPENAI_MODEL=gpt-4o-mini
```

## Validation

```bash
flutter analyze
flutter test
```
