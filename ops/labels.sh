#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${GITHUB_REPOSITORY:-B-AI-bot/living-pitch}"

mapfile -t categories < <(PYTHONPATH="$ROOT/ops/api" python3 -c 'from board_store import CATEGORIES; print("\n".join(CATEGORIES))')
for category in "${categories[@]}"; do
  label="cat:$category"
  if ! gh label create "$label" --repo "$REPO" --description "Living Pitch board category: $category" --color 1f6f5b >/dev/null 2>&1; then
    gh label edit "$label" --repo "$REPO" --description "Living Pitch board category: $category" --color 1f6f5b >/dev/null
  fi
done

echo "category labels ready for $REPO"
