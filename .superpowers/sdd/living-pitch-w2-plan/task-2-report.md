# Task 2 report: T4 Memory & Cash

## Delivered

- Added `memory-cash` as Territory 04 between the existing `speed` scene and Summit.
- Kept the canonical scan registry and scoring dimensions unchanged. T4 displays the existing `memory_access` and `cash_control` questions.
- Added the three-step offer exactly as requested:
  - Assessment (credited)
  - First Install $7,500-15,000 fixed
  - Partnership from $5,000/month plus performance share
- Added both verbatim guarantees:
  - Three installable opportunities. Or you pay nothing.
  - the fee comes off your first install
- Kept the T3 speed scene intact, changed its onward control to T4, and moved Summit after T4.
- Corrected the scene/HUD mapping so T4 is index 04 and Summit remains index 05.
- Summit now selects its one CTA by tone:
  - Evidence-first: Book the 30-min call
  - Story-reassurance: Get my 3 installable opportunities →
- Existing PostHog capture remains attached to human scan answers, scene advances, and CTA clicks.

## Tests

`npm run scan:smoke` passed. The added assertions cover T4's two canonical question IDs, Territory 04 copy, all three offer steps, and both guarantees.

`npm run build` passed (`tsc --noEmit && vite build`).

`git diff --check` passed.

## TDD evidence

The new smoke assertion was run before implementation and failed because `sceneQuestions['memory-cash']` was undefined. After implementation, the smoke script passed.

## Scope note

The pre-existing untracked `RETURN-W1.md` was not modified or included in the task commit.
