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

UPLOAD_OUTPUT="$(npx wrangler versions upload 2>&1 | tee /tmp/living-pitch-preview.log)"
PREVIEW_URL="$(printf '%s\n' "$UPLOAD_OUTPUT" | grep -Eo 'https://[^[:space:]]+\.workers\.dev[^[:space:]]*' | head -n 1 || true)"
if [[ -n "$PREVIEW_URL" ]]; then
  echo "preview URL: $PREVIEW_URL"
else
  echo "preview upload completed; Wrangler did not return a workers.dev URL" >&2
fi
