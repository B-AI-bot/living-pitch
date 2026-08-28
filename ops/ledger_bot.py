#!/usr/bin/env python3
"""Telegram approval ledger for The Living Pitch.

The bot deliberately uses only the Python standard library. It has one write
path: a human Telegram approval, followed by the GitHub merge and changelog
commit. The local state file makes notifications and callbacks idempotent.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = Path(os.environ.get("LIVING_PITCH_ENV_FILE", Path.home() / ".living-pitch.env"))
FORBIDDEN_FILE = Path("/home/maida/projects/living-pitch-context/forbidden-names.txt")
STATE_FILE = Path(os.environ.get("LIVING_PITCH_LEDGER_STATE", Path.home() / ".local/state/living-pitch-ledger.json"))
CHAT_ID = "6019993044"
POLL_SECONDS = 30
TELEGRAM_TIMEOUT = 55

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
LOG = logging.getLogger("living-pitch-ledger")


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:]
        key, separator, value = line.partition("=")
        if separator:
            values[key.strip()] = value.strip().strip("'\"")
    return values


def telegram_request(bot_token: str, method: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        f"https://api.telegram.org/bot{bot_token}/{method}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=TELEGRAM_TIMEOUT) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Telegram {method} failed: {error}") from error
    if not result.get("ok"):
        raise RuntimeError(f"Telegram {method} rejected the request: {result}")
    return result


def run_gh(*args: str, cwd: Path = ROOT) -> str:
    command = ["gh", *args]
    completed = subprocess.run(command, cwd=cwd, check=True, capture_output=True, text=True)
    return completed.stdout


def load_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {"notified": {}, "handled": [], "telegram_offset": 0}
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        LOG.warning("state file unreadable, starting a fresh state")
        return {"notified": {}, "handled": [], "telegram_offset": 0}
    state.setdefault("notified", {})
    state.setdefault("handled", [])
    state.setdefault("telegram_offset", 0)
    return state


def save_state(state: dict[str, Any]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = STATE_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temporary.replace(STATE_FILE)


def list_open_prs() -> list[dict[str, Any]]:
    raw = run_gh(
        "pr",
        "list",
        "--state",
        "open",
        "--limit",
        "100",
        "--json",
        "number,title,author,url,createdAt",
    )
    return json.loads(raw)


def forbidden_names() -> list[str]:
    if not FORBIDDEN_FILE.exists():
        raise RuntimeError(f"missing local forbidden-names file: {FORBIDDEN_FILE}")
    return [line.strip().lower() for line in FORBIDDEN_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]


def diff_leaks(pr_number: int) -> list[str]:
    diff = run_gh("pr", "diff", str(pr_number), "--patch").lower()
    return [name for name in forbidden_names() if name in diff]


def author_name(pr: dict[str, Any]) -> str:
    author = pr.get("author") or {}
    return str(author.get("login") or "unknown contributor")


def approval_keyboard(pr_number: int) -> dict[str, Any]:
    return {
        "inline_keyboard": [[
            {"text": "Approve", "callback_data": f"approve:{pr_number}"},
            {"text": "Reject", "callback_data": f"reject:{pr_number}"},
        ]]
    }


def notify_new_pr(bot_token: str, pr: dict[str, Any], state: dict[str, Any]) -> None:
    number = str(pr["number"])
    text = (
        f"Living Pitch PR #{number}\n"
        f"{pr['title']}\n"
        f"Proposed by: {author_name(pr)}\n"
        f"{pr['url']}\n\n"
        "Nothing ships without a human yes. Review the diff before choosing."
    )
    telegram_request(bot_token, "sendMessage", {
        "chat_id": CHAT_ID,
        "text": text,
        "reply_markup": approval_keyboard(int(number)),
        "disable_web_page_preview": True,
    })
    state["notified"][number] = {"sent_at": time.time(), "title": pr["title"]}
    save_state(state)
    LOG.info("notified Telegram about PR #%s", number)


def answer_callback(bot_token: str, callback_id: str, text: str) -> None:
    telegram_request(bot_token, "answerCallbackQuery", {"callback_query_id": callback_id, "text": text})


def clear_buttons(bot_token: str, query: dict[str, Any]) -> None:
    message = query.get("message") or {}
    if "message_id" not in message:
        return
    telegram_request(bot_token, "editMessageReplyMarkup", {
        "chat_id": str((message.get("chat") or {}).get("id", CHAT_ID)),
        "message_id": message["message_id"],
        "reply_markup": {"inline_keyboard": []},
    })


def tell(bot_token: str, text: str) -> None:
    telegram_request(bot_token, "sendMessage", {"chat_id": CHAT_ID, "text": text})


def close_pr(number: int, comment: str) -> None:
    run_gh("pr", "comment", str(number), "--body", comment)
    run_gh("pr", "close", str(number))


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def append_mutation(pr: dict[str, Any], latency_s: int) -> None:
    worktree = Path(tempfile.mkdtemp(prefix="living-pitch-ledger-"))
    try:
        run_gh("repo", "view", "--json", "nameWithOwner")
        subprocess.run(["git", "fetch", "origin", "main"], cwd=ROOT, check=True, capture_output=True, text=True)
        subprocess.run(["git", "worktree", "add", "--detach", str(worktree), "origin/main"], cwd=ROOT, check=True, capture_output=True, text=True)
        mutation_file = worktree / "public/mutations.json"
        mutations = json.loads(mutation_file.read_text(encoding="utf-8"))
        next_id = max((int(item["id"]) for item in mutations), default=0) + 1
        mutations.append({
            "id": next_id,
            "ts": iso_now(),
            "title": str(pr["title"]),
            "detail": f"PR #{pr['number']} shipped through the approval ledger.",
            "proposed_by": author_name(pr),
            "approved_by": "Loic",
            "latency_s": latency_s,
            "verified": False,
        })
        mutation_file.write_text(json.dumps(mutations, indent=2) + "\n", encoding="utf-8")
        subprocess.run(["git", "add", "public/mutations.json"], cwd=worktree, check=True)
        subprocess.run([
            "git", "-c", "user.name=Living Pitch Ledger", "-c", "user.email=ledger@living-pitch.local",
            "commit", "-m", f"chore(ledger): record mutation {next_id}",
        ], cwd=worktree, check=True, capture_output=True, text=True)
        subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=worktree, check=True, capture_output=True, text=True)
        LOG.info("recorded mutation %s for PR #%s", next_id, pr["number"])
    finally:
        subprocess.run(["git", "worktree", "remove", "--force", str(worktree)], cwd=ROOT, check=False, capture_output=True, text=True)
        shutil.rmtree(worktree, ignore_errors=True)


def approve_pr(bot_token: str, number: int, state: dict[str, Any]) -> None:
    pr = json.loads(run_gh("pr", "view", str(number), "--json", "number,title,author,url,createdAt"))
    leaks = diff_leaks(number)
    if leaks:
        names = ", ".join(sorted(leaks))
        close_pr(number, "Thanks for the contribution. We cannot accept this PR because its diff contains unpublished material. Please remove it and open a new PR.")
        tell(bot_token, f"PR #{number} refused by the safety check. Matched unpublished material: {names}")
        LOG.warning("refused PR #%s after anti-leak match: %s", number, names)
        return

    run_gh("pr", "merge", str(number), "--squash", "--delete-branch=false")
    sent_at = float(state["notified"].get(str(number), {}).get("sent_at", time.time()))
    latency = max(0, round(time.time() - sent_at))
    append_mutation(pr, latency)
    tell(bot_token, f"PR #{number} approved, merged, and recorded in the public changelog. Approval latency: {latency}s.")


def reject_pr(bot_token: str, number: int) -> None:
    close_pr(number, "Thanks for the contribution. This PR is not ready for the living pitch yet. Please open a follow-up when you have a revised proposal.")
    tell(bot_token, f"PR #{number} rejected and closed politely. Nothing shipped.")


def process_callback(bot_token: str, query: dict[str, Any], state: dict[str, Any]) -> None:
    message = query.get("message") or {}
    chat = str((message.get("chat") or {}).get("id", ""))
    callback_id = str(query.get("id", ""))
    if chat != CHAT_ID:
        if callback_id:
            answer_callback(bot_token, callback_id, "This ledger is controlled by the owner.")
        return

    data = str(query.get("data", ""))
    action, separator, number_text = data.partition(":")
    if not separator or action not in {"approve", "reject"} or not number_text.isdigit():
        if callback_id:
            answer_callback(bot_token, callback_id, "Unknown ledger action.")
        return
    number = int(number_text)
    key = f"{action}:{number}"
    if key in state["handled"]:
        if callback_id:
            answer_callback(bot_token, callback_id, "Already handled.")
        return

    if callback_id:
        answer_callback(bot_token, callback_id, "Checking the ledger…")
    if action == "approve":
        approve_pr(bot_token, number, state)
    else:
        reject_pr(bot_token, number)
    state["handled"].append(key)
    save_state(state)
    clear_buttons(bot_token, query)


def poll_updates(bot_token: str, state: dict[str, Any]) -> None:
    result = telegram_request(bot_token, "getUpdates", {
        "offset": int(state.get("telegram_offset", 0)),
        "timeout": TELEGRAM_TIMEOUT,
        "allowed_updates": ["callback_query"],
    })
    for update in result.get("result", []):
        state["telegram_offset"] = int(update["update_id"]) + 1
        query = update.get("callback_query")
        if query:
            process_callback(bot_token, query, state)
        save_state(state)


def cycle(bot_token: str, state: dict[str, Any]) -> None:
    for pr in list_open_prs():
        if str(pr["number"]) not in state["notified"]:
            notify_new_pr(bot_token, pr, state)
    poll_updates(bot_token, state)


def main() -> None:
    LOG.info("living ledger starting for %s", ROOT)
    while True:
        env = read_env(ENV_FILE)
        bot_token = env.get("LEDGER_BOT_TOKEN", "")
        if not bot_token:
            LOG.info("waiting for token")
            time.sleep(POLL_SECONDS)
            continue
        try:
            cycle(bot_token, load_state())
        except Exception:
            LOG.exception("ledger cycle failed; will retry")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
