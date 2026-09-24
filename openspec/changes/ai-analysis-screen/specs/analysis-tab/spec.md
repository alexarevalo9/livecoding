# Delta for analysis-tab

New capability. Supersedes Phase 1's "Analysis renders a placeholder" requirement on archive. Consumes `useEntries()` (newest-first, `SleepEntry {id,date,sleepTime,wakeTime,notes?,createdAt}`) and `src/theme.ts` unchanged.

## ADDED Requirements

### Requirement: Analysis input selection

The screen MUST analyze the first 5 items of `useEntries().entries` (the 5 most recently logged), without re-sorting. Fewer than 5 entries MUST still be analyzed. With 0 entries the screen MUST show the empty state and MUST NOT issue any request.

#### Scenario: More than 5 entries
- GIVEN 8 entries exist
- WHEN analysis runs
- THEN exactly the first 5 of the list are passed to the client

#### Scenario: Fewer than 5 entries
- GIVEN 2 entries exist
- WHEN the tab opens
- THEN the client is called with those 2 entries and a result is shown

#### Scenario: No entries
- GIVEN 0 entries
- WHEN the tab opens
- THEN the empty state shows (prompt to log a night) and no request is made

### Requirement: Trigger, re-run and cache (provisional, pending user confirmation)

Analysis MUST auto-start on first open of the tab with at least 1 entry. It MUST NOT re-run on later focus while the 5-entry input is unchanged; the last successful result MUST be shown from an in-memory cache (not persisted across app restarts). It MUST re-run automatically when the 5-entry input changed. An explicit Refresh control MUST force a re-run.

#### Scenario: Unchanged revisit
- GIVEN a cached result and an unchanged 5-entry input
- WHEN the user leaves and returns to the tab
- THEN the cached result shows and no request is made

#### Scenario: Changed revisit
- GIVEN a cached result and a new entry logged since
- WHEN the user returns to the tab
- THEN loading shows and a new request runs with the new input

#### Scenario: Explicit refresh
- GIVEN a success state
- WHEN the user taps Refresh
- THEN a new request runs even though the input is unchanged

### Requirement: Screen states

The screen MUST render exactly one of: loading, success, error, empty. Loading MUST show skeleton placeholders or an equivalent meaningful indicator and MUST NOT be blank. Success MUST show a plain-language summary, at least 2 stats (label and value), and 1 tip. Error MUST show a distinct message per error class from `llm-analysis-client` and a Retry control. Styling MUST reuse `src/theme.ts`.

#### Scenario: Loading
- GIVEN at least 1 entry and no cache
- WHEN the tab opens
- THEN skeletons show immediately until the request settles

#### Scenario: Success
- GIVEN the client resolves a valid result
- WHEN it renders
- THEN summary, at least 2 stats and 1 tip are visible

#### Scenario: Error and retry
- GIVEN the client fails with any error class
- WHEN the error state renders
- THEN the class-specific message and Retry show
- AND tapping Retry returns to loading and issues a new request

#### Scenario: Unmount mid-request
- GIVEN a request is in flight
- WHEN the screen unmounts
- THEN the request is aborted and no state update or error is surfaced afterwards

#### Scenario: Leave the tab mid-request
- GIVEN a request is in flight and the tab stays mounted (tabs mount lazily on first open and are not unmounted on blur)
- WHEN the user switches to another tab
- THEN the request is NOT aborted; it completes and its result is cached, and returning to the tab shows that result without a new request

#### Scenario: Superseded request
- GIVEN a request is in flight
- WHEN the input changes or Refresh is tapped
- THEN the older request is aborted and its outcome is discarded

### Requirement: Accessibility

Loading and error states SHOULD be announced to assistive tech (live region or equivalent role). Retry and Refresh SHOULD have accessible labels.

#### Scenario: Error announced
- GIVEN a screen reader is active
- WHEN the error state appears
- THEN its message is announced

### Requirement: Platform behavior

iOS and Android MUST behave identically. Web is out of scope (Phase 1: mobile only); behavior there is unsupported and not required.

#### Scenario: Native parity
- GIVEN the same entries and response on iOS and Android
- WHEN the tab opens
- THEN the same state and content render
