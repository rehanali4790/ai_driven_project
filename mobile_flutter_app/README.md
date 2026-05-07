# InfraMind Mobile App

A Flutter mobile application for the InfraMind project management platform, featuring AI-powered insights and real-time project tracking.

## 🎨 Design System

This app follows the **InfraMind Enterprise** design system, matching the web application's visual identity:

- **Primary Color**: Teal (`#12B3A8`)
- **Typography**: Inter font family
- **Components**: Material Design 3 with custom theming
- **Status System**: Color-coded project states

## ✨ Features

### Dashboard
- **Project Overview**: Real-time project statistics and KPIs
- **Visual Analytics**: Interactive charts (pie charts, bar charts)
- **Status Tracking**: Color-coded task status indicators
- **Progress Monitoring**: Visual progress bars and metrics
- **Trend Analysis**: Performance trends with indicators

### AI Assistant
- **Conversational AI**: Chat with InfraMind Logic Engine
- **Quick Actions**: Pre-defined queries for common tasks
- **Context-Aware**: Analyzes project documents and data
- **Real-Time Insights**: Instant answers about project status
- **History**: Maintains conversation context

## 📱 Screenshots

### Dashboard Tab
- Project header with branding
- KPI cards with icons and trends
- Task distribution pie chart
- Project metrics bar chart
- AI insights CTA

### AI Assistant Tab
- Branded header
- Quick action chips
- Chat interface
- Modern input field
- Empty state guidance

## 🚀 Getting Started

### Prerequisites
- Flutter SDK 3.5.4 or higher
- Dart SDK (included with Flutter)
- Android Studio / Xcode for mobile development

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile_flutter_app
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Run the app**
   ```bash
   flutter run
   ```

For detailed setup instructions, see [SETUP.md](SETUP.md).

## 🎯 Configuration

The app uses environment variables for configuration:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://your-api:8787 \
  --dart-define=OPENAI_API_KEY=your_key \
  --dart-define=API_ACTOR_ROLE=admin \
  --dart-define=API_ACTOR_NAME=YOUR_NAME
```

### Default Values
- `API_BASE_URL`: `http://localhost:8787`
- `API_ACTOR_ROLE`: `admin`
- `API_ACTOR_NAME`: `SYSTEM_ADMIN`
- `OPENAI_API_KEY`: (empty)
- `OPENAI_MODEL`: `gpt-4o-mini`

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Installation and setup guide
- **[THEME_GUIDE.md](THEME_GUIDE.md)** - Comprehensive theme documentation
- **[THEME_UPDATE_SUMMARY.md](THEME_UPDATE_SUMMARY.md)** - Recent theme updates
- **[VISUAL_COMPARISON.md](VISUAL_COMPARISON.md)** - Web vs mobile design comparison

## 🏗️ Project Structure

```
lib/
├── core/
│   ├── config/
│   │   └── app_config.dart          # Configuration
│   ├── network/
│   │   └── api_client.dart          # API client
│   └── theme/
│       └── app_theme.dart           # Theme system
├── features/
│   ├── ai/
│   │   └── openai_assistant_service.dart
│   └── dashboard/
│       └── dashboard_screen.dart    # Main screen
├── shared/
│   └── models/
│       └── project_models.dart      # Data models
└── main.dart                        # Entry point
```

## 🎨 Theme System

The app uses a centralized theme system (`AppTheme`) that provides:

- **Color Palette**: Primary, status, and semantic colors
- **Typography**: Inter font with consistent styles
- **Component Themes**: Cards, buttons, inputs, etc.
- **Spacing System**: Consistent padding and margins

Example usage:
```dart
// Colors
Container(color: AppTheme.primary)

// Typography
Text('Header', style: Theme.of(context).textTheme.displayLarge)

// Components automatically use theme
FilledButton(onPressed: () {}, child: Text('Button'))
```

## 🔧 Development

### Hot Reload
Press `r` in terminal while running to hot reload changes.

### Code Analysis
```bash
flutter analyze
```

### Running Tests
```bash
flutter test
```

### Building for Production

**Android APK:**
```bash
flutter build apk --release
```

**iOS (macOS only):**
```bash
flutter build ios --release
```

## 📦 Dependencies

- **flutter**: Flutter SDK
- **cupertino_icons**: iOS-style icons
- **fl_chart**: Chart library for data visualization
- **google_fonts**: Inter font family
- **http**: HTTP client for API calls
- **intl**: Internationalization and formatting

## 🎯 Key Features

### Design System
✅ Matches web application design  
✅ Consistent color palette  
✅ Professional typography  
✅ Custom component styling  
✅ Status color coding  

### User Experience
✅ Intuitive navigation  
✅ Real-time data updates  
✅ Interactive charts  
✅ AI-powered insights  
✅ Responsive layouts  

### Technical
✅ Material Design 3  
✅ Clean architecture  
✅ Type-safe API client  
✅ Environment configuration  
✅ Error handling  

## 🐛 Troubleshooting

### Dependencies not found
```bash
flutter pub get
```

### API connection fails
- Check backend server is running
- Verify `API_BASE_URL` is correct
- For Android emulator: use `http://10.0.2.2:8787`
- For iOS simulator: use `http://localhost:8787`

### AI features not working
Set the `OPENAI_API_KEY` environment variable when running.

For more troubleshooting, see [SETUP.md](SETUP.md).

## 📱 Platform Support

- ✅ Android (API 21+)
- ✅ iOS (iOS 12+)
- 🚧 Web (experimental)
- 🚧 Desktop (experimental)

## 🤝 Contributing

1. Follow the existing code style
2. Use the theme system for all UI components
3. Write meaningful commit messages
4. Test on both Android and iOS
5. Update documentation as needed

## 📄 License

[Your License Here]

## 🔗 Related Projects

- **Web Application**: InfraMind web platform
- **Backend API**: Project management API
- **AI Engine**: OpenAI-powered assistant

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review troubleshooting section
3. Run `flutter doctor` for diagnostics
4. Check Flutter's official documentation

## 🎉 Recent Updates

### Theme System (Latest)
- ✅ Implemented InfraMind design system
- ✅ Added custom theme with teal color palette
- ✅ Updated all components to match web design
- ✅ Improved typography with Inter font
- ✅ Enhanced dashboard with KPI cards
- ✅ Redesigned AI assistant interface
- ✅ Added status badges and indicators
- ✅ Improved chart styling

See [THEME_UPDATE_SUMMARY.md](THEME_UPDATE_SUMMARY.md) for details.

---

**Built with Flutter** 💙 | **Powered by AI** 🤖 | **InfraMind Enterprise** 🏗️
