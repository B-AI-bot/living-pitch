#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git grep -n -i -f /home/maida/projects/living-pitch-context/forbidden-names.txt; then
    echo 'anti-leak scan failed' >&2
    exit 1
  fi
fi

if rg -n '—' src README.md; then
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
for route in / /pricing /assessment /method /agents /cases /cases/first-client /book /about /agency /ai /does-not-exist; do
  curl --silent --fail "http://127.0.0.1:$PORT$route" >/tmp/living-pitch-route.html
  grep -q '<div id="app"></div>' /tmp/living-pitch-route.html
done
curl --silent --fail "http://127.0.0.1:$PORT/llms.txt" >/tmp/living-pitch-llms.txt
grep -q 'Human-directed, AI-executed.' /tmp/living-pitch-llms.txt
for tool in provide_context choose_path answer_scan_question raise_objection get_offer_facts get_pitch_state run_leverage_score generate_preliminary_map book_assessment_call get_pitch_summary; do
  grep -q "name: '$tool'" src/webmcp.ts
done
grep -q 'navigator.modelContext' src/webmcp.ts
grep -q 'Watch it change.' src/evolution.ts
echo 'smoke ok'
