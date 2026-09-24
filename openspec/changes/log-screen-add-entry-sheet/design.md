# Design: Log Screen + Add Entry Sheet (Phase 1)

> Size note: this artifact intentionally exceeds the generic 800-word design guidance. The binding user directives for this run enumerate required sections (file-by-file plan, token list, utils signatures, form/validation rules, picker and keyboard handling, line budget). Directive wins; prose is kept terse.

## Technical Approach

Four layers, no premature abstraction. Routes in `src/app/` do navigation only; screens in `src/screens/` own layout and `StyleSheet`; four small components in `src/components/`; one React context holds entries in memory. Root `src/app/_layout.tsx` becomes a `Stack` wrapping `EntriesProvider`, registering `(tabs)` and the sibling `add-entry` `formSheet` route. The user's existing `Tabs` config moves verbatim into `src/app/(tabs)/_layout.tsx`.

All Expo APIs below were verified against installed typings, not memory (SDK 57 docs: https://docs.expo.dev/versions/v57.0.0/):

| API | Verified in |
|---|---|
| `presentation: 'formSheet'`, `sheetAllowedDetents` (default `[1.0]`, :642), `sheetInitialDetentIndex`, `sheetCornerRadius`, `sheetGrabberVisible` (iOS-only, default `false`, :691), `sheetLargestUndimmedDetentIndex` (default `'none'` = always dimmed, :709) | `node_modules/expo-router/build/react-navigation/native-stack/types.d.ts:620-711` |
| `DateTimePicker` props (`value`, `mode`, `onValueChange`, `onDismiss` Android-only, `presentation` Android-only default `'dialog'` that opens on mount and must be unmounted by the caller, `display`, `themeVariant` iOS-only, `accentColor`) | `node_modules/@expo/ui/build/community/datetime-picker/types.d.ts:22-125` |
| `Tabs` from `expo-router` (JS tabs) | user's current `src/app/_layout.tsx` |
| FontAwesome6 `sheet-plastic` | `glyphmaps/FontAwesome6Free_meta.json:1739` inside the `"solid"` array (key at :661); `build/FontAwesome6.d.ts` exports `iconSet: any`, so names are runtime-checked only |
| Ionicons `analytics` | `glyphmaps/Ionicons.json:29` |

**Stale premise correction:** the launch brief said the Log `tabBarIcon` has no body and the file does not compile. The working tree already contains a complete `FontAwesome6 name='sheet-plastic'` icon. Only the hard-coded `color='black'` changes.

## Architecture Decisions

| # | Decision | Choice | Rejected alternatives | Rationale |
|---|---|---|---|---|
| 1 | Sheet mechanism | Expo Router `formSheet` route `src/app/add-entry.tsx` | `@expo/ui` BottomSheet in-screen; RN `Modal`; `@gorhom/bottom-sheet` | Zero new deps, native dim/swipe/Android back for free, keeps route thin. Forces the provider into the root layout (sheet is a sibling of `(tabs)`). |
| 2 | Tab navigator | JS `Tabs` from `expo-router` | `expo-router/unstable-native-tabs` | Stable, fully styleable, measurable tab bar (FAB sits above it), Expo Go support certain; native tabs churn at SDK 58. |
| 3 | State | React context + `useState`, in-memory | Zustand/Redux; AsyncStorage | Single writer, single reader, persistence is out of scope (Phase 2). |
| 4 | Ordering | Insertion order, `addEntry` prepends | Sort by `date`/`sleepTime`/`createdAt` on render | Spec requires "most recently added on top"; prepend satisfies it with zero sort code. |
| 5 | List primitive | `ScrollView` + `.map()` | `FlatList` | A session's worth of entries, no virtualization need, fewer lines, simpler FAB overlay. |
| 6 | Picker pattern | Mount `DateTimePicker` only while a field is open; `display={Platform.OS === 'ios' ? 'spinner' : 'default'}` | Always-mounted iOS `compact` field + Android dialog branch | One code path, one conditional prop. iOS renders an inline wheel inside the sheet (no popover clipped by sheet bounds); Android gets its native dialog. |
| 7 | Drag handle | Plain rounded `View` drawn at the top of `AddEntryScreen` | `sheetGrabberVisible` | That prop is iOS-only (`types.d.ts:691`); the wireframe wants a handle on both platforms. One visual, no branch. |
| 8 | Backdrop | Do **not** set `sheetLargestUndimmedDetentIndex` | Setting it to `'none'` explicitly, or to `'last'`/an index | Verified at `types.d.ts:709`: it "defaults to `none`, indicating that the dimming view should be always present" — the wireframe behaviour is already the default, so setting it adds a line that can only go wrong. |
| 9 | Theme | `src/theme.ts`, light only, plain object | Repo-root `theme.ts`; `useColorScheme` dark tokens | `@/*` maps to `./src/*`; wireframes are light-only. |
| 10 | Fonts/icons | System serif/mono via `Platform.select`; `@expo/vector-icons` | Bundled Google fonts; `expo-symbols` | No asset loading, no async glyph font, no dev build. |
| 11 | Memoization | None | `useMemo`/`useCallback` | React Compiler is enabled (`app.json` `experiments.reactCompiler`). |
| 12 | Route deletions | `src/app/index.tsx` and `src/app/analysis.tsx` are **removed**, not kept | Leaving them in place | Load-bearing: `src/app/index.tsx` and `src/app/(tabs)/index.tsx` both resolve to `/`, and both `analysis.tsx` files to `/analysis`. Keeping them is a route collision, not clutter. |

## Data Flow

```
        EntriesProvider (src/app/_layout.tsx)
        state: SleepEntry[]  (empty at launch)
              |                      ^
   useEntries().entries         addEntry(input)
              v                      |
   (tabs)/index -> LogScreen    add-entry -> AddEntryScreen
        |  ScrollView                 |  local form state
        |  -> EntryCard[]             |  validate -> addEntry() -> router.back()
        |  -> empty state             |
        +-> Fab -> router.push('/add-entry')
```

Sheet save sequence: `Save` press -> validate (`sleepTime !== wakeTime`) -> on failure set inline `error`, stay open -> on success `addEntry({date, sleepTime, wakeTime, notes})` (provider stamps `id`, `createdAt` and prepends) -> `router.back()` -> the sheet dismisses and `LogScreen` re-renders with the new entry at the top, highlighted.

## Component Tree

```
RootLayout (Stack, headerShown:false)
└─ EntriesProvider
   ├─ (tabs) ── TabsLayout (Tabs, headerShown:false, activeTintColor: accent)
   │   ├─ index    → LogScreen
   │   │             ├─ header: "Mia · 4mo" badge + "THIS WEEK" caps label (static)
   │   │             ├─ ScrollView → EntryCard[] (index 0 highlighted) | inline empty state
   │   │             └─ Fab (absolute, bottom-right)
   │   └─ analysis → AnalysisScreen (placeholder)
   └─ add-entry (formSheet) → AddEntryScreen
       ├─ handle View + title + Cancel
       ├─ PickerField (date) / PickerField (sleep) / PickerField (wake)
       ├─ notes TextInput (multiline, maxLength 280)
       ├─ duration preview + error text
       └─ Save button
```

## File Changes

Line counts are authored estimates (`additions` / `deletions`), used for the review budget.

| File | Action | Purpose | +/- |
|---|---|---|---|
| `src/theme.ts` | Create | Design tokens | 60 / 0 |
| `src/utils/format.ts` | Create | Date/time/duration conversion + formatting | 55 / 0 |
| `src/utils/id.ts` | Create | `createId()` | 6 / 0 |
| `src/context/entries-context.tsx` | Create | `SleepEntry` type, `EntriesProvider`, `useEntries()` | 50 / 0 |
| `src/app/_layout.tsx` | Modify | `Stack` + provider; registers `(tabs)` and `add-entry` formSheet | 28 / 27 |
| `src/app/(tabs)/_layout.tsx` | Create | User's `Tabs` config, moved verbatim; Log icon uses `color`/`focused` | 32 / 0 |
| `src/app/(tabs)/index.tsx` | Create | Thin route → `LogScreen` | 6 / 0 |
| `src/app/(tabs)/analysis.tsx` | Create | Thin route → `AnalysisScreen` | 6 / 0 |
| `src/app/add-entry.tsx` | Create | Thin route → `AddEntryScreen` | 6 / 0 |
| `src/app/index.tsx` | Delete | Route collision with `(tabs)/index.tsx` | 0 / 18 |
| `src/app/analysis.tsx` | Delete | Route collision with `(tabs)/analysis.tsx` | 0 / 11 |
| `src/screens/log/LogScreen.tsx` | Create | Header, list, empty state, FAB mount | 115 / 0 |
| `src/screens/analysis/AnalysisScreen.tsx` | Create | Placeholder | 15 / 0 |
| `src/screens/add-entry/AddEntryScreen.tsx` | Create | Form, validation, keyboard handling, save | 160 / 0 |
| `src/components/EntryCard.tsx` | Create | Date, times, duration pill, duration bar, notes, highlight | 100 / 0 |
| `src/components/Fab.tsx` | Create | Circular action button | 35 / 0 |
| `src/components/PickerField.tsx` | Create | Label + value row + mount-on-tap `DateTimePicker` | 70 / 0 |

**Totals: ~744 additions + ~56 deletions ≈ 800 churn.** Realistic range **740–880** (RN `StyleSheet` blocks are the variance). Budget risk **Medium-High** against the cached 800-line `single-pr` budget. Levers to land near ~750: fold `Fab` into `LogScreen` (-25), `AnalysisScreen` at ~8 lines (-7), share one styles block in `EntryCard` (-15). Exceeding 800 under `single-pr` requires an explicit `size:exception` before apply. `sdd-tasks` owns the final forecast and guard lines.

## Interfaces / Contracts

```ts
// src/context/entries-context.tsx
export type SleepEntry = {
  id: string;
  date: string;       // 'YYYY-MM-DD' — sleep-start date
  sleepTime: string;  // 'HH:mm'
  wakeTime: string;   // 'HH:mm'
  notes?: string;
  createdAt: string;  // ISO
};
export type NewSleepEntry = Omit<SleepEntry, 'id' | 'createdAt'>;
export function EntriesProvider(props: { children: React.ReactNode }): React.ReactElement;
export function useEntries(): { entries: SleepEntry[]; addEntry: (input: NewSleepEntry) => void };
// addEntry prepends; useEntries throws outside the provider.

// src/utils/format.ts
export function toMinutes(time: string): number;                           // '06:30' -> 390
export function durationMinutes(sleepTime: string, wakeTime: string): number; // wake > sleep ? wake - sleep : wake + 1440 - sleep
export function formatDuration(minutes: number): string;                   // 515 -> '8h 35m'
export function formatTime(time: string): string;                          // '21:45' -> '9:45 PM'
export function formatDateLabel(date: string): string;                     // '2026-09-21' -> 'Sun, Sep 21'
export function toDateString(d: Date): string;                             // local Date -> 'YYYY-MM-DD'
export function toTimeString(d: Date): string;                             // local Date -> 'HH:mm'
export function fromDateString(date: string): Date;                        // picker value
export function fromTimeString(time: string): Date;                        // today at 'HH:mm', picker value

// src/utils/id.ts
export function createId(): string; // `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
```

### Theme tokens (`src/theme.ts`)

```ts
colors:   background #FAFAFA · surface #FFFFFF · accent #4F46E5 · accentSoft #EEF2FF
          border #E5E7EB · track #E5E7EB · textPrimary #111827 · textSecondary #6B7280
          textMuted #9CA3AF · error #DC2626
fonts:    serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' })
          mono  = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
spacing:  xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32
radius:   card 16 · pill 999 · fab 28 · sheet 24 · bar 3
text:     caps { fontFamily: mono, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }
          time { fontFamily: serif, fontSize: 28 } · title { fontFamily: serif, fontSize: 22 }
          body { fontSize: 15 }
layout:   fabSize 56 · fabOffset 20 · listBottomPadding 112
          durationBarHeight 6 · DURATION_BAR_MAX_MINUTES 720
```

### Route options

```tsx
// src/app/_layout.tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen
    name="add-entry"
    options={{
      presentation: 'formSheet',
      sheetAllowedDetents: [0.85],   // numeric detent => flex: 1 is allowed; Android max 3
      sheetInitialDetentIndex: 0,
      sheetCornerRadius: theme.radius.sheet,
      headerShown: false,            // Android formSheet has no native header anyway
    }}
  />
</Stack>
```

`headerShown: false` on the root `Stack` is required: without it the root renders a header above the tab navigator (double header) and above the sheet. `(tabs)/_layout.tsx` also sets `headerShown: false` because each screen draws its own header. Tab icons use the render props: `tabBarIcon: ({ color }) => <FontAwesome6 name='sheet-plastic' size={22} color={color} />` and the same shape for Ionicons `analytics`; `tabBarActiveTintColor: theme.colors.accent`.

## Form State and Validation

```ts
const [date, setDate]           = useState(() => toDateString(new Date()));
const [sleepTime, setSleepTime] = useState('20:00');
const [wakeTime, setWakeTime]   = useState('06:30');
const [notes, setNotes]         = useState('');
const [error, setError]         = useState<string | null>(null);
const [openField, setOpenField] = useState<'date' | 'sleep' | 'wake' | null>(null);
```

Rules:
1. All three of `date`, `sleepTime`, `wakeTime` are always populated (sensible defaults), so "missing field" is a defensive guard only.
2. `sleepTime === wakeTime` is **invalid** — error "Sleep and wake time can't be the same." Save stays pressable but blocks and shows the inline error (simpler than disabled-button state, and gives visible feedback per the success criteria).
3. `wakeTime < sleepTime` is **valid** and means overnight; duration uses the `+1440` branch.
4. Future dates and duplicate entries are **allowed** — no rule.
5. `notes` is trimmed; empty string is stored as `undefined`; `maxLength={280}` on the input.
6. A live duration preview (`formatDuration(durationMinutes(sleepTime, wakeTime))`) renders above Save; it is informational only and never blocks.
7. Any field change clears `error`.

## Picker Handling (Android dialog over the formSheet)

`presentation` defaults to `'dialog'` on Android, the dialog **opens on mount**, and the typings state the caller must unmount the component in response. `PickerField` therefore:

- renders the picker **only** when `openField === <this field>`;
- `onValueChange={(_, d) => { setValue(mode === 'date' ? toDateString(d) : toTimeString(d)); setOpenField(null); }}` — set value **and** clear the open state, or the dialog re-opens;
- `onDismiss={() => setOpenField(null)}` (Android-only) so cancel also clears it;
- `display={Platform.OS === 'ios' ? 'spinner' : 'default'}` — iOS wheel inline in the sheet, Android native dialog;
- `themeVariant="light"` (iOS-only, `types.d.ts:93`) because `app.json` keeps `userInterfaceStyle: "automatic"` while the theme is hard-coded light; without it a dark-mode device renders dark picker chrome inside a light sheet. **Known limitation:** Android has no equivalent prop, so an Android device in dark mode may show dark dialog chrome. Accepted for the MVP.
- `accentColor={theme.colors.accent}`.

Fallback if the Android dialog misbehaves over the `formSheet` (risk carried from the proposal): switch that route to `presentation: 'modal'` on Android — a one-line change, no structural rework.

## Keyboard Handling

Only `notes` is a text input. `AddEntryScreen` = `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}`, `style={{ flex: 1 }}`) → `ScrollView` (`keyboardShouldPersistTaps="handled"`, `contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}`) → content. A numeric detent (`[0.85]`) rather than `fitToContents` is what makes `flex: 1` legal here. Android relies on the default `adjustResize` soft-input mode; no `app.json` change.

**iOS caveat:** `types.d.ts:705-707` notes that iOS may natively resize a `formSheet` on keyboard appearance without a detent change, so `KeyboardAvoidingView` can double-adjust. If the manual check shows a dead gap under the notes field or content pushed past the sheet top, the one-line fix is `behavior={undefined}` on iOS.

## Duration Bar

Fixed scale, `DURATION_BAR_MAX_MINUTES = 720` (12 hours). Fill width = `` `${Math.min(durationMinutes / 720, 1) * 100}%` `` over a `theme.colors.track` rail, height 6, radius 3, fill in `theme.colors.accent`. Fixed rather than relative-to-max so a single entry does not render a full bar and bars stay comparable across renders.

## FAB Placement

`Fab` is rendered as the last child of `LogScreen`'s root `View` (`flex: 1`) with `position: 'absolute', right: 20, bottom: 20`, 56×56, radius 28, accent background, Ionicons `add` in white, `shadowOpacity`/`elevation: 4`. With JS `Tabs` the tab bar sits outside the screen's layout box, so `bottom: 20` already places the FAB above the bar with no inset math and no `useSafeAreaInsets`. The `ScrollView` uses `contentContainerStyle={{ paddingBottom: theme.layout.listBottomPadding }}` so the FAB never covers the last card.

## Testing Strategy

No test runner is configured (`openspec/config.yaml` `testing.runner.framework: none`), so verification is static gates plus a manual walkthrough.

| Layer | What | Approach |
|---|---|---|
| Static | Types, routes, lint | `npx expo start` once (regenerates `.expo/types/router.d.ts` after the route moves — required before typecheck), then `npx expo lint`, then `npx tsc --noEmit` |
| Manual (iOS + Android) | Behaviour | Checklist below |

Manual checklist: tabs switch Log ↔ Analysis with correct titles/icons and no double header · empty state + FAB visible on a fresh launch · FAB opens the sheet with a dimmed backdrop, visible handle, swipe-down and Android back dismiss · date/sleep/wake pickers open and close once per interaction (no re-open, no stuck dialog) · notes input stays visible with the keyboard up, with no double gap beneath it and no content pushed past the sheet top on iOS · same-day entry (13:00→14:30) reads `1h 30m` · overnight entry (20:00→06:30) reads `10h 30m` · `sleep == wake` blocks save with a visible message · saving dismisses the sheet and prepends the entry, highlighted · notes render only on entries that have them · second entry takes the highlight from the first.

## Threat Matrix

N/A — no routing (in the shell/dispatch sense), shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. This change only adds Expo Router screens and in-memory app state. The matrix rows (documentation-like paths, git repository selection, commit state, push state, PR commands) have no counterpart here and are not expanded.

## Migration / Rollout

No migration. State is in-memory only and empty at launch. Rollout is a single PR per the cached `single-pr` delivery strategy, implemented as two sequential work units: (1) foundation — `theme`, `utils`, `context`, `(tabs)` restructure and route deletions; (2) feature — `LogScreen` list UI and the add-entry sheet. Rollback is `git revert` of the change commit(s) per the proposal.

## Open Questions

- [ ] Spec deltas exist only for `sleep-entry-log`; `add-entry-sheet`, `app-navigation` and `theme` are declared in the proposal but have no spec file yet. This design covers all four; `sdd-spec` should fill the gap before verify.
- [ ] Android `DateTimePicker` dialog layered over a `formSheet` is unverified on a device; fallback (`presentation: 'modal'` on Android) is designed but untested.
- [ ] Android picker chrome in dark mode has no `themeVariant` equivalent; accepted as a known cosmetic limitation.
