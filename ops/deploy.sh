#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${LIVING_PITCH_ENV_FILE:-$HOME/.living-pitch.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "waiting for Cloudflare token: $ENV_FILE does not exist" >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${CF_WORKERS_TOKEN:-}" ]]; then
  echo "waiting for Cloudflare token: CF_WORKERS_TOKEN is not set" >&2
  exit 2
fi

export CLOUDFLARE_API_TOKEN="$CF_WORKERS_TOKEN"
cd "$ROOT"
npm run build

DEPLOY_OUTPUT="$(npx wrangler deploy 2>&1 | tee /tmp/living-pitch-deploy.log)"
DEPLOY_URL="$(printf '%s\n' "$DEPLOY_OUTPUT" | grep -Eo 'https://[^[:space:]]+\.workers\.dev' | head -n 1 || true)"

SMOKE_URL="${LIVING_PITCH_SMOKE_URL:-$DEPLOY_URL}"
if [[ -n "$SMOKE_URL" ]]; then
  for attempt in 1 2 3; do
    if curl --fail --silent --show-error --location "$SMOKE_URL" >/dev/null; then
      echo "smoke ok: $SMOKE_URL (attempt $attempt)"
      exit 0
    fi
    if [[ "$attempt" -lt 3 ]]; then
      echo "smoke attempt $attempt failed; waiting 5s for workers.dev propagation" >&2
      sleep 5
    fi
  done
  echo "smoke failed after 3 attempts: $SMOKE_URL" >&2
  exit 1
else
  echo "deploy ok; no workers.dev URL was returned for the post-deploy smoke" >&2
  exit 1
fi
