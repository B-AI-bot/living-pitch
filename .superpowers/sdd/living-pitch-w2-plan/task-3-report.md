# Task 3 report: Summit, map, and confirmation-gated booking

## Status

DONE

## Delivered

- Added the pure `src/engine/summit.ts` module. It maps the canonical score to pipeline, follow-through, speed, memory, and cash. It also converts the existing monthly-shaped euro range to a weekly estimate with `WEEKS_PER_MONTH`.
- Added a deterministic preliminary Leverage Map. The map merges the session context with scan answers, ranks three opportunities by weighted leak severity, and uses the six system shapes from the source copy.
- Added the Summit UI with the score reveal, top leak, weekly estimate label, five dimensions, printable draft map, local-time slots, booking confirmation modal, and replay control.
- Added explicit booking and slot unions to `PitchState`. The booking states are `idle`, `awaiting_human_confirmation`, `booking`, `booking_error`, and `booked`.
- Added `generate_preliminary_map`, `book_assessment_call`, and `get_pitch_summary`. Updated `run_leverage_score` to merge optional answers with session answers.
- Kept booking behind the human modal submit. `book_assessment_call` stores the prefill and opens the modal. It does not call `/api/cal/book`.
- Made the confirmed start observable through `get_pitch_state`, `get_pitch_summary`, and a repeated `book_assessment_call` for the same start.
- Added `GET /api/cal/slots` and `POST /api/cal/book` to the Cloudflare worker. `wrangler.toml` routes both paths through the worker before static assets.
- Added boundary checks for query parameters, booking input, Cal.com availability JSON, and Cal.com booking JSON. New TypeScript code parses `unknown` values without unsafe casts.
- Added a best-effort in-memory limit of three booking attempts per hour for each Cloudflare client IP.
- Added one-click replay. It resets the session, booking, and answers, then selects a different context with `source: "replay"`.

## Cal.com fallback

The required primary target is always attempted first:

`https://cal.welcometotheaijungle.com/api/trpc/public/slots.getSchedule?input=<urlencoded JSON>`

A read-only probe with the specified payload returned HTTP 404:

`No "query"-procedure on path "slots.getSchedule"`

The current Cal.com booking frontend calls this endpoint router path:

`https://cal.welcometotheaijungle.com/api/trpc/slots/getSchedule?input=<urlencoded JSON>`

The same read-only payload returned HTTP 200 with availability. The worker uses that endpoint only after a 404 from the primary target. Any other primary failure returns an upstream error and does not call the fallback.

## Test coverage

`scripts/summit-smoke.ts` checks these behaviors:

- exact five-dimension score output;
- weekly euro conversion;
- deterministic map output;
- three ranked and distinct system shapes;
- leak labels and impact ordering.

`scripts/task-3-smoke.mjs` checks these behaviors without making a booking:

- exact primary Cal.com URL and payload;
- fallback URL and 404-only order;
- simplified `{slots:[{start:"ISO"}]}` output;
- malformed availability rejection;
- no fallback after a primary 500 response;
- exact booking payload;
- WebMCP tool registration and score merge;
- confirmation-gated booking state and repeated booked response;
- summary booking state and required agent sentence;
- one-click replay reset and context divergence.

## TDD evidence

The first `npm run summit:smoke` run failed with `ERR_MODULE_NOT_FOUND` for `src/engine/summit.ts`. After the pure module passed, `node scripts/task-3-smoke.mjs` failed because `buildSlotsRequestUrls` did not exist. The next red run failed because `generate_preliminary_map` was not registered. Each implementation step made its focused assertion pass before the next boundary was added.

## Verification

- `npm run build` exited 0. TypeScript passed, and Vite built 16 modules.
- `npm run summit:smoke` exited 0 with `summit smoke ok` and `Task 3 worker and WebMCP smoke ok`.
- `npm run scan:smoke` exited 0 with `scan smoke ok`.
- `bash ops/smoke.sh` exited 0 with `webmcp cold-start smoke ok` and `smoke ok`.
- `git diff --check` exited 0 with no output.
- The anti-leak check returned no forbidden names.
- The em dash check returned no matches in the changed implementation and report.

## Files changed

- `.superpowers/sdd/living-pitch-w2-plan/task-3-report.md`
- `package.json`
- `scripts/summit-smoke.ts`
- `scripts/task-3-smoke.mjs`
- `src/engine/summit.ts`
- `src/engine/state.ts`
- `src/engine/types.ts`
- `src/pitch.ts`
- `src/style.css`
- `src/webmcp.ts`
- `src/worker.js`
- `wrangler.toml`

## Concerns

- The specified Cal.com slots procedure still returns 404. The narrow fallback depends on the endpoint used by the current public booking frontend.
- The booking rate limit is per worker isolate and resets when the isolate restarts. It is a best-effort guard, not a durable quota.
- No real booking was made. The tests verify the request contract and confirmation gate without calling the booking endpoint, as required.
- The UI compiles and its state and network contracts have smoke coverage. This task does not add an automated browser interaction test.
- The pre-existing untracked `RETURN-W1.md` was not modified or staged.

## Fix round 1

### Review findings addressed

- Scoped `book_assessment_call` registration to the `/` pitch route, where `renderPitch` owns the confirmation modal. Business pages keep the other WebMCP tools but do not expose a booking tool without a human confirmation path.
- Added `booking_confirmation_yes_click` at the accepted human submit transition. The event fires before the async booking request, so failed and interrupted attempts retain the human decision.
- Added `booking_confirmation_no_click` when the human dismisses an awaiting or failed confirmation.
- Added booking-state parsing at the session-storage boundary. A persisted `booking` variant reloads as `awaiting_human_confirmation` with the same validated prefill. Invalid persisted booking data reloads as `idle`.

### Focused regression coverage

The updated `scripts/task-3-smoke.mjs` exercises the real registration and state boundaries:

- `installWebMcpTools('/book')` omits `book_assessment_call`.
- `installWebMcpTools('/')` includes `book_assessment_call`.
- A failed yes attempt records `booking_confirmation_yes_click` before `booking_error`.
- Dismissing that failed attempt records `booking_confirmation_no_click`.
- Importing state with a persisted `booking` variant returns `awaiting_human_confirmation`.

The three red runs failed on the reviewed behavior before implementation:

- Business-page registration returned `true` for `book_assessment_call` when the test expected `false`.
- The event after `markBookingSubmitting()` remained `webmcp_tool_call` when the test expected `booking_confirmation_yes_click`.
- Reload returned `status: 'booking'` when the test expected `status: 'awaiting_human_confirmation'`.

### Commands and outputs

- `node scripts/task-3-smoke.mjs` exited 0 with `Task 3 worker and WebMCP smoke ok`.
- `npm run summit:smoke` exited 0 with `summit smoke ok` and `Task 3 worker and WebMCP smoke ok`.
- `npm run build` exited 0. TypeScript passed, and Vite built 16 modules.
- `bash ops/smoke.sh` exited 0 with `scan smoke ok`, `webmcp cold-start smoke ok`, and `smoke ok`.
- `git diff --check` exited 0 with no output.
- The em dash check printed `em dash check ok`.
- The anti-leak check printed `anti-leak check ok`.

### Fix-round concerns

- Business pages intentionally do not register `book_assessment_call`. The pitch route remains the only route with the booking tool and its human modal.
- No real booking was made. The focused test drives registration, decision events, failure, dismissal, and reload state without calling `/api/cal/book`.

## Final review fix round

### Fixes

- Added `complete` to the Summit score contract. Empty and partial scans keep the HUD in `building` state and render the unanswered territory questions instead of a numeric score or preliminary map.
- Changed the top-leak threshold from `> 25` to `>= 25`. A mild leak at exactly 25 now returns its dimension.
- Restored both Summit CTAs from `getSceneCopy()`. Evidence-first renders `Book the 30-min call` with `href="#booking-panel"`. Story-reassurance renders `Get my 3 installable opportunities →` with `href="/assessment"`.
- Added Cal.com booking-response parsing at the worker boundary. HTTP 200 now returns booked only when the response has a validated booking identifier and no explicit failure marker.
- Reset persisted `bookingSlots` to `idle` during hydration. This clears interrupted loading state and stale ready slots.
- Kept the exact primary slots request, the 404-only fallback, and the human modal submit gate unchanged.

### Red runs

`npm run summit:smoke` exited 1 before the completeness fix:

```text
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected

  {
-   complete: true,
```

The focused UI and boundary assertions failed before their fixes:

```text
node scripts/task-3-smoke.mjs
TypeError: renderSummit is not a function

node scripts/task-3-smoke.mjs
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
actual: undefined
expected: { label: 'Book the 30-min call', href: '#booking-panel' }

node scripts/task-3-smoke.mjs
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
200 !== 502

node scripts/task-3-smoke.mjs
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
actual: { status: 'loading' }
expected: { status: 'idle' }
```

### Green runs

`npm run summit:smoke` exited 0:

```text
> living-pitch@0.1.0 summit:smoke
> node --experimental-strip-types scripts/summit-smoke.ts && node scripts/task-3-smoke.mjs

summit smoke ok
Task 3 worker and WebMCP smoke ok
```

`npm run scan:smoke` exited 0:

```text
> living-pitch@0.1.0 scan:smoke
> node --experimental-strip-types scripts/scan-smoke.ts

scan smoke ok
```

`npm run build` exited 0:

```text
> living-pitch@0.1.0 build
> tsc --noEmit && vite build

vite v6.4.3 building for production...
transforming...
✓ 16 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.50 kB │ gzip:  0.30 kB
dist/assets/index-Cx0cmhFR.css  14.22 kB │ gzip:  3.79 kB
dist/assets/index-C_DUuy-e.js   71.32 kB │ gzip: 23.72 kB
✓ built in 307ms
```

`bash ops/smoke.sh` exited 0:

```text
> living-pitch@0.1.0 build
> tsc --noEmit && vite build

vite v6.4.3 building for production...
transforming...
✓ 16 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.50 kB │ gzip:  0.30 kB
dist/assets/index-Cx0cmhFR.css  14.22 kB │ gzip:  3.79 kB
dist/assets/index-C_DUuy-e.js   71.32 kB │ gzip: 23.72 kB
✓ built in 332ms

> living-pitch@0.1.0 scan:smoke
> node --experimental-strip-types scripts/scan-smoke.ts

scan smoke ok

> living-pitch@0.1.0 summit:smoke
> node --experimental-strip-types scripts/summit-smoke.ts && node scripts/task-3-smoke.mjs

summit smoke ok
Task 3 worker and WebMCP smoke ok
webmcp cold-start smoke ok
smoke ok
```

The final hygiene commands returned these results:

```text
git diff --check
[no output, exit 0]

em dash check ok
anti-leak check ok
```

### Concerns

- No real booking was made, and no Cal.com database was accessed.
- The Cal.com slots fallback still depends on the current public booking endpoint and runs only after the required primary endpoint returns 404.
- The booking rate limit remains per worker isolate, as documented above.
- The pre-existing untracked `RETURN-W1.md` was not modified or staged.
