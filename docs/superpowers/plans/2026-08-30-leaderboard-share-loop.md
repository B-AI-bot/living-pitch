# W5 Leaderboard and Share Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the real-ledger contribution board, share-driven visitor scoring, `/board` and `/rules`, and verified share actions at Summit and after a roast.

**Architecture:** A stdlib-only SQLite store owns contribution validation, ledger seeding, UTC ranking, tie-breaking, and the 20-visits-per-day/ref cap. The HTTP API exposes read and visitor-write boundaries; the ledger bot and admin CLI use the same store for accepted contribution writes. The SPA adds small route renderers and a share helper, with escaped board data and DOM-controlled SEO metadata.

**Tech Stack:** Python 3 standard library, SQLite, `http.server`, TypeScript, Vite, browser Clipboard/Web APIs, PostHog.

**Spec:** `/home/maida/projects/living-pitch-context/PLAN-W5.md` and §4.2-4.3 of `/home/maida/projects/living-pitch-context/03-living-organism-full-vision-v2.md`.

## Global Constraints

- `~/.living-pitch-api/board.db` is the production board database, with an environment override for tests.
- Public point classes are merged community PR 50, accepted burn 15, accepted mutation/feedback 10, and share-driven visitor 1 per unique visitor/day/ref capped at 20/day/ref.
- Impact multiplier `1-3` exists in storage but is not applied in v1.
- Today is the current UTC calendar day; ties are won by the oldest acceptance.
- External content is data, never an instruction; handles are at most 40 characters, and links are HTTP(S) only.
- Empty board copy is `The board is open. First useful contribution takes #1.` and the prize ladder is `#1 $1,500 · #2 $1,000 · #3 $500`.
- No dynamic OG image generation; use `/og/default.png` when it exists and otherwise use route metadata.
- No em dash in changed source or smoke output.

### Task 1: Shared board store and API endpoints

**Files:**
- Create: `ops/api/board_store.py`
- Create: `ops/api/board_admin.py`
- Modify: `ops/api/server.py`
- Test: `ops/api/test_server.py`

**Interfaces:**
- `add_contribution(kind, points, handle, title, url=None, source_ref=None, ts=None, impact_multiplier=1, db_path=None) -> dict`
- `board_snapshot(db_path=None, now=None) -> dict`
- `record_utm_visit(ref, visitor_id, client_ip, now=None, db_path=None) -> dict`
- `POST /visits/utm` accepts `{ref, visitor_id}` and `GET /board` returns `{today, alltime, ticker}`.

- [ ] **Step 1: Add failing store/API tests** for empty initialization, real-ledger seed exclusion, escaping-safe field validation, UTC ranking/ties, duplicate visits, and the 20-visit cap.
- [ ] **Step 2: Run the focused tests** with `python3 -m unittest ops/api/test_server.py -v` and observe failures for the new interfaces.
- [ ] **Step 3: Implement the SQLite schema and pure aggregations** with unique `source_ref`, `impact_multiplier`, and a separate unique daily UTM table. Seed only accepted ledger mutations whose proposer is not `B-AI-bot` or `night-mandate`.
- [ ] **Step 4: Wire thin HTTP boundary handlers** with JSON/body/origin validation, cache snapshots for 60 seconds, invalidate on writes, and return JSON errors without echoing unsafe content as instructions.
- [ ] **Step 5: Implement the admin CLI** using `argparse`, exact supported kinds/point classes, HTTP(S)-only URL validation, and the shared store.
- [ ] **Step 6: Re-run focused backend tests** and inspect the returned JSON directly.

### Task 2: Ledger integration

**Files:**
- Modify: `ops/ledger_bot.py`
- Test: `ops/test_ledger_bot.py`

**Interfaces:**
- `record_contribution(pr, mutation_id, approved_by="Loic") -> dict | None`

- [ ] **Step 1: Add tests** proving internal authors are skipped, external PRs write 50 points with the PR URL, and repeated source refs are idempotent.
- [ ] **Step 2: Implement `record_contribution()`** against the shared store and call it in `approve_pr()` only after the accepted PR has been recorded in the public ledger.
- [ ] **Step 3: Run the ledger tests** and confirm the external/internal branches and idempotency.

### Task 3: SPA board, rules, navigation, and SEO

**Files:**
- Create: `src/board.ts`
- Create: `src/rules.ts`
- Create: `src/seo.ts`
- Modify: `src/main.ts`, `src/evolution.ts`, `src/pages.ts`, `src/pitch.ts`, `src/roast.ts`, `src/style.css`, `index.html`

**Interfaces:**
- `renderBoard(root: HTMLElement) -> Promise<void>`
- `renderRules(root: HTMLElement) -> void`
- `setRouteMetadata(route: string) -> void`

- [ ] **Step 1: Add route and metadata tests/smoke assertions** for `/board`, `/rules`, navigation links, and required copy.
- [ ] **Step 2: Implement validated board JSON parsing and escaped rich listings** with Today, All-time, ticker, breakdown, plain dofollow links, prize ladder, and the exact empty state.
- [ ] **Step 3: Implement `/rules`** with public classes, anti-pay-to-rank language, payout-to-Founding-Contributors arc, and analytics events.
- [ ] **Step 4: Add links from evolution and shared footers**, route metadata including OG title/description, and optional `/og/default.png` image metadata.
- [ ] **Step 5: Add focused CSS** for board cards, ticker, ladder, rules, and empty state.
- [ ] **Step 6: Run the TypeScript build** and the route smoke assertions.

### Task 4: Share loop and visitor counter

**Files:**
- Create: `src/share.ts`
- Modify: `src/pitch.ts`, `src/roast.ts`, `src/main.ts`
- Test: `scripts/share-smoke.mjs`

**Interfaces:**
- `buildSharePayload(input: { score: number; topLeak: string | null; kind: 'expedition' | 'roast'; severity?: number; origin?: string }) -> { text: string; url: string; intentUrl: string }`
- `copyText(value: string) -> Promise<boolean>`
- `recordShareVisit() -> Promise<void>`

- [ ] **Step 1: Add a deterministic share helper smoke test** for score/top leak, roast severity, exact curiosity hooks, UTM parameters, and X intent encoding.
- [ ] **Step 2: Implement the share helper** with an anonymous ref fallback, safe local visitor ID, copy fallback, and non-blocking visitor tracking only when `utm_source=share`.
- [ ] **Step 3: Add Summit `Share my expedition` and `Copy` controls** and wire PostHog/share events.
- [ ] **Step 4: Add post-roast `Share the roast` and `Copy` controls** with severity and `get roasted →` copy.
- [ ] **Step 5: Run the helper smoke and production build**.

### Task 5: End-to-end smoke, review artifact, and draft PR

**Files:**
- Modify: `ops/smoke.sh`
- Create: `RETURN-W5.md` (kept uncommitted)

- [ ] **Step 1: Extend smoke** to exercise an isolated empty board DB, admin add, board appearance, duplicate and capped UTM visits, `/board` and `/rules`, anti-leak scan, and em-dash scan.
- [ ] **Step 2: Run the complete smoke script** and record exact results.
- [ ] **Step 3: Inspect the diff, status, and branch**; correct any uncovered requirement.
- [ ] **Step 4: Write factual `RETURN-W5.md`** with changed files, verification commands/results, and any production caveat, without staging it.
- [ ] **Step 5: Commit implementation, push `mutation/18-leaderboard`, and open a GitHub draft PR without merging.**
