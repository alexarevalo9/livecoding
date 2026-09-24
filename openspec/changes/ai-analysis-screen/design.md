# Design: AI Analysis Screen (Phase 2)

> Size note: intentionally over the generic 800-word design guidance. The binding launch directives for this run enumerate required sections (per-file contracts, hook state machine, component tree + wireframe, sequence diagram, config/security, manual test matrix, line budget, doc citations, open questions). Directive wins; prose stays terse.

## Technical Approach

Same four layers as Phase 1, no new dependency and no native module: thin route in `src/app/` → screen in `src/screens/analysis/` → hook → pure util + config outside `src/app/`. Global `fetch` only, so this runs in Expo Go.

```
src/app/(tabs)/analysis.tsx        (exists, unchanged — re-exports the screen)
src/screens/analysis/AnalysisScreen.tsx   (stub → real screen)
src/screens/analysis/use-analysis.ts      (new — state machine)
src/components/{AnalysisSkeleton,StatRow,MessageCard}.tsx  (new)
src/utils/anthropic.ts             (new — request, prompt, parse, typed errors)
src/config/anthropic.ts            (new — key + model + endpoint constants)
```

Consumed, never redefined: `useEntries()` (`src/context/entries-context.tsx`), `theme` (`src/theme.ts`), `durationMinutes`/`formatDuration`/`formatDateLabel` (`src/utils/format.ts`).

**Stale-premise correction:** the proposal lists `src/app/(tabs)/analysis.tsx` as *Modified* ("placeholder becomes thin route"). The Phase 1 working tree already contains exactly that — a 3-line `export default AnalysisScreen` re-export — so the route file needs **no** change and is deliberately absent from File Changes. Only `src/screens/analysis/AnalysisScreen.tsx` (today a 13-line stub) is modified.

### Evidence (a) verified this session, with path

| Claim | Where |
|---|---|
| Tab screens mount lazily on first access (`lazy` "Defaults to `true`") and have no `unmountOnBlur` — once opened, Analysis stays mounted | `node_modules/expo-router/build/react-navigation/bottom-tabs/types.d.ts:183-186`, `:197-208` (only `popToTopOnBlur`, `freezeOnBlur`) |
| `useFocusEffect` / `useIsFocused` exist and `useFocusEffect` demands a `useCallback`-wrapped effect | `node_modules/expo-router/build/exports.d.ts:19-20`; `build/useFocusEffect.d.ts:13,42` |
| React Compiler on → no manual memoization (Phase 1 Decision 11) | `app.json` `experiments.reactCompiler: true` |
| `.gitignore` ignores only `.env*.local`; a plain untracked `.env` already exists in the tree | `.gitignore:34`; `git status` shows `?? .env` (contents deliberately not read) |
| Reanimated 4.5.1 present, but there is **no** root `babel.config.js` → worklets plugin configuration is unverified | `package.json:25`; no root babel config found |
| Entries are newest-first via prepend; `SleepEntry` shape | `src/context/entries-context.tsx:5-32` |

### Evidence (b) doc URLs — to verify at apply time (not verified in this phase; no web access here)

| Doc | Assumption that depends on it |
|---|---|
| https://docs.expo.dev/guides/environment-variables/ | `EXPO_PUBLIC_*` inlining requires a **literal** `process.env.X` member expression; `.env.local` is loaded by the CLI; dev server restart needed after env edits |
| https://docs.expo.dev/router/introduction/ + https://docs.expo.dev/versions/v57.0.0/sdk/router/ | `Link href='/'` targets the Log tab under typed routes; `useFocusEffect` semantics |
| https://reactnative.dev/docs/animated (RN 0.86) | `Animated.loop`/`sequence`/`timing` with `useNativeDriver: true` for opacity |
| https://reactnative.dev/docs/accessibility | `accessibilityLiveRegion` is Android-only; `accessibilityRole='button'` |
| https://reactnative.dev/docs/network | RN `fetch` rejects with `TypeError` offline and `AbortError` (`e.name`) on abort — **verify the abort error name at apply time** |
| https://docs.expo.dev/versions/v57.0.0/ (index) | No SDK module is added; this change uses only global `fetch` + `react-native` primitives |
| Anthropic Messages API (`/v1/messages`, `anthropic-version: 2023-06-01`) | Header set, body shape, `content[0].text` extraction |

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| 1 | Transport | global `fetch` | `@anthropic-ai/sdk` | Zero deps, no Node polyfills, Expo Go safe (proposal: no native module). |
| 2 | Auto-start trigger | `useEffect` in `use-analysis.ts`, deps `[entries, nonce]` | `useFocusEffect`; `useIsFocused` gate | Tabs mount lazily, so first mount **is** first open — `useEffect` already means "on open". `useFocusEffect` re-fires on every tab return (contradicting re-run policy unless re-guarded) and mandates a `useCallback`, contradicting Decision 11. `entries` identity from `useState` changes only when an entry is added, so the dep is honest and lint-clean. |
| 2a | **Spec deviation** | Abort scope = unmount + input change + Refresh/Retry only | Aborting when the tab loses focus | Direct consequence of Decision 2: the screen never unmounts on blur, so there is no blur cleanup to hang an abort on, and finishing the request is strictly better (the result is cached and instantly visible on return). `specs/analysis-tab/spec.md` scenario "Leave mid-request" (~lines 65-68) currently says leaving the tab aborts. The **orchestrator will reword that spec scenario** to match this narrowed abort scope; this phase does not edit spec files. |
| 3 | Re-run policy | First open + explicit Refresh/Retry + auto re-run when the 5-entry input changes (Unresolved #2 → resolved as recommended) | Re-analyze on every focus | Bounded token spend, fresh data after logging. **Designed consequence:** because the screen stays mounted, logging a new entry fires a *background* request (result is ready on return). Lever if token spend is unwanted: set a `stale` flag on input change and start on next focus (`useIsFocused` guard, ~5 lines). |
| 4 | Cache | In-memory `useRef`, keyed by `inputKey` = the 5 entry ids joined (Unresolved #3 → yes) | Persist via AsyncStorage | Persistence is out of scope; the ref dies with the screen only if the tab unmounts (it does not), so a tab switch never re-charges the API. |
| 5 | Skeleton animation | Core `Animated` pulsing opacity | Reanimated 4 shared value; static blocks; `ActivityIndicator` only | No root `babel.config.js` → worklets auto-config unverified (evidence a); core `Animated` needs no plugin and no new dep. Fallback if it misbehaves: drop the loop, keep static blocks (−10 lines). |
| 6 | Error model | One exported `AnalysisError` class with a `kind` union + separate `AnalysisAborted` sentinel | Returning a result union; raw `Error` | The util never lets an untyped error escape, so the hook has exactly one `catch` shape; the sentinel is the only thing the hook swallows silently. |
| 7 | Config surface | `src/config/anthropic.ts` holds `ANTHROPIC_MODEL` **plus** endpoint/version/max-tokens/timeout/entry-count | Brief's literal "single constant"; inlining them in the util | Deliberate expansion, not drift: every tunable that a reviewer or the user may want to change sits in one 30-line file; the util stays logic-only. |
| 8 | Components | 3 small components; error and empty share `MessageCard` | One monolithic screen; separate Error/Empty components | Error and empty are the same shape (title + body + optional action); one component, two call sites. |
| 9 | Platform scope | Mobile only (Phase 1 decision) | Web support | Browser calls to `/v1/messages` need CORS plus the `anthropic-dangerous-direct-browser-access` header; explicitly not added. Web is untested and out of scope. |

## Interfaces / Contracts

```ts
// src/config/anthropic.ts
export const ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929'; // Open Question 1 — confirm before apply
export const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_MAX_TOKENS = 1024;
export const ANALYSIS_TIMEOUT_MS = 30_000;
export const ANALYSIS_ENTRY_COUNT = 5;
export function getApiKey(): string | null;   // trimmed value, or null when unset/blank
```

**Inlining rule (highest apply-time bug risk).** `getApiKey` MUST contain the literal member expression `process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY` at its use site. Forbidden, because each defeats the static substitution and yields `undefined` at runtime: destructuring (`const { EXPO_PUBLIC_ANTHROPIC_API_KEY } = process.env`), dynamic indexing (`process.env[name]`), any helper taking the variable name as a parameter, or reading it through `expo-constants`.

```ts
// src/utils/anthropic.ts
export type AnalysisStat = { label: string; value: string };
export type AnalysisResult = { summary: string; stats: AnalysisStat[]; tip: string }; // stats.length >= 2
export type AnalysisErrorKind =
  | 'missing-key' | 'network' | 'timeout' | 'unauthorized'
  | 'rate-limited' | 'server' | 'malformed' | 'http';
export class AnalysisError extends Error { readonly kind: AnalysisErrorKind; readonly status?: number }
export class AnalysisAborted extends Error {}          // caller-initiated abort; never user-visible
export function analyzeEntries(
  entries: SleepEntry[],
  options?: { signal?: AbortSignal },
): Promise<AnalysisResult>;
// exported pure helpers (unit-testable once a runner exists)
export function buildSystemPrompt(): string;
export function serializeEntries(entries: SleepEntry[]): string;
export function parseAnalysisResult(text: string): AnalysisResult; // throws AnalysisError('malformed')
export function errorKindForStatus(status: number): AnalysisErrorKind;
```

**Prompt.** `system` = role ("a calm assistant summarizing a baby's recent sleep for a tired parent"), plain language, no medical advice or diagnosis, **JSON only, no prose, no code fences**, exact schema `{"summary": string, "stats": [{"label": string, "value": string}], "tip": string}`, 2–4 stats, summary ≤ 3 sentences, one actionable tip. `messages: [{ role: 'user', content: serializeEntries(input) }]`, one compact line per entry, newest first:

```
1. 2026-09-21 20:00->06:30 (630m) notes: "woke twice"
2. 2026-09-20 20:15->05:50 (575m)
```

ISO date + `HH:mm` + derived minutes from `durationMinutes` (Phase 1 util) — locale-free, token-cheap, and the duration is computed by us, not the model.

**Request.** `POST ANTHROPIC_API_URL`, headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`; body `{ model, max_tokens, system, messages }`; read `data.content[0].text`.

**Parse (defensive).** Strip an optional ```` ```json ```` / ```` ``` ```` fence with `/^\s*```(?:json)?\s*([\s\S]*?)```\s*$/`, `JSON.parse` in `try/catch`, then validate: `summary` and `tip` are non-empty trimmed strings; `stats` is an array of ≥2 objects with non-empty string `label` and `value` (numbers coerced with `String`), truncated to 4 for layout. Any failure → `AnalysisError('malformed')`.

**Errors (total mapping — no untyped error escapes).** `missing-key` is raised **before** any `fetch`. `TypeError` → `network` (RN's offline rejection). `errorKindForStatus`: `401|403 → unauthorized`, `429 → rate-limited`, `>=500 → server`, any other non-`ok` → `http` (carries `status`). A failing `res.json()`, a missing/non-text `content[0].text`, and **any other unexpected thrown value** all fall through to `malformed`. The final `catch` re-throws `AnalysisError`/`AnalysisAborted` unchanged and wraps everything else, so `analyzeEntries` rejects with exactly those two types and nothing else.

**Timeout vs. abort.** The util owns the timer. One internal `AbortController ac`; the caller's `signal` is forwarded (`signal.addEventListener('abort', () => ac.abort())`, plus an immediate `signal.aborted` check); `setTimeout(ANALYSIS_TIMEOUT_MS)` sets `timedOut = true` then `ac.abort()`; the timer is always cleared in `finally`. On `e.name === 'AbortError'` (to verify at apply time): `timedOut` → `AnalysisError('timeout')`, otherwise `throw new AnalysisAborted()`. This is exactly the bug class being designed out: a user leaving the tab mid-request must not surface as `network`, and must not set state at all.

```ts
// src/screens/analysis/use-analysis.ts
export type AnalysisState =
  | { status: 'idle' } | { status: 'empty' } | { status: 'loading' }
  | { status: 'success'; result: AnalysisResult }
  | { status: 'error'; kind: AnalysisErrorKind; message: string };
export function useAnalysis(): { state: AnalysisState; refresh: () => void; inputCount: number };
// initial state is derived LAZILY, never 'idle':
//   useState<AnalysisState>(() => entries.length ? { status: 'loading' } : { status: 'empty' })
```

**No blank first paint.** Because the initial state is derived lazily, the very first render already paints `loading` (entries exist) or `empty` (none) — the effect only confirms it. `idle` is kept in the union purely for `switch` exhaustiveness and is unreachable; if it is ever reached the screen MUST render `<AnalysisSkeleton />` when `inputCount > 0` and the empty `MessageCard` otherwise. The screen therefore always shows exactly one of loading / success / error / empty and never a blank frame.

## Hook State Machine

```
                 entries.length === 0
   mount ──────────────────────────────────→ empty        (no request, no key read)
     │  input unchanged & cached
     ├──────────────────────────────────────→ success (cache hit, 0 requests)
     │
     └─→ loading ──ok──→ success ──refresh()──┐
              │                               │
              └──AnalysisError──→ error ──Retry()──┘
              └──AnalysisAborted──→ (no state change)
   entries change (new inputKey) ─→ loading (from any state)
```

**Dependency rule (MUST).** `input = entries.slice(0, ANALYSIS_ENTRY_COUNT)` and `inputKey = input.map(e => e.id).join('|')` are derived **inside the effect body** from `entries` (stable `useState` identity), so `[entries, nonce]` is genuinely exhaustive. `input` is a fresh array identity on every render: it must never enter the dependency list — doing so fires one Anthropic request per render. The render-side values used for `inputCount` and the "Last N nights" label are computed separately in the component body and are not effect inputs.

Internals: refs `cacheRef {key, result}`, `abortRef`, `requestIdRef`. The effect (deps `[entries, nonce]`) returns early to `empty` when `input.length === 0`, early to `success` on a cache hit, else bumps `requestIdRef`, creates an `AbortController`, and awaits `analyzeEntries(input, { signal })`. Every `setState` is guarded by `if (id !== requestIdRef.current || signal.aborted) return;` — a stale response or an aborted one writes nothing. Cleanup aborts the in-flight controller (unmount **and** input change). `refresh()` clears `cacheRef` and bumps `nonce`; `retry()` is the same function, so the Retry button and Refresh share one path.

## Screen, Components, Wireframe

```
(tabs)/analysis.tsx → AnalysisScreen
└─ SafeAreaView (react-native-safe-area-context) edges={['top']} / ScrollView
   ├─ header: "Analysis" title + "Last N nights" caps label
   │          + Refresh (rendered only when status === 'success'; hidden in loading/error/empty,
   │            because error owns Retry and empty/loading have nothing to refresh)
   ├─ status === 'loading' (or 'idle') → <AnalysisSkeleton />  (pulsing blocks + a11y text)
   ├─ status === 'success' → summary card
   │                         <StatRow stats={result.stats} />   (>=2, wraps)
   │                         tip callout (accentSoft, 💡-free, "Try this" caps label)
   ├─ status === 'error'   → <MessageCard title body actionLabel="Retry" onAction={refresh} />
   └─ status === 'empty'   → <MessageCard title="Nothing to analyze yet"
                               body="Log a night first and we'll summarize it."
                               actionLabel="Go to Log" href="/" />
```

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Analysis            Refresh  │   │ Analysis                     │
│ LAST 5 NIGHTS                │   │ LAST 5 NIGHTS                │
│ ┌──────────────────────────┐ │   │ ┌──────────────────────────┐ │
│ │ Mia slept a little more  │ │   │ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  │ │
│ │ this week, with one      │ │   │ │ ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░  │ │
│ │ rough night on Friday.   │ │   │ └──────────────────────────┘ │
│ └──────────────────────────┘ │   │ ┌────────┐ ┌────────┐        │
│ ┌────────┐ ┌────────┐        │   │ │ ▓▓▓▓░░ │ │ ▓▓▓▓░░ │        │
│ │ AVG    │ │ LONGEST│        │   │ └────────┘ └────────┘        │
│ │ 9h 10m │ │ 10h 30m│        │   │ ┌──────────────────────────┐ │
│ └────────┘ └────────┘        │   │ │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  │ │
│ ┌ TRY THIS ───────────────┐  │   │ └──────────────────────────┘ │
│ │ Keep bedtime within 20m │  │   │  Analyzing your last 5       │
│ └─────────────────────────┘  │   │  nights…                     │
└──────────────────────────────┘   └──────────────────────────────┘
        success                              loading
```

Styling reuses `theme` only (`colors.surface`/`border`/`accentSoft`, `radius.card`/`pill`, `text.title`/`caps`/`body`, `spacing`) — no new tokens.

`specs/analysis-tab` (written in parallel) is **authoritative** for user-visible behavior and copy. The table below is this design's reference wording, and the "≥2 stats, truncated to 4" bound is a layout constraint — reconcile both with the spec before apply. Error copy per kind (all with Retry):

| kind | Copy |
|---|---|
| `missing-key` | "No API key configured. Add `EXPO_PUBLIC_ANTHROPIC_API_KEY` to `.env.local` and restart the dev server." |
| `network` | "Can't reach the internet. Check your connection and try again." |
| `timeout` | "That took too long. Try again." |
| `unauthorized` | "The API key was rejected. Check the key and restart the dev server." |
| `rate-limited` | "Too many requests. Wait a moment and try again." |
| `server` | "Claude is having trouble right now. Try again shortly." |
| `malformed` | "The response couldn't be read. Try again." |
| `http` | "Request failed (status N). Try again." |

A11y: the state container gets `accessibilityLiveRegion='polite'` (Android-only — on iOS the status text is simply readable, accepted limitation) and the skeleton is hidden from assistive tech (`importantForAccessibility='no-hide-descendants'`, `accessibilityElementsHidden`) with a real status `Text` beside it, pluralized: `Analyzing your last ${n} nights…` / `Analyzing last night…` when `n === 1`. Retry/Refresh are `Pressable` with `accessibilityRole='button'` and explicit `accessibilityLabel`. The empty state's action is `<Link href='/' asChild>` around a `Pressable` (typed routes resolve `(tabs)/index` to `/`, so this switches tabs rather than pushing).

## Sequence Diagram

```
User      AnalysisScreen   use-analysis     anthropic.ts    Anthropic API
 │  open tab    │               │                │                │
 ├─────────────>│ mount (lazy)  │                │                │
 │              ├──────────────>│ entries.slice(0,5)              │
 │              │               │ len 0 ─────────────────────────> (no request) → empty
 │              │               │ cache hit(inputKey) ───────────> success
 │              │<─ loading ────┤ new AbortController             │
 │  skeleton <──┤               ├──analyzeEntries(input,{signal})>│
 │              │               │                │ getApiKey()    │
 │              │               │<── missing-key ┤ (no fetch)     │
 │              │               │                ├─ POST /v1/messages ─────>│
 │              │               │                │<── 200 {content:[{text}]}┤
 │              │               │                │ strip fences → JSON.parse → validate
 │              │<── success ───┤<── result ─────┤                │
 │  render  <───┤  cacheRef = {inputKey, result} │                │
 │              │               │                │                │
 │  ── error branch: TypeError|status|bad JSON ──┤ AnalysisError(kind)
 │              │<── error(kind,copy) ── (guard: id & !aborted) ──┤
 │  Retry ─────>│ refresh(): cacheRef=null, nonce++ → loading → (repeat)
 │              │               │                │                │
 │ unmount / new entry / refresh>│ cleanup: ac.abort()            │
 │              │               │  AnalysisAborted → no setState  │
 │              │               │  30s timer → timedOut → error('timeout')
```

**Leaving the tab does NOT abort.** The tab screen stays mounted (`lazy` defaults to `true`, no `unmountOnBlur` — evidence a), so switching to Log mid-request runs no cleanup: the in-flight request completes, the guarded `setState` still applies, and the result is cached. Abort fires only on true unmount (app-level teardown), an input change, and `refresh()`/Retry.

## Config / Security

| Item | Decision |
|---|---|
| Key source | `.env.local` (git-ignored by `.gitignore:34`), read only through `getApiKey()` |
| Committed sample | `.env.example` with `EXPO_PUBLIC_ANTHROPIC_API_KEY=` (placeholder, no value) |
| `.gitignore` | **Add `.env`.** Only `.env*.local` is ignored today and an untracked `.env` already exists in this tree — this is a required change now, not hygiene. |
| Bundle exposure | `EXPO_PUBLIC_*` is inlined into the JS bundle and is extractable. Accepted, brief-driven; use a throwaway key. A proxy is an explicit non-goal. |
| Logging | The key is never logged, rendered, included in an error message, or written to an artifact. Error copy names the *variable*, never the value. |
| Restart | Env changes require restarting the dev server (values are inlined at bundle time). |
| Web | Unsupported/out of scope; a browser would additionally need CORS and `anthropic-dangerous-direct-browser-access`. Not added. |

## Testing Strategy

`strict_tdd: false`, `testing.runner.framework: none` — no runner, so the pure helpers (`buildSystemPrompt`, `serializeEntries`, `parseAnalysisResult`, `errorKindForStatus`) are written side-effect-free and independently exported so they can be unit-tested unchanged the day a runner lands.

| Layer | What | Approach |
|---|---|---|
| Static | Types + lint | `npx expo lint`, `npx tsc --noEmit` (no route is added or moved, so Phase 1's "run `npx expo start` first to regenerate `.expo/types/router.d.ts`" step does **not** apply) |
| Manual | Runtime behavior | Matrix below; requires a user-supplied key |

| # | Case | Expected |
|---|---|---|
| 1 | Happy path, 5 entries, valid key | Skeleton immediately → summary + ≥2 stats + tip |
| 2 | 0 entries | Empty state, **no** request (verify in the network tab), "Go to Log" switches tabs |
| 3 | 1 entry | Works; caps label reads "Last 1 night" |
| 4 | 7 entries | Exactly the 5 newest-logged are serialized (check the request body) |
| 5 | Key unset | `missing-key` copy, no request issued, no crash |
| 6 | Bad key | 401 → `unauthorized` copy; Retry works after fixing the key + restart |
| 7 | Airplane mode | `network` copy; recovers on Retry once online |
| 8 | Malformed response | Temporarily stub the util's response text with prose → `malformed` copy |
| 9 | Timeout | Temporarily set `ANALYSIS_TIMEOUT_MS = 1000` → `timeout` copy |
| 10 | Leave mid-request | Switch tabs while loading → no error flash, no "setState on unmounted" warning, returning shows the completed/cached result |
| 11 | Log a new entry | Input change triggers exactly one new request; stale response never overwrites the newer one |
| 12 | Tab switch with cache | Returning with an unchanged input issues **no** request |

## Threat Matrix

N/A for the matrix's actual rows — no shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary; Expo Router file routing is not dispatch routing. This change does add one boundary Phase 1 lacked: **outbound HTTPS carrying a bundle-inlined credential.** That is covered under Config / Security above (single read path, never logged, `.gitignore` fix, accepted extraction risk) rather than by expanding matrix rows that have no counterpart here.

## File Changes

Authored estimates (`additions` / `deletions`) for the review budget.

| File | Action | Purpose | +/- |
|---|---|---|---|
| `src/config/anthropic.ts` | Create | Model/endpoint/version/limits + `getApiKey()` | 30 / 0 |
| `src/utils/anthropic.ts` | Create | Prompt, request, parse/validate, typed errors, timeout/abort | 165 / 0 |
| `src/screens/analysis/use-analysis.ts` | Create | State machine, cache, abort, race guards | 90 / 0 |
| `src/screens/analysis/AnalysisScreen.tsx` | Modify | Stub → header, four states, refresh | 130 / 13 |
| `src/components/AnalysisSkeleton.tsx` | Create | Pulsing placeholder blocks | 65 / 0 |
| `src/components/StatRow.tsx` | Create | Stat cards (≥2, wrapping) | 45 / 0 |
| `src/components/MessageCard.tsx` | Create | Shared error/empty card + action | 55 / 0 |
| `.env.example` | Create | `EXPO_PUBLIC_ANTHROPIC_API_KEY=` placeholder | 3 / 0 |
| `.gitignore` | Modify | Add `.env` | 2 / 0 |

**Totals: ~585 additions + ~13 deletions ≈ 600 churn**, realistic range 560–700 (RN `StyleSheet` blocks are the variance). Budget risk **Low–Medium** against the cached 800-line `single-pr` budget. Levers if it drifts: fold `StatRow` into the screen (−20), static skeleton without the loop (−10). `sdd-tasks` owns the final forecast and guard lines.

## Migration / Rollout

No migration; nothing is persisted and no dependency, `app.json`, or native change is made. One PR (`single-pr`), two sequential work units: **(1)** `src/config/anthropic.ts` + `src/utils/anthropic.ts` + `.env.example` + `.gitignore` (self-contained, typechecks alone); **(2)** `use-analysis.ts` + `AnalysisScreen` + the three components (depends on unit 1). **Hard dependency: Phase 1 (`log-screen-add-entry-sheet`) must land first** — `useEntries()`, `theme`, `src/utils/format.ts` and the `(tabs)` layout are all consumed. Rollback: `git revert` the change commit(s), delete `src/config/`, `src/utils/anthropic.ts`, `use-analysis.ts` and the three components, restore the placeholder `AnalysisScreen`, remove `.env.local`/`.env.example` (keep the `.gitignore` line).

## Open Questions

- [ ] **Blocking before apply — model ID.** `ANTHROPIC_MODEL = 'claude-sonnet-4-5-20250929'` (the user's "Sonnet 4.5") vs the brief's `claude-sonnet-4-20250514`. One named constant either way; the user must confirm. Not treated as decided.
- [ ] **Spec deviation to reconcile (Decision 2a).** `specs/analysis-tab/spec.md` scenario "Leave mid-request" (~lines 65-68) states that leaving the tab aborts the request. The design narrows abort to unmount, input change and Refresh/Retry, because the tab screen never unmounts on blur. The orchestrator will reword that spec scenario; this phase did not edit spec files. Manual test case 10 is written against the design's behavior.
- [ ] Runtime verification needs a user-supplied Anthropic API key; until then only the static gates can pass.
- [ ] Background re-run after logging an entry (Decision 3) spends tokens while the tab is not visible. Confirm this is acceptable, or take the stale-then-focus lever.
- [ ] RN `fetch` abort error name (`e.name === 'AbortError'`) and the `EXPO_PUBLIC_*` literal-form requirement are both doc/runtime assumptions to verify at apply time; the timeout/abort branch depends on the former.
- [ ] Anthropic response shape assumes `content[0].type === 'text'`; a non-text first block would land in `malformed` rather than a dedicated state. Accepted.
- [ ] Web is unsupported (no CORS header added); if web is ever in scope this design needs a proxy, not a header.
