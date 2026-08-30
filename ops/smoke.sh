#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build
python3 -m unittest ops/api/test_server.py
python3 -m unittest ops/test_ledger_bot.py

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git grep -n -i -w -f /home/maida/projects/living-pitch-context/forbidden-names.txt -- . ":!*.png"; then
    echo 'anti-leak scan failed' >&2
    exit 1
  fi
fi

copy_fidelity_needles=(
  "WHAT YOU'LL NEVER PAY US FOR"
  'A percentage of your ad spend. Hourly overruns. "Discovery" that discovers you need more discovery. Seats, per-user fees, or any pricing that punishes you for growing. Exit fees: the system runs in your environment, and if you leave, it leaves with you.'
  'THE QUESTIONS THAT DECIDE IT'
  '"What if the install misses its gate?"'
  "Then we fix it on our time until it passes, or we say plainly that we were wrong, and the partnership doesn't start. The gate exists to protect both of us from politeness."
  '"Who owns the system?"'
  "You do. Your environment, your data, your processes encoded. We operate it; we don't hold it hostage."
  '"Can we pause?"'
  "The partnership has a 6-month minimum because systems die without operation and we won't sell you a slow death. After that, you can pause, scale, or take it in-house. Phase four of our method literally trains you for that."
  'WHAT YOU WALK AWAY WITH'
  'The Leverage Map. A document you can act on without us.'
  'Your top three installable opportunities, ranked by dollar impact. Not "AI ideas". Opportunities: each one comes with the process it plugs into, the agent shape that fits it, a fixed install scope, and a draft success gate. A number, not a vibe. Plus the order to install them in, because sequence is half the value.'
  "It's yours. Take it to another vendor if you want. Nobody has, but the door is open, and that's the point."
  'HOW IT RUNS'
  'WEEK 1 · We listen. Interviews with you and the people who actually touch the work. We map how work really flows through your firm, not how the org chart claims it does. This is where the bodies are buried, and everyone knows exactly where.'
  "WEEK 2 · We count. Every leak gets a number: hours lost, delay cost, error cost, deals that died of slowness. Consultants are professional skeptics, so we do the math you'd do to us."
  'WEEK 3 · We hand you the map. A working session, not a reveal. We walk the three opportunities, you push back, we defend or concede. You leave knowing your first install, its price, and its success gate. Then you decide. No countdown timer, no "this offer expires".'
  'WE RUN ON WHAT WE SELL'
  "This site, and the network of businesses around it, is built, QA'd and operated by the same twelve agents we install for clients. The briefs, the follow-ups, the research, the drafts you're reading: agents drafted, a human approved. When you buy from us, you're buying the system we trust our own revenue to. We can't ship you anything we wouldn't run ourselves, because you'd be able to tell."
  "That's the difference between installing a tool and rethinking a firm. Tools all look alike. Firms don't."
  'BRING'
  "Last week's calendar and one task that made you think \"a machine should be doing this by now.\""
  "DON'T BOOK IF"
  "You want AI to replace your judgment, you want unsupervised volume with your name on it, or you're shopping for a demo to forward. We'd be wasting your slot, and slots are the one thing we genuinely don't have many of."
  'WHY "JUNGLE"'
  "Because that's what the AI market is right now. Loud, overgrown, full of things that look impressive and will absolutely eat your budget. You don't survive a jungle with enthusiasm. You survive it with a guide who lives there. We live there: this site, our pipeline, our research, our follow-ups all run on the same twelve agents we install for clients. We eat here first."
  'WHY APPROVAL-FIRST'
  "Because owner-led firms are reputation businesses, and reputations don't die from missed opportunities. They die from one wrong message with your name on it. So we welded the rule into everything before we wrote our first line of client code: nothing ships without your yes. It slows the machine down by ten minutes a day. It's the ten minutes that lets you sleep."
  'THE SHORT VERSION'
  "We rethink your strategy with AI. We build on your processes. We operate every day. We train your team to need us less. Every client from day one is still a client, and part of our pay rides on the numbers we can prove. That's the whole firm, in five sentences that don't require a single slide."
  'BAIBOT · Baboon · The Coordinator'
  "Syncs the team, prioritizes the day, flags the risks before they're fires. Your single point of contact: you talk to Baibot, Baibot runs the rest."
  'BOB · Lion · Sales'
  "Opens doors and turns conversations into deals. Drafts every approach in your voice, works your dormant network, never sends a word you haven't approved."
  'EVA · Dog · Executive Ops'
  'Meetings to minutes to follow-through, with nothing lost. The commitments you make in room three actually happen by Friday.'
  'NESTOR · Hummingbird · Speed-to-lead'
  'Answers the site and the phone before leads go cold. Because the firm that responds in four minutes beats the firm that responds in four hours, almost every time.'
  'MONI · Owl · Finance'
  'Follows invoices, cash, and deadlines through to the end. The polite third reminder you hate sending? Moni drafts it, you approve it, it goes.'
  'MEMO · Elephant · Memory'
  "Keeps the full context and makes your firm's knowledge usable again. The proposal from 2023 that would save you two hours today? Found, summarized, on your desk."
  'SoFI · Giraffe · Signals'
  "Sees over the grass: markets, feeds, role changes, openings, before they're obvious. Your morning brief reads like you have a research desk. You do now."
  'HIPO · Hippo · Marketing'
  "Keeps the brand visible and grows attention every day, in your voice, from your real work. One receipt a week becomes a post, a thread, an article."
  'SENSEI · Panda · Learning'
  'Turns your material into coaching and tracks mastery. New hires stop asking the same five questions, because the answers coach them instead.'
  'JIMMY · Tiger · Builder'
  'Turns ideas into systems your team actually uses. The workflow everyone complains about on Fridays becomes a tool by the next one.'
  'CBO · Parrot · Design'
  'Shapes the visual language and keeps the brand sharp across everything that ships. No more decks that look like three different firms made them.'
  'GORIA · Gorilla · QA & Security'
  'Checks what matters and keeps the systems safe. The agent that audits the other agents, because trust is good and verification is billable.'
  'Starts with: your calendar and your priorities, day one.'
  "Starts with: your ICP and the 200 contacts you've been meaning to call for two years."
  'Starts with: your last ten meetings.'
  'Starts with: the honest truth about your current response time.'
  'Starts with: your aging receivables.'
  'Starts with: ingesting what your firm already knows and forgot it knew.'
  'Starts with: the fifty accounts and people you actually care about.'
  "Starts with: the best material you've already made and stopped using."
  'Starts with: your onboarding pain.'
  'Starts with: that workflow. You know the one.'
  'Starts with: your existing brand assets.'
  'Starts with: before anything else ships. Always.'
)
echo 'copy:fidelity'
for needle in "${copy_fidelity_needles[@]}"; do
  if ! grep -Fq -- "$needle" dist/assets/*.js; then
    echo "copy fidelity failed: $needle" >&2
    exit 1
  fi
done
echo 'copy:fidelity ok'

if rg -n "$(printf '\\u2014')" src README.md; then
  echo 'em dash scan failed' >&2
  exit 1
fi

if [[ -n "${SMOKE_PORT:-}" ]]; then
  PORT="$SMOKE_PORT"
else
  PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
fi
node --experimental-strip-types --check src/webmcp.ts
npm run scan:smoke
npm run share:smoke
npm run summit:smoke
node --experimental-strip-types --input-type=module -e "import('./src/webmcp.ts').then(async ({tools, installWebMcpTools}) => { if (tools.length < 6) throw new Error('WebMCP tool registration is incomplete'); if (await installWebMcpTools()) throw new Error('cold start without agent should degrade cleanly'); console.log('webmcp cold-start smoke ok') })"
node --experimental-strip-types scripts/resident-client-smoke.mjs
npx vite preview --host 127.0.0.1 --port "$PORT" --strictPort >/tmp/living-pitch-preview.log 2>&1 &
PREVIEW_PID=$!
trap 'kill "$PREVIEW_PID" 2>/dev/null || true' EXIT

for _ in {1..20}; do
  if curl --silent --fail "http://127.0.0.1:$PORT/evolution" >/tmp/living-pitch-evolution.html; then
    break
  fi
  sleep 0.25
done

grep -q 'The Living Pitch' /tmp/living-pitch-evolution.html
grep -q 'mutations.json' dist/assets/*.js
grep -q 'board' dist/assets/*.js
grep -q '"/board"' src/worker.js
grep -q '"/rules"' src/worker.js
grep -q 'escapeHtml(entry.contributions' src/board.ts
grep -q 'category-filters' dist/assets/*.js
grep -q 'category-badge' dist/assets/*.js
grep -q '"category": "copy"' public/mutations.json
API_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
API_CACHE="$(mktemp -d)"
RESIDENT_ENABLED=0 ROAST_TEST_MODE=1 ROAST_CACHE_DB="$API_CACHE/roast-cache.db" BOARD_DB="$API_CACHE/board.db" RESIDENT_LOG_PATH="$API_CACHE/resident.jsonl" PORT="$API_PORT" python3 ops/api/server.py >/tmp/living-api-smoke.log 2>&1 &
API_PID=$!
API_MOCK_PID=""
trap 'kill "$PREVIEW_PID" "$API_PID" "$API_MOCK_PID" 2>/dev/null || true; rm -rf "$API_CACHE"' EXIT
for _ in {1..20}; do
  API_STATUS="$(curl --silent --output /tmp/living-api-roast.json --write-out '%{http_code}' -H 'Origin: https://living-pitch.welcometotheaijungle.workers.dev' -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"scorched"}' "http://127.0.0.1:$API_PORT/roast" || true)"
  if [[ "$API_STATUS" == "200" ]]; then break; fi
  sleep 0.25
done
[[ "$API_STATUS" == "200" ]]
python3 -c 'import json; p=json.load(open("/tmp/living-api-roast.json")); assert p["burns"] and all(item["receipt"].strip() for item in p["burns"]); assert p["pivot"]["line"].startswith("Every joke above")'
curl --silent --fail --dump-header /tmp/living-api-board-cors.txt -H 'Origin: https://www.welcometotheaijungle.com' "http://127.0.0.1:$API_PORT/board?cache-bust=1" >/tmp/living-api-board-empty.json
grep -qi '^Access-Control-Allow-Origin: https://www.welcometotheaijungle.com' /tmp/living-api-board-cors.txt
python3 -c 'import json; p=json.load(open("/tmp/living-api-board-empty.json")); assert p["today"] == [] and p["alltime"] == [] and p["ticker"] == [] and p["categories"] == ["dev", "copy", "seo", "design", "business", "qa"] and p["crowns"]["today"]["copy"] is None'
BOARD_DB="$API_CACHE/board.db" BOARD_LEDGER="$ROOT/public/mutations.json" python3 ops/api/board_admin.py add --kind burn --handle '@smoke' --points 15 --title 'Smoke accepted burn' --category copy >/tmp/living-api-board-add.json
BOARD_ID="$(python3 -c 'import json; print(json.load(open("/tmp/living-api-board-add.json"))["id"])')"
curl --silent --fail "http://127.0.0.1:$API_PORT/board" >/tmp/living-api-board-added.json
python3 -c 'import json; p=json.load(open("/tmp/living-api-board-added.json")); assert p["alltime"][0]["handle"] == "@smoke" and p["alltime"][0]["points"] == 15'
curl --silent --fail "http://127.0.0.1:$API_PORT/board?category=copy" >/tmp/living-api-board-copy.json
python3 -c 'import json; p=json.load(open("/tmp/living-api-board-copy.json")); assert p["alltime"][0]["handle"] == "@smoke" and p["alltime"][0]["contributions"][0]["category"] == "copy" and p["crowns"]["alltime"]["copy"] == "@smoke"'
BOARD_DB="$API_CACHE/board.db" python3 ops/api/board_admin.py recat "$BOARD_ID" qa >/tmp/living-api-board-recat.json
curl --silent --fail "http://127.0.0.1:$API_PORT/board?category=qa" >/tmp/living-api-board-qa.json
python3 -c 'import json; p=json.load(open("/tmp/living-api-board-qa.json")); assert p["alltime"][0]["handle"] == "@smoke" and p["alltime"][0]["contributions"][0]["category"] == "qa"'
category_status="$(curl --silent --output /tmp/living-api-board-invalid.json --write-out '%{http_code}' "http://127.0.0.1:$API_PORT/board?category=unknown")"
[[ "$category_status" == "400" ]]
curl --silent --fail --dump-header /tmp/living-api-utm-cors.txt -X POST -H 'Origin: https://www.welcometotheaijungle.com' -H 'Content-Type: application/json' --data '{"ref":"@smoke","visitor_id":"visitor-1"}' "http://127.0.0.1:$API_PORT/visits/utm" >/tmp/living-api-visit-first.json
grep -qi '^Access-Control-Allow-Origin: https://www.welcometotheaijungle.com' /tmp/living-api-utm-cors.txt
for visitor in $(seq 2 22); do
  curl --silent --fail -X POST -H 'Origin: https://www.welcometotheaijungle.com' -H 'Content-Type: application/json' --data "{\"ref\":\"@smoke\",\"visitor_id\":\"visitor-$visitor\"}" "http://127.0.0.1:$API_PORT/visits/utm" >/tmp/living-api-visit.json
done
curl --silent --fail "http://127.0.0.1:$API_PORT/board" >/tmp/living-api-board-capped.json
python3 -c 'import json; p=json.load(open("/tmp/living-api-board-capped.json")); entry=next(item for item in p["alltime"] if item["handle"] == "@smoke"); assert entry["points"] == 35 and entry["breakdown"]["share"]["count"] == 20'
curl --silent --fail --output /tmp/living-api-roast-cached.json -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"scorched"}' "http://127.0.0.1:$API_PORT/roast"
python3 -c 'import json; p=json.load(open("/tmp/living-api-roast-cached.json")); assert p["cached"] is True'
resident_payload='{"message":"Who operates the system after launch?","state":{"skin":{"tone":"story-reassurance","industry":"other-services","seed":"smoke","generic":false},"scene":"follow-through","score":42,"beatsCovered":["basecamp","pipeline"],"objectionsRaised":[]},"channel":"agent"}'
resident_status="$(curl --silent --output /tmp/living-api-resident-off.json --write-out '%{http_code}' -H 'Content-Type: application/json' --data "$resident_payload" "http://127.0.0.1:$API_PORT/resident")"
[[ "$resident_status" == "503" ]]
python3 -c 'import json; p=json.load(open("/tmp/living-api-resident-off.json")); assert p == {"status": "warming_up", "fallback": "canned"}'
grep -q 'The resident is warming up. Here is what I can answer today.' dist/assets/*.js
MOCK_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
RESIDENT_ENABLED=1 RESIDENT_MOCK=1 RESIDENT_LOG_PATH="$API_CACHE/resident-mock.jsonl" PORT="$MOCK_PORT" python3 ops/api/server.py >/tmp/living-api-resident-mock.log 2>&1 &
API_MOCK_PID=$!
for _ in {1..20}; do
  MOCK_STATUS="$(curl --silent --output /tmp/living-api-resident-mock.json --write-out '%{http_code}' -H 'Content-Type: application/json' --data "$resident_payload" "http://127.0.0.1:$MOCK_PORT/resident" || true)"
  if [[ "$MOCK_STATUS" == "200" ]]; then break; fi
  sleep 0.25
done
[[ "$MOCK_STATUS" == "200" ]]
python3 -c 'import json; p=json.load(open("/tmp/living-api-resident-mock.json")); assert set(p) == {"answer_for_agent", "stage_render", "action"}; assert p["stage_render"].startswith("Your agent asks: "); assert p["action"] is None'
for blocked in localhost 169.254.169.254; do
  status="$(curl --silent --output /tmp/living-api-blocked.json --write-out '%{http_code}' -H 'Content-Type: application/json' --data "{\"domain\":\"$blocked\",\"intensity\":\"honest\"}" "http://127.0.0.1:$API_PORT/roast")"
  [[ "$status" == "400" ]]
done
curl --silent --dump-header /tmp/living-api-cors.txt --output /dev/null -H 'Origin: https://living-pitch.welcometotheaijungle.workers.dev' -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"gentle"}' "http://127.0.0.1:$API_PORT/roast"
grep -qi '^Access-Control-Allow-Origin: https://living-pitch.welcometotheaijungle.workers.dev' /tmp/living-api-cors.txt
curl --silent --dump-header /tmp/living-api-preflight.txt --output /dev/null -X OPTIONS -H 'Origin: https://welcometotheaijungle.com' -H 'Access-Control-Request-Method: POST' "http://127.0.0.1:$API_PORT/roast"
grep -qi '^Access-Control-Allow-Origin: https://welcometotheaijungle.com' /tmp/living-api-preflight.txt
grep -qi '^Access-Control-Allow-Methods: GET, POST, OPTIONS' /tmp/living-api-preflight.txt
curl --silent --dump-header /tmp/living-api-cors-denied.txt --output /dev/null -H 'Origin: https://evil.example' -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"gentle"}' "http://127.0.0.1:$API_PORT/roast"
! grep -qi '^Access-Control-Allow-Origin:' /tmp/living-api-cors-denied.txt
for route in / /pricing /assessment /method /agents /cases /cases/first-client /book /about /agency /ai /roast /board /rules /does-not-exist; do
  curl --silent --fail "http://127.0.0.1:$PORT$route" >/tmp/living-pitch-route.html
  grep -q "<div id=\"app\">" /tmp/living-pitch-route.html
done
curl --silent --fail "http://127.0.0.1:$PORT/llms.txt" >/tmp/living-pitch-llms.txt
grep -q 'Human-directed, AI-executed.' /tmp/living-pitch-llms.txt
for tool in provide_context choose_path answer_scan_question raise_objection get_offer_facts get_pitch_state run_leverage_score generate_preliminary_map book_assessment_call get_pitch_summary roast_my_site talk_to_resident propose_mutation; do
  grep -q "name: '$tool'" src/webmcp.ts
done
grep -q 'navigator.modelContext' src/webmcp.ts
grep -q 'Watch it change.' src/evolution.ts
# Design tokens guard: the warm charte must survive every merge (lost once in a rebase).
CSS_FILE=$(ls dist/assets/index-*.css | head -1)
grep -q 'f3eada' "$CSS_FILE"
if grep -q 'Inter,' "$CSS_FILE"; then echo 'design token guard failed: legacy Inter theme detected' >&2; exit 1; fi
echo 'smoke ok'
