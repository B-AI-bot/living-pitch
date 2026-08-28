# Roast Organ and Colony Design

## Goal

Add a receipt-first `/roast` acquisition organ, a safe community mutation channel, and their WebMCP surfaces without changing the existing booking contract.

## Architecture

`ops/api/server.py` is a single Python standard-library service. Pure helpers parse and validate request data, normalize safe URLs, fetch and extract bounded observations, validate model burns against exact receipt candidates, and persist cached results in SQLite. The HTTP shell owns CORS, rate limiting, concurrency, and GitHub CLI calls.

The browser calls the API directly at `https://api.welcometotheaijungle.com`. `src/roast.ts` owns the route and agent roast stage. `src/colony.ts` owns the shared mutation composer and staged confirmation. Existing pitch and business footers link to both acquisition and contribution paths through small reusable affordances.

## Safety contracts

- Only HTTP and HTTPS URLs are accepted. Explicit ports, credentials, localhost names, loopback, private, link-local, multicast, reserved, and unspecified IP addresses are rejected.
- Every redirect is validated again and the chain is capped at three redirects.
- Fetches use the honest LivingPitch user agent, a 15 second timeout, and a two MiB body cap.
- Burns can only survive if their receipt exactly matches a server-extracted observation. Sensitive categories force gentle intensity.
- Community fields are data, never instructions. The issue template repeats this posture and the handler documents it.
- The server uses six roast requests per hour per IP, sixty globally, ten mutation proposals per hour per IP, and two concurrent model generations.

## Failure behavior

Malformed requests return 400, blocked targets return 400, quotas return 429, upstream/model failures return 502, and GitHub creation failures return 502. A smoke-only fixture mode produces deterministic receipt-bearing burns without requiring the local model proxy.

## Browser behavior

`/roast` renders the selected intensity as a skin class, shows the anticipation copy while the API works, and puts each exact receipt before the burn. The pivot records the domain in the URL and starts the existing pitch with a visible roast context. PostHog captures `roast_start`, `roast_done`, and `roast_pivot`. WebMCP returns structured burns and also stages the human-facing message.

## Verification

`ops/smoke.sh` builds the SPA, starts the API on an ephemeral loopback port in fixture mode, roasts a committed local HTML fixture, asserts non-empty receipts, checks blocked SSRF targets, validates allowed and denied CORS, and checks the new WebMCP names and route. The ledger regression uses word-boundary, case-insensitive matching.
