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

if [[ -n "${LIVING_PITCH_SMOKE_URL:-}" ]]; then
  curl --fail --silent --show-error --location "$LIVING_PITCH_SMOKE_URL" >/dev/null
  echo "smoke ok: $LIVING_PITCH_SMOKE_URL"
elif [[ -n "$DEPLOY_URL" ]]; then
  curl --fail --silent --show-error --location "$DEPLOY_URL" >/dev/null
  echo "smoke ok: $DEPLOY_URL"
else
  echo "deploy ok; no workers.dev URL was returned for the post-deploy curl"
fi
