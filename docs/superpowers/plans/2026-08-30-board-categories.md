# W5b board categories implementation plan

> **For agentic workers:** Execute this plan task-by-task with tests at each boundary.

**Goal:** Add extensible contribution categories to the W5 board, ledger bot, mutation intake, public changelog, and UI while preserving the existing 50/15/10/1 scoring.

**Architecture:** Python owns the single category registry and validates every external category at the API, CLI, GitHub, and SQLite boundaries. SQLite stores one category per contribution, the board API filters rows and derives category crowns, and TypeScript parses the returned payload before rendering category chips, crowns, badges, and empty states. The public mutation ledger keeps `category` optional for backward-compatible reads and defaults missing entries to `dev`.

**Tech Stack:** Python stdlib, SQLite, GitHub CLI, Telegram Bot API, TypeScript, Vite, shell smoke scripts.

**Spec:** User-provided W5b requirements in the conversation.

## Global constraints

- Seed categories are exactly `dev`, `copy`, `seo`, `design`, `business`, and `qa`.
- The category list is extensible through one backend registry and is served by `GET /board`; the front end must not hardcode it.
- Every category uses the existing 50/15/10/1 point schedule.
- Author labels `cat:<x>` win; type mapping is `burn/objection/copy -> copy`, `bug -> qa`, `idea -> business`; file heuristics are the fallback.
- Telegram approval cards display the retained category.
- The public output contains no unpublished names and no em dash characters.
- `RETURN-W5B.md` remains uncommitted.

---

### Task 1: Test contracts

**Files:**
- Modify: `ops/api/test_server.py`
- Modify: `ops/test_ledger_bot.py`
- Create: `ops/labels.sh`
- Modify: `ops/smoke.sh`

- [ ] Add tests for valid and invalid categories, legacy SQLite migration, category persistence, category filtering, category crowns, type mapping, and label/file classification.
- [ ] Run the focused tests and observe failures caused by the missing W5b behavior.
- [ ] Keep test fixtures temporary and do not use real credentials or external GitHub state.

### Task 2: Backend board domain

**Files:**
- Modify: `ops/api/board_store.py`
- Modify: `ops/api/server.py`
- Modify: `ops/api/board_admin.py`

**Interfaces:**
- `CATEGORIES` is the single ordered category registry.
- `add_contribution(..., category="dev")` validates and persists the category.
- `board_snapshot(..., category=None)` returns `categories`, `crowns.today`, `crowns.alltime`, and filtered board arrays.
- `MutationInput` carries the optional validated category and defaulted type mapping.

- [ ] Run an idempotent boot migration that adds `category TEXT NOT NULL DEFAULT 'dev'` to existing `contributions` tables and indexes it.
- [ ] Include categories in every seeded legacy ledger row, using the entry field when valid and `dev` otherwise.
- [ ] Filter all three board views by `category` when requested.
- [ ] Derive crowns from top ranked contributors per category, with `None` for unclaimed categories.
- [ ] Parse `GET /board?category=x`, return a 400 error for unknown categories, and avoid caching one category response under another query.

### Task 3: Intake and ledger bot

**Files:**
- Modify: `ops/ledger_bot.py`
- Modify: `ops/api/server.py`
- Modify: `src/colony.ts`
- Modify: `src/webmcp.ts`
- Modify: `ops/test_ledger_bot.py`
- Modify: `ops/api/test_server.py`
- Create: `ops/labels.sh`

- [ ] Implement author-label lookup with `gh pr view --json labels`, then file-name fallback from `gh pr diff --name-only`.
- [ ] Use the type mapping for mutation proposals and return the retained category in the issue response.
- [ ] Add the optional category enum to the browser form and WebMCP schema from the API registry contract.
- [ ] Add an idempotent label provisioning script for all six `cat:<category>` labels.
- [ ] Include `[cat: <category>]` in Telegram approval messages and persist that category on contribution and mutation receipt.

### Task 4: Public UI and backfill

**Files:**
- Modify: `src/board.ts`
- Modify: `src/rules.ts`
- Modify: `src/evolution.ts`
- Modify: `src/style.css`
- Modify: `public/mutations.json`

- [ ] Render server-provided All plus category chips, filtered board requests, category crowns for Today and All-time, category badges on entries and ticker, and the exact category empty message.
- [ ] Add a six-line Categories rules section describing classification.
- [ ] Treat missing mutation categories as `dev` and render badges.
- [ ] Add honest title-based categories to all existing mutation entries.
- [ ] Keep rendering escaped user-controlled strings.

### Task 5: Verification and delivery

**Files:**
- Modify: `ops/smoke.sh`
- Create: `RETURN-W5B.md` (leave uncommitted)

- [ ] Run focused Python tests, TypeScript build, full smoke, and live preview checks.
- [ ] Exercise category filter, empty crown, recat, label-to-category, type-to-category, and evolution backfill.
- [ ] Run anti-leak and em dash scans and inspect the final diff.
- [ ] Commit implementation, push branch, create a draft PR, and write the return report without adding it to Git.

