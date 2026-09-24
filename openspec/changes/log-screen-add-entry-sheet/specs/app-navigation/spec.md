# Delta for app-navigation

## ADDED Requirements

### Requirement: Tab shell

The app MUST present two JS tabs, "Log" and "Analysis", reusing the existing scaffold (Analysis icon: Ionicons `analytics`; Log icon from `@expo/vector-icons`). Log MUST be the initial tab. Analysis MUST render a placeholder only. Behavior MUST be the same on iOS and Android.

#### Scenario: Switch tabs
- GIVEN the app has launched on Log
- WHEN the user taps Analysis, then Log
- THEN the placeholder shows, then the Log screen returns

### Requirement: Route structure

Tab screens MUST live in `src/app/(tabs)/` (tab layout in `(tabs)/_layout.tsx`). The Add Entry sheet MUST be a separate formSheet route outside the tabs. Route files MUST only render screens; UI code lives outside `src/app/`. The entries store MUST be available to both Log and the sheet.

#### Scenario: Shared state across routes
- GIVEN the sheet is open over Log
- WHEN a valid entry is saved
- THEN the Log screen shows it without a reload

#### Scenario: No route collision
- GIVEN the restructure is applied
- WHEN `npx expo start` runs
- THEN there is no duplicate `/` or `/analysis` route warning
