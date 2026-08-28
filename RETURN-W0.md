# RETURN W0

Date: 2026-08-28 UTC

Repository: https://github.com/B-AI-bot/living-pitch

## Status by item

1. **Repo: fait.** Git is initialized, MIT is present for AI Jungle LLC, the ignore rules cover dependencies, builds, env files, and local files, and the README explains the concept, ledger, contribution route, and Leverage Points.

2. **Front: fait in PR, pending human approval.** The home placeholder is on `main`. `/evolution` is implemented on `mutation/1-evolution-page`, renders `public/mutations.json` in reverse chronological order, escapes ledger data before rendering, and shows the requested counters. It is not on public `main` until the ledger approves it.

3. **WebMCP: fait.** `src/webmcp.ts` feature-detects `navigator.modelContext`, isolates registration calls, exposes `get_pitch_state` and `provide_context`, stores context in session storage, and emits `webmcp_tool_call` with tool, success, and duration. The no-agent path returns cleanly.

4. **PostHog: fait.** The browser snippet uses the current site's public project key and EU host. It captures `pageview`, home view, `evolution_view`, and WebMCP tool calls. No personal or server credential is included.

5. **Ledger: code fait, runtime bloqué par token.** `ops/ledger_bot.py` is stdlib-only, idempotent, Telegram long-polls, restricts callbacks to chat `6019993044`, checks the local forbidden-name file before merge, merges with `gh`, records approval latency, commits the changelog through a temporary worktree, and pushes to `main`. The user service is present. `~/.living-pitch.env` does not exist yet, so the bot was not started.

6. **Deploy: prêt, bloqué par token.** `wrangler.toml` has the worker name and static assets configuration with no route. `ops/deploy.sh` waits for `CF_WORKERS_TOKEN`, builds, deploys, and curls the returned workers.dev URL or `LIVING_PITCH_SMOKE_URL`. No deploy was run.

7. **CI: fait.** GitHub Actions installs, builds, and scans changed lines for common credentials, private keys, unexpected PostHog credentials, and token assignments. PR #2 checks passed.

8. **Publication: fait.** The public repository was created and pushed only after the full tracked-tree forbidden-name scan, secret scan, em dash scan, and diff check passed. No DNS, tunnel, or existing site was touched.

9. **Mutation #1: setup fait, merge pending.** Issue #1 is open and PR #2 is open at https://github.com/B-AI-bot/living-pitch/pull/2. The PR is linked to the issue and explicitly says not to merge directly. No direct merge was performed.

10. **Smoke: fait locally.** `ops/smoke.sh` passed on the mutation branch: TypeScript build, Vite preview, `/evolution`, local JSON reference, WebMCP syntax check, forbidden-name scan, and em dash scan. `main` also builds. There is no deployed smoke because the Cloudflare token is absent.

## Waiting for tokens

- Telegram: `LEDGER_BOT_TOKEN` in `~/.living-pitch.env`. The service currently logs `waiting for token` and retries.
- Cloudflare: `CF_WORKERS_TOKEN` in the same file. The deploy script is ready but was not executed.
- The env file stays outside the repository and is never copied into it.

## Traps encountered

- The existing project did not contain a `phx_` key. It contains the public browser PostHog key with the `phc_` prefix, which is used only in the client snippet. The CI treats unexpected additional `phc_` values as credentials.
- GitHub created PR #2 because issue #1 already uses the first number. This is the expected issue plus PR sequence.
- `gh pr merge --delete-branch=false` was removed from the bot because the installed GitHub CLI documents only the positive delete flag. The bot now uses `gh pr merge --squash`, which preserves the branch.
- Local ports 4173 onward were occupied by preview attempts. The smoke script now selects a free local port and uses strict port binding.

## Commands for wake-up

Install and start the user unit:

```sh
cd ~/projects/living-pitch
mkdir -p ~/.config/systemd/user
install -m 0644 ops/living-ledger.service ~/.config/systemd/user/living-ledger.service
systemctl --user daemon-reload
systemctl --user enable --now living-ledger.service
journalctl --user -u living-ledger.service -n 50 --no-pager
```

Test the Telegram credential without printing it:

```sh
cd ~/projects/living-pitch
python3 - <<'PY'
from pathlib import Path
import sys
sys.path.insert(0, "ops")
import ledger_bot

env = ledger_bot.read_env(Path.home() / ".living-pitch.env")
credential = env.get("LEDGER_BOT_TOKEN")
assert credential, "LEDGER_BOT_TOKEN is missing"
result = ledger_bot.telegram_request(credential, "getMe", {})
assert result.get("ok"), result
print("Telegram bot credential works")
PY
systemctl --user restart living-ledger.service
journalctl --user -u living-ledger.service -n 50 --no-pager
```

Inspect the first approval without merging directly:

```sh
cd ~/projects/living-pitch
gh pr view 2 --repo B-AI-bot/living-pitch
gh pr checks 2 --repo B-AI-bot/living-pitch
```

Deploy after the Cloudflare token arrives. The script does nothing if the token is missing:

```sh
cd ~/projects/living-pitch
test -s ~/.living-pitch.env
grep -q '^CF_WORKERS_TOKEN=' ~/.living-pitch.env
./ops/deploy.sh
```

Do not configure the `www` route or cut over DNS during W0.
