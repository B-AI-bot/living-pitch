# Task 1 implementation report

## Status

DONE

## Delivered

- Added the `speed` scene between `follow-through` and `summit` in the existing state machine and HUD.
- Added the T3 Nestor proof beat with industry-selected six-system proof:
  - Recruiting uses `#1 visibility` and `#3 VIP radar`.
  - Consulting and advisory use `#2 process mapper` and `#5 desk research`.
  - Generic and other-services use `#4 the website that adapts to how you read`.
- Added the required in-scene sentence: `the same discipline runs on the site you are playing right now`.
- Staged the CASE CARD, sourced Instantly benchmark, Franck quote, and Trustpilot attribution from one shared first-client copy module. The existing case pages now use that same master for the shared card and quote.
- Moved the existing two canonical speed questions, `speed_to_lead` and `actual_response_time`, into T3. Both remain assigned to the canonical `speedToLead` dimension.

## Files changed

- `src/engine/copy/case.ts`
- `src/engine/types.ts`
- `src/engine/scenes.ts`
- `src/engine/state.ts`
- `src/pitch.ts`
- `src/pages.ts`
- `scripts/scan-smoke.ts`

## Verification

- TDD red: `npm run scan:smoke` failed before implementation because the T3 recruiting proof did not exist.
- Green: `npm run scan:smoke` passed. It checks the two speed question dimensions, all three skin branches, the case card, and the Trustpilot attribution.
- Build: `npm run build` passed with TypeScript and Vite.
- Hygiene: `git diff --check` passed. The changed Task 1 files contain no em dash characters.

## Commit

`9f7722b1d525d6c86da219d7966457a7d9549b0d` (`feat(pitch): add speed proof beat`)

## Concerns

None. `RETURN-W1.md` was already untracked and was left untouched.
