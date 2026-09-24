# Delta for llm-analysis-client

New capability. Global `fetch` only; no SDK and no new dependency.

## ADDED Requirements

### Requirement: Request contract

The client MUST `POST https://api.anthropic.com/v1/messages` with headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`. The body MUST contain `model`, `max_tokens`, a system instruction and a user message carrying the entries (date, sleep/wake times, derived duration, notes). The prompt MUST demand JSON only. Response text MUST be read from `content[0].text`. On web, browser calls would additionally need `anthropic-dangerous-direct-browser-access: true`; web is unsupported and not required.

#### Scenario: Request shape
- GIVEN a key and 3 entries
- WHEN analysis is requested
- THEN one POST with the headers and body fields above is issued

### Requirement: Configuration and secrets

The key MUST come from `process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY` and MUST NOT appear as a literal in source. The key value MUST NOT be logged or rendered. The model MUST be a single named constant (not a literal elsewhere). Provisional, pending user confirmation: value `claude-sonnet-4-5-20250929` (the brief said `claude-sonnet-4-20250514`).

#### Scenario: Missing key
- GIVEN the variable is unset or empty
- WHEN analysis is requested
- THEN no network request is issued, the call fails with the missing-key error, and the app does not crash

#### Scenario: Key hygiene
- GIVEN any outcome including errors
- WHEN logs and UI are inspected
- THEN the key value appears in neither

### Requirement: Typed result and defensive parsing

On success the client MUST return `{ summary: string, stats: {label: string, value: string}[], tip: string }` with a non-empty `summary`, at least 2 stats and a non-empty `tip`. The model chooses the stats. Parsing MUST tolerate JSON wrapped in a Markdown code fence or surrounding whitespace. Non-JSON, wrong shape, fewer than 2 stats, or missing `content[0].text` MUST yield the malformed-response error.

#### Scenario: Valid JSON
- GIVEN `content[0].text` is valid JSON of the shape
- WHEN parsed
- THEN the typed result is returned

#### Scenario: Code-fenced JSON
- GIVEN the text is the same JSON inside a ```json fence
- WHEN parsed
- THEN the typed result is returned

#### Scenario: Malformed
- GIVEN prose, or JSON with 1 stat
- WHEN parsed
- THEN the malformed-response error is raised

### Requirement: Error taxonomy

Each failure MUST map to one distinct, typed error with a distinct user-facing message: missing key, network/offline, timeout, HTTP 401, HTTP 429, HTTP 5xx, other non-2xx, malformed response. Messages MUST NOT contain the key or raw response bodies.

#### Scenario: HTTP status mapping
- GIVEN the API responds 401, 429, 503, or 400
- WHEN the client handles it
- THEN it raises the 401, 429, 5xx, or other-non-2xx error respectively

#### Scenario: Offline
- GIVEN the device has no connectivity so `fetch` rejects
- WHEN analysis is requested
- THEN the network error is raised, distinct from timeout

### Requirement: Cancellation and timeout

Each request MUST be abortable via `AbortController`. Callers MUST be able to cancel on unmount or supersession; a caller abort MUST NOT be reported as an error. The client SHOULD time out after 30 s (default) and raise the timeout error.

#### Scenario: Timeout
- GIVEN the API does not respond within the timeout
- WHEN the timeout elapses
- THEN the request is aborted and the timeout error is raised

#### Scenario: Caller abort
- GIVEN the caller aborts an in-flight request
- WHEN the request settles
- THEN no timeout, network or other error result is delivered as a failure
