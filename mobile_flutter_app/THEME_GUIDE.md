# InfraMind Mobile App - Theme Guide

## Overview
The Flutter mobile app has been updated to match the InfraMind web application's design system. This guide documents the theme implementation and design patterns.

## Color Palette

### Primary Colors
- **Primary Teal**: `#12B3A8` - Main brand color used for buttons, icons, and accents
- **Primary Dark**: `#0E9188` - Darker teal for hover states and emphasis
- **Dark Background**: `#0F3433` - Dark teal background for headers and cards

### Light Backgrounds
- **Light Teal**: `#F0F9F8` - Light teal background for cards and highlights
- **Light Teal Border**: `#E0F2F1` - Border color for light teal elements
- **Pale Teal**: `#E8F8F7` - Very light teal for subtle backgrounds

### Neutral Colors
- **Text Primary**: `#0F3433` - Dark text for headings and important content
- **Text Secondary**: `#6B7280` (Gray-500) - Medium gray for body text
- **Text Tertiary**: `#9CA3AF` (Gray-400) - Light gray for labels and hints
- **Border Color**: `#F3F4F6` (Gray-50) - Very light borders
- **Border Color Dark**: `#E5E7EB` (Gray-100) - Standard borders
- **Card Background**: `#FFFFFF` - White cards
- **Scaffold Background**: `#FAFAFA` - Very light gray app background

### Status Colors
- **Completed**: `#12B3A8` - Teal for completed tasks
- **In Progress**: `#34D399` (Emerald-400) - Green for active tasks
- **Not Started**: `#9CA3AF` (Gray-400) - Gray for pending tasks
- **At Risk**: `#F59E0B` (Amber-400) - Amber for at-risk items
- **Overdue**: `#EF4444` (Red-400) - Red for overdue tasks

### Semantic Colors
- **Success**: `#10B981` - Green for success states
- **Warning**: `#F59E0B` - Amber for warnings
- **Error**: `#EF4444` - Red for errors

## Typography

### Font Family
- **Primary Font**: Inter (via Google Fonts)
- All text uses the Inter font family for consistency

### Text Styles

#### Display (Headers)
- **Display Large**: 28px, Bold (700), -0.5 letter spacing
- **Display Medium**: 24px, Bold (700), -0.5 letter spacing
- **Display Small**: 20px, Bold (700)

#### Titles
- **Title Large**: 18px, Bold (700)
- **Title Medium**: 16px, SemiBold (600)
- **Title Small**: 14px, SemiBold (600)

#### Body
- **Body Large**: 16px, Medium (500)
- **Body Medium**: 14px, Medium (500)
- **Body Small**: 12px, Medium (500)

#### Labels (Uppercase)
- **Label Large**: 13px, Bold (700), 1.5 letter spacing
- **Label Medium**: 11px, ExtraBold (800), 1.5 letter spacing
- **Label Small**: 10px, ExtraBold (800), 1.5 letter spacing

## Design Patterns

### Border Radius
- **Small**: 12px - Chips, small buttons
- **Medium**: 16px - Standard buttons, inputs
- **Large**: 20px - Cards
- **Extra Large**: 28px - Feature cards, hero sections

### Shadows
- **Card Shadow**: `0 2px 15px -3px rgba(0,0,0,0.04)` - Subtle elevation
- **Input Shadow**: `0 2px 15px -3px rgba(0,0,0,0.04)` - Focus state

### Spacing
- **Extra Small**: 4px
- **Small**: 8px
- **Medium**: 12px
- **Large**: 16px
- **Extra Large**: 20px
- **XXL**: 24px
- **XXXL**: 28px

### Component Patterns

#### Cards
- White background
- 20px border radius
- 1px border with `borderColorDark`
- Subtle shadow
- 16-24px padding

#### Buttons
- **Primary (Filled)**: Teal background, white text, 16px radius
- **Secondary (Outlined)**: White background, teal border, 16px radius
- **Text**: No background, teal text
- All buttons use bold (700) text with 0.5 letter spacing

#### Status Badges
- 12px border radius
- Bold uppercase text with 1.5 letter spacing
- Icon + text combination
- Color-coded by status

#### Input Fields
- Light gray background (`#F9FAFB`)
- 16px border radius
- 1px border
- 2px teal border on focus
- 14-16px padding

#### Progress Bars
- Rounded-full (pill shape)
- Height: 8-12px
- Color-coded by progress percentage:
  - 100%: Teal
  - 50-99%: Emerald
  - 0-49%: Amber

## Component Examples

### KPI Card
```dart
Container(
  padding: EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(20),
    border: Border.all(color: AppTheme.borderColorDark),
  ),
  child: Column(
    children: [
      // Icon + Label
      // Value
      // Trend indicator
    ],
  ),
)
```

### Status Badge
```dart
Container(
  padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
  decoration: BoxDecoration(
    color: AppTheme.lightTeal,
    borderRadius: BorderRadius.circular(12),
  ),
  child: Row(
    children: [
      Icon(Icons.check_circle, size: 12),
      SizedBox(width: 6),
      Text('COMPLETED', style: labelMedium),
    ],
  ),
)
```

### Dark Header Card
```dart
Container(
  padding: EdgeInsets.all(24),
  decoration: BoxDecoration(
    color: AppTheme.darkBackground,
    borderRadius: BorderRadius.circular(28),
  ),
  child: Column(
    children: [
      // Icon + Title (white text)
      // Description (light teal text: #A0C4C2)
    ],
  ),
)
```

## Usage

### Importing the Theme
```dart
import 'package:mobile_flutter_app/core/theme/app_theme.dart';
```

### Applying the Theme
```dart
MaterialApp(
  theme: AppTheme.lightTheme,
  // ...
)
```

### Using Theme Colors
```dart
// Direct color access
Container(color: AppTheme.primary)

// Via theme
Theme.of(context).colorScheme.primary
```

### Using Text Styles
```dart
Text(
  'Header',
  style: Theme.of(context).textTheme.displayLarge,
)

Text(
  'LABEL',
  style: Theme.of(context).textTheme.labelMedium,
)
```

## Design Principles

1. **Consistency**: All components follow the same design patterns
2. **Hierarchy**: Clear visual hierarchy through typography and spacing
3. **Accessibility**: High contrast ratios for text readability
4. **Modern**: Clean, minimal design with subtle shadows and borders
5. **Professional**: Enterprise-grade appearance suitable for project management

## Web-to-Mobile Mapping

| Web Component | Mobile Equivalent |
|--------------|-------------------|
| Sidebar | AppBar with tabs |
| Header | AppBar |
| Cards | Card widget with theme |
| Buttons | FilledButton/OutlinedButton |
| Status badges | Custom Container with theme colors |
| Progress bars | LinearProgressIndicator styled |
| Charts | fl_chart with theme colors |
| Input fields | TextField with InputDecoration theme |

## Notes

- The mobile app maintains the same color palette and design language as the web app
- Typography is slightly adjusted for mobile readability
- Spacing is optimized for touch targets (minimum 48x48 dp)
- All interactive elements have appropriate touch feedback
- The theme is fully Material 3 compliant
