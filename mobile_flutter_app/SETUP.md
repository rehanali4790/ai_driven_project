# Flutter Mobile App Setup

## Prerequisites
- Flutter SDK installed (3.5.4 or higher)
- Dart SDK (comes with Flutter)
- Android Studio / Xcode (for mobile development)
- VS Code or Android Studio (recommended IDEs)

## Installation Steps

### 1. Install Dependencies
```bash
cd mobile_flutter_app
flutter pub get
```

This will install all required packages:
- `flutter` - Flutter SDK
- `cupertino_icons` - iOS-style icons
- `fl_chart` - Chart library for data visualization
- `google_fonts` - Inter font family
- `http` - HTTP client for API calls
- `intl` - Internationalization and date formatting

### 2. Verify Installation
```bash
flutter doctor
```

This command checks your Flutter installation and shows any missing dependencies.

### 3. Run the App

#### On Android Emulator
```bash
flutter run
```

#### On iOS Simulator (macOS only)
```bash
flutter run -d ios
```

#### On Physical Device
1. Enable USB debugging on your device
2. Connect via USB
3. Run: `flutter run`

### 4. Build for Production

#### Android APK
```bash
flutter build apk --release
```

#### Android App Bundle (for Play Store)
```bash
flutter build appbundle --release
```

#### iOS (macOS only)
```bash
flutter build ios --release
```

## Configuration

### API Configuration
The app uses environment variables for configuration. You can set them when running:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://your-api-url:8787 \
  --dart-define=OPENAI_API_KEY=your_openai_key \
  --dart-define=API_ACTOR_ROLE=admin \
  --dart-define=API_ACTOR_NAME=YOUR_NAME
```

### Default Values
If not specified, the app uses these defaults:
- `API_BASE_URL`: `http://localhost:8787`
- `API_ACTOR_ROLE`: `admin`
- `API_ACTOR_NAME`: `SYSTEM_ADMIN`
- `OPENAI_API_KEY`: (empty - AI features won't work)
- `OPENAI_MODEL`: `gpt-4o-mini`

## Project Structure

```
mobile_flutter_app/
├── lib/
│   ├── core/
│   │   ├── config/
│   │   │   └── app_config.dart          # App configuration
│   │   ├── network/
│   │   │   └── api_client.dart          # API client
│   │   └── theme/
│   │       └── app_theme.dart           # Theme configuration (NEW)
│   ├── features/
│   │   ├── ai/
│   │   │   └── openai_assistant_service.dart
│   │   └── dashboard/
│   │       └── dashboard_screen.dart    # Main dashboard (UPDATED)
│   ├── shared/
│   │   └── models/
│   │       └── project_models.dart      # Data models
│   └── main.dart                        # App entry point (UPDATED)
├── android/                             # Android-specific files
├── ios/                                 # iOS-specific files
├── pubspec.yaml                         # Dependencies
├── THEME_GUIDE.md                       # Theme documentation (NEW)
├── THEME_UPDATE_SUMMARY.md              # Update summary (NEW)
└── SETUP.md                             # This file (NEW)
```

## Theme Updates

The app has been updated to match the InfraMind web application's design system. See:
- `THEME_GUIDE.md` - Comprehensive theme documentation
- `THEME_UPDATE_SUMMARY.md` - Summary of changes

## Troubleshooting

### Issue: Dependencies not found
**Solution**: Run `flutter pub get`

### Issue: Flutter command not found
**Solution**: Add Flutter to your PATH or use the full path to the Flutter executable

### Issue: Android licenses not accepted
**Solution**: Run `flutter doctor --android-licenses` and accept all

### Issue: Xcode not configured (macOS)
**Solution**: Run `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`

### Issue: API connection fails
**Solution**: 
1. Check that the backend server is running
2. Verify the `API_BASE_URL` is correct
3. For Android emulator, use `http://10.0.2.2:8787` instead of `localhost`
4. For iOS simulator, `localhost` should work

### Issue: AI features not working
**Solution**: Set the `OPENAI_API_KEY` environment variable when running the app

## Development Tips

### Hot Reload
Press `r` in the terminal while the app is running to hot reload changes.

### Hot Restart
Press `R` in the terminal to hot restart the app (full restart).

### Debug Mode
The app runs in debug mode by default. For better performance, use release mode:
```bash
flutter run --release
```

### Analyzing Code
```bash
flutter analyze
```

### Running Tests
```bash
flutter test
```

## IDE Setup

### VS Code
1. Install the Flutter extension
2. Install the Dart extension
3. Open the `mobile_flutter_app` folder
4. Press F5 to run with debugging

### Android Studio
1. Install the Flutter plugin
2. Install the Dart plugin
3. Open the `mobile_flutter_app` folder
4. Click the Run button

## Additional Resources

- [Flutter Documentation](https://docs.flutter.dev/)
- [Dart Documentation](https://dart.dev/guides)
- [Material Design 3](https://m3.material.io/)
- [fl_chart Documentation](https://pub.dev/packages/fl_chart)
- [Google Fonts](https://pub.dev/packages/google_fonts)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the theme documentation
3. Check Flutter's official documentation
4. Run `flutter doctor` to diagnose issues
