#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build
python3 -m unittest ops/api/test_server.py
python3 -m unittest ops/test_ledger_bot.py

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git grep -n -i -f /home/maida/projects/living-pitch-context/forbidden-names.txt; then
    echo 'anti-leak scan failed' >&2
    exit 1
  fi
fi

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
npm run summit:smoke
node --experimental-strip-types --input-type=module -e "import('./src/webmcp.ts').then(async ({tools, installWebMcpTools}) => { if (tools.length < 6) throw new Error('WebMCP tool registration is incomplete'); if (await installWebMcpTools()) throw new Error('cold start without agent should degrade cleanly'); console.log('webmcp cold-start smoke ok') })"
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
API_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
API_CACHE="$(mktemp -d)"
ROAST_TEST_MODE=1 ROAST_CACHE_DB="$API_CACHE/roast-cache.db" PORT="$API_PORT" python3 ops/api/server.py >/tmp/living-api-smoke.log 2>&1 &
API_PID=$!
trap 'kill "$PREVIEW_PID" "$API_PID" 2>/dev/null || true; rm -rf "$API_CACHE"' EXIT
for _ in {1..20}; do
  API_STATUS="$(curl --silent --output /tmp/living-api-roast.json --write-out '%{http_code}' -H 'Origin: https://living-pitch.welcometotheaijungle.workers.dev' -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"scorched"}' "http://127.0.0.1:$API_PORT/roast" || true)"
  if [[ "$API_STATUS" == "200" ]]; then break; fi
  sleep 0.25
done
[[ "$API_STATUS" == "200" ]]
python3 -c 'import json; p=json.load(open("/tmp/living-api-roast.json")); assert p["burns"] and all(item["receipt"].strip() for item in p["burns"]); assert p["pivot"]["line"].startswith("Every joke above")'
curl --silent --fail --output /tmp/living-api-roast-cached.json -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"scorched"}' "http://127.0.0.1:$API_PORT/roast"
python3 -c 'import json; p=json.load(open("/tmp/living-api-roast-cached.json")); assert p["cached"] is True'
for blocked in localhost 169.254.169.254; do
  status="$(curl --silent --output /tmp/living-api-blocked.json --write-out '%{http_code}' -H 'Content-Type: application/json' --data "{\"domain\":\"$blocked\",\"intensity\":\"honest\"}" "http://127.0.0.1:$API_PORT/roast")"
  [[ "$status" == "400" ]]
done
curl --silent --dump-header /tmp/living-api-cors.txt --output /dev/null -H 'Origin: https://living-pitch.welcometotheaijungle.workers.dev' -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"gentle"}' "http://127.0.0.1:$API_PORT/roast"
grep -qi '^Access-Control-Allow-Origin: https://living-pitch.welcometotheaijungle.workers.dev' /tmp/living-api-cors.txt
curl --silent --dump-header /tmp/living-api-preflight.txt --output /dev/null -X OPTIONS -H 'Origin: https://welcometotheaijungle.com' -H 'Access-Control-Request-Method: POST' "http://127.0.0.1:$API_PORT/roast"
grep -qi '^Access-Control-Allow-Origin: https://welcometotheaijungle.com' /tmp/living-api-preflight.txt
grep -qi '^Access-Control-Allow-Methods: POST, OPTIONS' /tmp/living-api-preflight.txt
curl --silent --dump-header /tmp/living-api-cors-denied.txt --output /dev/null -H 'Origin: https://evil.example' -H 'Content-Type: application/json' --data '{"domain":"fixture.local","intensity":"gentle"}' "http://127.0.0.1:$API_PORT/roast"
! grep -qi '^Access-Control-Allow-Origin:' /tmp/living-api-cors-denied.txt
for route in / /pricing /assessment /method /agents /cases /cases/first-client /book /about /agency /ai /roast /does-not-exist; do
  curl --silent --fail "http://127.0.0.1:$PORT$route" >/tmp/living-pitch-route.html
  grep -q '<div id="app"></div>' /tmp/living-pitch-route.html
done
curl --silent --fail "http://127.0.0.1:$PORT/llms.txt" >/tmp/living-pitch-llms.txt
grep -q 'Human-directed, AI-executed.' /tmp/living-pitch-llms.txt
for tool in provide_context choose_path answer_scan_question raise_objection get_offer_facts get_pitch_state run_leverage_score generate_preliminary_map book_assessment_call get_pitch_summary roast_my_site propose_mutation; do
  grep -q "name: '$tool'" src/webmcp.ts
done
grep -q 'navigator.modelContext' src/webmcp.ts
grep -q 'Watch it change.' src/evolution.ts
echo 'smoke ok'
