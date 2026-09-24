# Exploration: log-screen-add-entry-sheet

Phase 1: Log screen + Add Entry sheet. Engram topic key: `sdd/log-screen-add-entry-sheet/explore` (observation 465).

## Headline findings

1. **The date/time picker renders nothing on web.** `node_modules/@expo/ui/build/community/datetime-picker/DateTimePicker.web.d.ts` declares `DateTimePicker(_props): null`, although the v57 docs page says "Android, iOS, Web". `@react-native-community/datetimepicker` is also native-only. `app.json` has `web.output: "static"`, so web is a configured target. Whether web is in scope for Phase 1 is a blocking question; if yes, a `Platform.OS === 'web'` branch is needed (HTML date/time input or a custom picker).
2. **Docs pages are unreliable for `@expo/ui` web claims.** Cross-check with the installed `.d.ts` files.
3. **Sheet-as-route vs in-screen sheet is coupled to the provider location.** A `formSheet` route is a sibling of `(tabs)`, so the entries provider must live in `src/app/_layout.tsx`. An in-screen `@expo/ui` BottomSheet would allow `(tabs)/_layout.tsx`. Recommend the root layout either way.
4. **Native tabs are `expo-router/unstable-native-tabs` in SDK 57.** Verified locally: `node_modules/expo-router/unstable-native-tabs.js` exists; `expo-router/native-tabs` is SDK 58+. The docs say tab bar height cannot be measured (conflicts with a FAB pinned above the bar), iOS 26 Liquid Glass ignores `tintColor` and `backgroundColor`, and Expo Go support in SDK 57 is undocumented.
5. **"Root of this project" conflicts with the `@/*` alias.** `@/*` maps to `./src/*`, so a repo-root `theme.ts` is outside the alias. Recommend `src/theme.ts` and `src/utils/`; flagged as a user decision.

## Current state

Fresh SDK 57 scaffold.

- `src/app` has only `_layout.tsx` (`<Stack />`) and `index.tsx` (placeholder `Text`).
- No `src/components|screens|hooks|context`, no theme, no utils, no tests.
- `app.json`: `userInterfaceStyle: "automatic"`, scheme `livecoding`, portrait, `web.output: "static"`, plugins `expo-router` and `expo-splash-screen`, experiments `typedRoutes` and `reactCompiler`. No `newArchitecture` key (RN 0.86 is New Architecture only). No `ios/` or `android/` directories (CNG).
- `tsconfig.json`: extends `expo/tsconfig.base`, strict, paths `@/*` -> `./src/*` and `@/assets/*` -> `./assets/*`.
- `eslint.config.js`: flat config with `eslint-config-expo/flat`. No typecheck script; use `npx tsc --noEmit`.
- Installed: expo ~57.0.24, expo-router ~57.0.22, RN 0.86.3, React 19.2.3, @expo/ui ~57.0.19, expo-font, expo-symbols ~57.0.3, expo-glass-effect, gesture-handler ~2.32, reanimated 4.5.1, worklets, safe-area-context ~5.7, screens ~4.26, react-native-web ~0.21.
- Not installed: `@react-native-community/datetimepicker`, `@expo/vector-icons`, `@gorhom/bottom-sheet`, Google font packages, any test runner.
- Assets: no fonts; scaffold tab-icon PNGs only.

## SDK 57 verification

- **JS Tabs:** `import { Tabs } from 'expo-router'`; `src/app/(tabs)/_layout.tsx` + `index.tsx` + `analysis.tsx`; options `tabBarIcon`, `tabBarActiveTintColor`, `tabBarStyle`, `headerShown`.
- **formSheet:** `presentation: 'formSheet'`, `sheetAllowedDetents` (numeric 0-1 array or `'fitToContents'`), `sheetGrabberVisible` (iOS only), `sheetInitialDetentIndex`, `sheetCornerRadius`, `sheetLargestUndimmedDetentIndex`. Android: max 3 detents, no native header, no nested navigators. `fitToContents` forbids `flex: 1` (numeric detents allow it since SDK 55). Web needs manual dismiss (`router.canGoBack()`).
- **`@expo/ui` universal BottomSheet** (verified in `types.d.ts`): `isPresented`, `onDismiss`, `snapPoints` (`'half' | 'full' | {fraction} | {height}`; Android snaps to nearest half/full), `showDragIndicator`, `contentPadding`, `containerColor`, Android-only `scrimColor`, `shouldDismissOnBackPress`, `shouldDismissOnClickOutside`. Needs a `Host`. Children are RN views. Non-native default implementation (no `.web` suffix), so web is plausible but not runtime verified. Wrap overflow in `ScrollView`.
- **Pickers:** `@expo/ui/community/datetime-picker` (`value`, `mode` date|time|datetime, `onValueChange`, `onDismiss` Android only, `presentation` inline|dialog Android only, default dialog, so the dialog opens on mount and the caller must unmount it; `display`, `accentColor`, `is24Hour`). Installed, works in Expo Go, null on web.
- **Fonts:** `useFonts` works in Expo Go; the config plugin needs a dev build. System families via `Platform.select` (iOS Georgia/Menlo, Android serif/monospace, web Georgia/ui-monospace).
- **Icons:** the installed `expo-symbols` build has an Android/web implementation (`SymbolView.js` maps `name.android` / `name.web` to a Material Symbols font loaded asynchronously, so the first paint is empty). A plain string name renders on iOS only, otherwise `fallback`. Material names `bedtime` and `monitor_heart` exist in `build/android/symbols.json`; a clipboard glyph (e.g. `assignment`) is unconfirmed. iOS SF names to confirm: `moon`, `list.clipboard`, `waveform.path.ecg`.

## Design recommendations

1. **State:** React context provider in `src/app/_layout.tsx`, `useState` + `useEntries()` hook (throws outside the provider). React Compiler is on: do not hand-roll `useMemo` / `useCallback`.
2. **Model:** `SleepEntry { id, date 'YYYY-MM-DD' (sleep-start date), sleepTime 'HH:mm', wakeTime 'HH:mm', notes?, createdAt }`. Serializable strings for future persistence. Derive `durationMinutes`: `wake > sleep ? wake - sleep : wake + 1440 - sleep` (overnight); equal is invalid. Sort newest first by date, sleepTime, createdAt.
3. **Structure:** `src/app` (thin routes), `src/screens/<name>`, `src/components`, `src/context`, `src/hooks` (if needed), `src/theme.ts`, `src/utils` (date, duration, id).
4. **Analysis tab:** trivial placeholder.
5. **Validation:** date/sleep/wake required; equal invalid; wake < sleep means overnight with a duration preview; notes trimmed with a cap; future-date rule is an open question; Save disabled / inline error until valid.
6. **Theme:** `src/theme.ts` (recommended) vs repo-root `theme.ts` (needs a tsconfig `paths` tweak). Contents: colors (indigo accent, tinted latest-card bg/border, text primary/secondary/muted, divider, surface, overlay, error), fonts (serif for times/titles, mono for labels, sans body via `Platform.select`), spacing scale, radii (card, pill, FAB, sheet), typography presets (caps label with letter-spacing, time, title), layout constants (FAB size/offset). Light-only recommended (wireframes are light; `userInterfaceStyle: "automatic"` conflicts).
7. **Sheet:** `formSheet` route recommended (zero deps, native dim/swipe/Android back, keeps route thin); numeric detents, not `fitToContents`; draw the handle in-screen on Android; fallback is `@expo/ui` BottomSheet inside LogScreen.
8. **Fonts/icons:** system fonts + `expo-symbols` with `{ios, android, web}` names and a `fallback`.

## Approaches

**Tabs**

| Approach | Effort | Notes |
|---|---|---|
| A. JS `Tabs` (recommended) | Low | Stable, fully styleable, Expo Go and web, FAB placement feasible |
| B. Native tabs (`unstable-native-tabs`) | Medium | Unmeasurable bar height, Liquid Glass ignores tint, churn at SDK 58, Expo Go undocumented |
| C. Headless `expo-router/ui` | High | Only for pixel-matching the wireframe |

**Sheet**

| Approach | Effort | Notes |
|---|---|---|
| 1. `formSheet` route (recommended) | Low-Medium | No new dependency; native dim, swipe-down, Android back |
| 2. `@expo/ui` BottomSheet | Medium | Needs `Host`, Android snap collapse, web unverified |
| 3. RN `Modal` custom | Medium-High | Hand-rolled drag, dim, keyboard handling |
| 4. `@gorhom/bottom-sheet` | Medium | New dependency, Reanimated 4 compatibility unverified, against "prefer Expo modules" |

**Date/time**

| Approach | Effort | Notes |
|---|---|---|
| i. `@expo/ui` picker | Low | No web |
| ii. `@react-native-community/datetimepicker` | Low | Extra dependency, no web |
| iii. Custom picker | Medium | |
| iv. Hybrid native + web HTML input (recommended if web in scope) | Medium | |

## Risks

- Web: picker is null, `formSheet` has no native chrome on web, symbols load an async font.
- Android: picker dialog layered over the `formSheet` is unverified; `formSheet` limits (no grabber, 3 detents, no header); keyboard handling for the notes `TextInput` inside the sheet.
- `typedRoutes`: `.expo/types/router.d.ts` is generated by the dev server, so `npx tsc --noEmit` on a fresh clone may not resolve new routes until `npx expo start` has run once. Add to tasks/verify prerequisites.
- React Compiler is enabled.
- SDK 57 docs vs shipped code mismatches.
- No test runner: verification is lint + tsc + manual.
- Scope creep into Phase 2: charts, persistence, edit/delete, baby profile.
- Dark mode vs light-only wireframes; "THIS WEEK" grouping rule undefined.
- 800-line budget: estimate 600-900 authored lines, moderate to high risk. Levers: trivial Analysis placeholder, no web branch, system fonts, single `FormField`. Otherwise plan two work units (foundation: theme/utils/context/tabs; feature: log UI + sheet).

## Open questions

1. Theme/utils location: `src/` or repo root?
2. Is web in scope for Phase 1?
3. Confirm JS `Tabs`.
4. Confirm the `formSheet` route vs in-screen `@expo/ui` BottomSheet.
5. Dark mode: light-only or add tokens?
6. Fonts: system or bundled?
7. Icons: `expo-symbols` or add `@expo/vector-icons`?
8. Date constraints: future dates, duplicates, sleep == wake?
9. "THIS WEEK" label and "Mia · 4mo" badge: static or derived?
10. Seed data or start empty?
11. Is a bare Analysis placeholder acceptable?

## Ready for proposal

Yes, after relaying open questions 1-4.
