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
