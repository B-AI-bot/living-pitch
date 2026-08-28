# Task 4 repository QA report

## Change

`ops/smoke.sh` now runs `npm run summit:smoke` after the existing scan smoke. The Summit command runs both focused checks:

- `scripts/summit-smoke.ts` verifies the deterministic Summit score and preliminary Leverage Map contract.
- `scripts/task-3-smoke.mjs` calls `handleCalRequest()` with an injected `fetch` fixture for `/api/cal/slots`. It verifies the primary Cal.com request, the 404 fallback request, parsed slot output, and the upstream failure response without making a network request or creating a booking.

The WebMCP source check now requires the four Summit tools: `run_leverage_score`, `generate_preliminary_map`, `book_assessment_call`, and `get_pitch_summary`. The existing route loop still covers `/` and `/book`, which contain the interactive Summit and confirmation-gated booking flow.

The anti-leak and anti-em-dash checks remain in `ops/smoke.sh` without changes.

## Verification

Ran on 2026-08-28:

```text
npm run build
npm run scan:smoke
npm run summit:smoke
ops/smoke.sh
git diff --check
git grep -n -i -f /home/maida/projects/living-pitch-context/forbidden-names.txt
rg -n '—' src README.md
```

Results:

- `npm run build` completed with TypeScript and Vite success.
- `npm run scan:smoke` printed `scan smoke ok`.
- `npm run summit:smoke` printed `summit smoke ok` and `Task 3 worker and WebMCP smoke ok`.
- `ops/smoke.sh` printed `smoke ok` after the build, both focused smoke suites, WebMCP cold-start check, route checks, tool checks, anti-leak check, and anti-em-dash check.
- `git diff --check` returned no output and exit code 0.
- The standalone anti-leak and anti-em-dash commands returned no matches.

## Operational boundary

This task did not send a Cal.com booking, access `calcom-db-1`, cancel a booking, push a branch, or create a pull request. `RETURN-W2.md` was not created or committed.
