# Delta for sleep-entry-log

## ADDED Requirements

### Requirement: Entry model and duration

A `SleepEntry` MUST have `id`, `date` (`YYYY-MM-DD`, the sleep-start date), `sleepTime` and `wakeTime` (`HH:mm`), optional `notes`, `createdAt`. Duration (minutes) MUST be derived, not stored: `wake > sleep ? wake - sleep : wake + 1440 - sleep`.

#### Scenario: Same-day duration
- GIVEN sleep 13:00 and wake 14:30
- WHEN the entry is displayed
- THEN its duration reads 1h 30m

#### Scenario: Overnight duration
- GIVEN sleep 20:00 and wake 06:30
- WHEN the entry is displayed
- THEN its duration reads 10h 30m

### Requirement: In-memory store

The app MUST hold entries in memory, empty at launch, and expose add/read access to any screen. Entries are not persisted across app restarts.

#### Scenario: Fresh launch
- GIVEN the app was just started
- WHEN the Log screen opens
- THEN no entries exist

### Requirement: Log list presentation

The Log screen MUST list entries newest first (most recently added on top) under a static "THIS WEEK" label, with a static "Mia · 4mo" badge. Each entry MUST show date, sleep and wake times, a duration pill, a duration progress bar, and notes inline when present. The latest entry MUST be visually highlighted. With no entries, an empty state MUST show. A floating action button MUST always be visible.

#### Scenario: Empty state
- GIVEN no entries
- WHEN the Log screen is shown
- THEN the empty state and the FAB are visible

#### Scenario: Ordering and highlight
- GIVEN entries A then B were added
- WHEN the Log screen is shown
- THEN B is above A and only B is highlighted

#### Scenario: Notes
- GIVEN one entry with notes and one without
- WHEN the list is shown
- THEN notes text appears only on the first
