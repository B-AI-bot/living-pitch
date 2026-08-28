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
npx wrangler deploy

if [[ -n "${LIVING_PITCH_SMOKE_URL:-}" ]]; then
  curl --fail --silent --show-error --location "$LIVING_PITCH_SMOKE_URL" >/dev/null
  echo "smoke ok: $LIVING_PITCH_SMOKE_URL"
else
  echo "deploy ok; set LIVING_PITCH_SMOKE_URL for a post-deploy curl"
fi
