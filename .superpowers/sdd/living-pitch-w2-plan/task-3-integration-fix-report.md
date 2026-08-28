# Task 3 live integration fix

## Finding

The live Cal.com assessment event rejected the Task 3 booking payload with HTTP 400 because its custom `responses.topic` field is required.

## Fix

The worker now sends the literal `topic: "Leverage Assessment"` beside the required name, email, notes, and Google Meet location responses. The human confirmation gate and strict HTTP 2xx booking-response parser were not changed.

The focused smoke now checks the exact topic field and verifies that an identifier-bearing Cal.com success body passes `parseCalBooking()` before the worker returns `status: "booked"`.

## Evidence

- Red: `node scripts/task-3-smoke.mjs` exited 1 because the actual booking payload omitted `responses.topic`.
- Green: `node scripts/task-3-smoke.mjs` exited 0 with `Task 3 worker and WebMCP smoke ok`.
- `npm run summit:smoke` exited 0.
- `npm run build` exited 0.

No real booking or Cal.com database access was used.
