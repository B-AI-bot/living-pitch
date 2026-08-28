# Roast Organ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the receipt-first roast acquisition organ, safe colony mutation intake, WebMCP tools, smoke coverage, and the ledger word-boundary fix.

**Architecture:** A Python STDLIB API owns bounded fetch/extraction, receipt validation, SQLite cache, quotas, and GitHub issue creation. The existing TypeScript SPA adds a focused roast route and shared mutation composer, while WebMCP delegates to the same API and stages results for humans.

**Tech Stack:** Python 3 STDLIB (`http.server`, `urllib`, `html.parser`, `sqlite3`), Vite, TypeScript, browser Fetch API, WebMCP, `gh` CLI, Bash smoke script.

**Spec:** `docs/superpowers/specs/2026-08-28-roast-organ-design.md` and `/home/maida/projects/living-pitch-context/PLAN-W3.md`

## Global Constraints

- Backend is `ops/api/server.py`, STDLIB ONLY, loopback `127.0.0.1:9440` by default.
- API CORS allows only `https://living-pitch.welcometotheaijungle.workers.dev` and `https://welcometotheaijungle.com`.
- Fetch uses `LivingPitch-Roast/1.0 (+https://welcometotheaijungle.com/roast)`, 15 seconds, two MiB, and at most three redirects.
- Cache is `~/.living-pitch-api/roast-cache.db` with a 24 hour TTL and key `(domain, intensity)`.
- LLM calls use the local Responses API proxy, `DELEGATE_CS_KEY`, model `gpt-5.6-sol`, low temperature, and a 60 second timeout.
- Burns require exact observed receipts. Sensitive categories force `gentle` intensity.
- No screenshots, no tunnel action, no systemd activation, no em dash, no unverified numbers, and no secret files in git.
- The PR is Draft on `mutation/9-roast-organ`; smoke and anti-leak checks run before push.

---

### Task 1: Backend boundary and roast engine

**Files:**
- Create: `ops/api/server.py`
- Create: `ops/api/fixtures/roast.html`
- Create: `ops/api/test_server.py`
- Create: `ops/living-api.service`

**Interfaces:**
- Produces `normalize_target`, `extract_observations`, `validate_burns`, `roast_payload`, and HTTP `POST /roast`.
- Produces `POST /mutations/propose` with `{issue_url}` and strict CORS/preflight behavior.

- [ ] Write failing unit tests for URL blocking, exact receipt filtering, gentle softening, and mutation field truncation.
- [ ] Run `python3 -m unittest ops/api/test_server.py` and confirm the missing implementation fails.
- [ ] Implement bounded URL validation, redirect validation, HTML extraction, SQLite cache, quotas, model call, fixture mode, and JSON HTTP handlers.
- [ ] Run the unit tests and inspect the structured outputs.

### Task 2: Roast browser route and mutation composer

**Files:**
- Create: `src/roast.ts`
- Create: `src/colony.ts`
- Modify: `src/main.ts`
- Modify: `src/pages.ts`
- Modify: `src/pitch.ts`
- Modify: `src/style.css`

**Interfaces:**
- Produces `renderRoast(root)` and `requestRoast(input)` for the route and WebMCP.
- Produces `proposeMutation(input)` and `stageAgentMessage(message)` for human and agent channels.

- [ ] Add failing TypeScript checks through the route and tool references.
- [ ] Implement the route, intensity skin, anticipation, receipt rendering, severity, pivot context, analytics, and footer affordances.
- [ ] Run `npm run build` and the browser route smoke checks.

### Task 3: WebMCP agent tools

**Files:**
- Modify: `src/webmcp.ts`
- Modify: `ops/smoke.sh`

**Interfaces:**
- Adds `roast_my_site({domain, intensity})` returning structured burns, receipts, territory tags, severity, cache status, and pivot.
- Adds `propose_mutation({type, content, rationale, handle?})` returning the issue URL or a structured error.

- [ ] Add the tools with unknown-input boundary parsing and exact schemas.
- [ ] Stage `Your agent asked for a roast of your own site. Brave.` and mutation confirmation for humans.
- [ ] Run WebMCP cold-start and route assertions.

### Task 4: Ledger boundary regression and smoke lever

**Files:**
- Modify: `ops/ledger_bot.py`
- Modify: `ops/smoke.sh`

- [ ] Change `diff_leaks` to case-insensitive word-boundary regex matching.
- [ ] Extend the smoke to run the fixture API, assert receipts, SSRF rejection, and CORS allow/deny behavior.
- [ ] Run the full smoke and anti-leak scan.

### Task 5: Release artifact

**Files:**
- Create: `RETURN-W3.md` (not committed)

- [ ] Inspect the complete diff and verify no service activation or tunnel operation occurred.
- [ ] Commit implementation on the mutation branch, push it, and create a GitHub Draft PR titled `W3: add receipt-first roast organ and colony mutations`.
- [ ] Record factual commands, outputs, branch, commit, and PR URL in `RETURN-W3.md`.
