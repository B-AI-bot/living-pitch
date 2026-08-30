#!/usr/bin/env python3
"""SQLite persistence and ranking rules for the public contribution board."""

from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = Path.home() / ".living-pitch-api" / "board.db"
DEFAULT_LEDGER_PATH = ROOT / "public" / "mutations.json"
ALLOWED_KINDS = {"pr", "burn", "mutation", "share"}
POINTS_BY_KIND = {"pr": 50, "burn": 15, "mutation": 10, "share": 1}
CATEGORIES = ("dev", "copy", "seo", "design", "business", "qa")
MUTATION_CATEGORY_BY_TYPE = {
    "burn": "copy",
    "objection": "copy",
    "copy": "copy",
    "bug": "qa",
    "idea": "business",
}
VISIT_CAP = 20
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


class BoardError(ValueError):
    """A contribution or visitor payload failed a system boundary."""


def db_path_from_env() -> Path:
    return Path(os.environ.get("BOARD_DB", DEFAULT_DB_PATH))


def ledger_path_from_env() -> Path:
    return Path(os.environ.get("BOARD_LEDGER", DEFAULT_LEDGER_PATH))


def validate_category(value: object) -> str:
    if not isinstance(value, str) or value not in CATEGORIES:
        raise BoardError(f"category must be one of: {', '.join(CATEGORIES)}")
    return value


def category_for_type(kind: str) -> str:
    return MUTATION_CATEGORY_BY_TYPE[kind]


def _connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS contributions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            kind TEXT NOT NULL CHECK (kind IN ('pr', 'burn', 'mutation', 'share')),
            points INTEGER NOT NULL,
            handle TEXT NOT NULL,
            url TEXT,
            title TEXT NOT NULL,
            source_ref TEXT NOT NULL UNIQUE,
            impact_multiplier INTEGER NOT NULL DEFAULT 1 CHECK (impact_multiplier BETWEEN 1 AND 3),
            category TEXT NOT NULL DEFAULT 'dev'
        );
        CREATE INDEX IF NOT EXISTS contributions_ts_idx ON contributions(ts);
        CREATE INDEX IF NOT EXISTS contributions_handle_idx ON contributions(handle);
        CREATE TABLE IF NOT EXISTS utm_visits (
            day TEXT NOT NULL,
            ref TEXT NOT NULL,
            visitor_id TEXT NOT NULL,
            client_ip TEXT NOT NULL,
            ts TEXT NOT NULL,
            PRIMARY KEY (day, ref, visitor_id)
        );
        """
    )
    columns = {row[1] for row in connection.execute("PRAGMA table_info(contributions)")}
    if "category" not in columns:
        connection.execute("ALTER TABLE contributions ADD COLUMN category TEXT NOT NULL DEFAULT 'dev'")
    connection.execute("CREATE INDEX IF NOT EXISTS contributions_category_idx ON contributions(category)")
    return connection


def _utc_iso(value: str | datetime | None) -> str:
    if value is None:
        current = datetime.now(timezone.utc)
    elif isinstance(value, datetime):
        current = value
    elif isinstance(value, str):
        try:
            current = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise BoardError("ts must be an ISO timestamp") from error
    else:
        raise BoardError("ts must be an ISO timestamp")
    if current.tzinfo is None:
        raise BoardError("ts must include a timezone")
    return current.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _text(value: object, field: str, limit: int, required: bool = True) -> str:
    if not isinstance(value, str):
        raise BoardError(f"{field} must be a string")
    result = value.strip()
    if required and not result:
        raise BoardError(f"{field} is required")
    if len(result) > limit:
        raise BoardError(f"{field} must be {limit} characters or fewer")
    if _CONTROL_CHARS.search(result):
        raise BoardError(f"{field} contains control characters")
    return result


def _handle(value: object) -> str:
    return _text(value, "handle", 40)


def _utm_ref(value: object) -> str:
    result = _handle(value)
    if result.casefold() != "anon" and not re.fullmatch(r"@?[A-Za-z0-9_.-]{1,40}", result):
        raise BoardError("ref must be anon or a simple handle")
    return result


def _url(value: object) -> str | None:
    if value is None or value == "":
        return None
    result = _text(value, "url", 2048)
    try:
        parsed = urlsplit(result)
    except ValueError as error:
        raise BoardError("url must be an HTTP(S) URL") from error
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise BoardError("url must be an HTTP(S) URL")
    return result


def _validate_contribution(kind: object, points: object, handle: object, title: object, url: object, source_ref: object, impact_multiplier: object, category: object) -> tuple[str, int, str, str, str | None, str, int, str]:
    if kind not in ALLOWED_KINDS:
        raise BoardError("kind must be pr, burn, mutation, or share")
    if isinstance(points, bool) or not isinstance(points, int) or points != POINTS_BY_KIND[kind]:
        raise BoardError(f"{kind} contributions must be worth {POINTS_BY_KIND[kind]} points")
    if isinstance(impact_multiplier, bool) or not isinstance(impact_multiplier, int) or impact_multiplier not in {1, 2, 3}:
        raise BoardError("impact_multiplier must be 1, 2, or 3")
    return (
        str(kind),
        points,
        _handle(handle),
        _text(title, "title", 240),
        _url(url),
        _text(source_ref, "source_ref", 200),
        impact_multiplier,
        validate_category(category),
    )


def _insert_contribution(connection: sqlite3.Connection, *, ts: str, kind: str, points: int, handle: str, title: str, url: str | None, source_ref: str, impact_multiplier: int, category: str) -> bool:
    cursor = connection.execute(
        """
        INSERT OR IGNORE INTO contributions
          (ts, kind, points, handle, url, title, source_ref, impact_multiplier, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (ts, kind, points, handle, url, title, source_ref, impact_multiplier, category),
    )
    return cursor.rowcount == 1


def _is_internal_proposer(value: object) -> bool:
    if not isinstance(value, str):
        return True
    proposer = value.strip().casefold()
    return proposer == "b-ai-bot" or proposer.startswith("night-mandate")


def _seed_ledger(connection: sqlite3.Connection, ledger_path: Path) -> None:
    if not ledger_path.exists():
        return
    try:
        entries = json.loads(ledger_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return
    if not isinstance(entries, list):
        return
    for entry in entries:
        if not isinstance(entry, dict) or _is_internal_proposer(entry.get("proposed_by")):
            continue
        try:
            mutation_id = int(entry["id"])
            handle = _handle(entry["proposed_by"])
            title = _text(entry["title"], "title", 240)
            ts = _utc_iso(entry["ts"])
        except (KeyError, TypeError, ValueError, BoardError):
            continue
        detail = entry.get("detail")
        pr_match = re.search(r"\bPR #(\d+) shipped\b", detail) if isinstance(detail, str) else None
        kind = "pr" if pr_match else "mutation"
        points = POINTS_BY_KIND[kind]
        source_ref = f"pr:{pr_match.group(1)}" if pr_match else f"mutation:{mutation_id}"
        category = entry.get("category", "dev")
        if category not in CATEGORIES:
            category = "dev"
        _insert_contribution(
            connection,
            ts=ts,
            kind=kind,
            points=points,
            handle=handle,
            title=title,
            url=None,
            source_ref=source_ref,
            impact_multiplier=1,
            category=category,
        )


def add_contribution(kind: str, points: int, handle: str, title: str, *, url: str | None = None, source_ref: str | None = None, ts: str | datetime | None = None, impact_multiplier: int = 1, category: str = "dev", db_path: Path | None = None, ledger_path: Path | None = None) -> dict[str, Any]:
    if source_ref is None:
        source_ref = f"manual:{uuid.uuid4()}"
    validated = _validate_contribution(kind, points, handle, title, url, source_ref, impact_multiplier, category)
    timestamp = _utc_iso(ts)
    path = db_path or db_path_from_env()
    connection = _connect(path)
    try:
        _seed_ledger(connection, ledger_path or ledger_path_from_env())
        inserted = _insert_contribution(
            connection,
            ts=timestamp,
            kind=validated[0],
            points=validated[1],
            handle=validated[2],
            title=validated[3],
            url=validated[4],
            source_ref=validated[5],
            impact_multiplier=validated[6],
            category=validated[7],
        )
        connection.commit()
        row = connection.execute("SELECT * FROM contributions WHERE source_ref = ?", (validated[5],)).fetchone()
        if row is None:
            raise BoardError("contribution could not be stored")
        return {"id": row["id"], "inserted": inserted, "ts": row["ts"], "kind": row["kind"], "points": row["points"], "handle": row["handle"], "title": row["title"], "url": row["url"], "source_ref": row["source_ref"], "impact_multiplier": row["impact_multiplier"], "category": row["category"]}
    finally:
        connection.close()


def recat_contribution(contribution_id: int, category: str, *, db_path: Path | None = None) -> dict[str, Any]:
    if isinstance(contribution_id, bool) or not isinstance(contribution_id, int) or contribution_id < 1:
        raise BoardError("id must be a positive integer")
    clean_category = validate_category(category)
    connection = _connect(db_path or db_path_from_env())
    try:
        cursor = connection.execute("UPDATE contributions SET category = ? WHERE id = ?", (clean_category, contribution_id))
        if cursor.rowcount != 1:
            connection.rollback()
            raise BoardError(f"contribution {contribution_id} was not found")
        connection.commit()
        row = connection.execute("SELECT * FROM contributions WHERE id = ?", (contribution_id,)).fetchone()
        if row is None:
            raise BoardError("contribution could not be read after recategorization")
        return _contribution_item(row) | {"source_ref": row["source_ref"], "impact_multiplier": row["impact_multiplier"]}
    finally:
        connection.close()


def _contribution_item(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "ts": row["ts"],
        "kind": row["kind"],
        "points": row["points"],
        "handle": row["handle"],
        "url": row["url"],
        "title": row["title"],
        "category": row["category"],
    }


def _ranked(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        handle = row["handle"]
        entry = grouped.setdefault(handle, {"handle": handle, "points": 0, "first_ts": row["ts"], "first_id": row["id"], "url": None, "breakdown": {}, "categories": [], "contributions": []})
        entry["points"] += row["points"]
        if (row["ts"], row["id"]) < (entry["first_ts"], entry["first_id"]):
            entry["first_ts"] = row["ts"]
            entry["first_id"] = row["id"]
        if entry["url"] is None and row["url"]:
            entry["url"] = row["url"]
        breakdown = entry["breakdown"].setdefault(row["kind"], {"count": 0, "points": 0})
        breakdown["count"] += 1
        breakdown["points"] += row["points"]
        if row["category"] not in entry["categories"]:
            entry["categories"].append(row["category"])
        entry["contributions"].append(_contribution_item(row))
    ordered = sorted(grouped.values(), key=lambda item: (-item["points"], item["first_ts"], item["first_id"], item["handle"].casefold()))
    for rank, entry in enumerate(ordered, start=1):
        entry["rank"] = rank
        entry["categories"].sort(key=CATEGORIES.index)
        entry.pop("first_id", None)
        entry["contributions"].sort(key=lambda item: (item["ts"], item["id"]))
    return ordered


def _crown_leaders(rows: list[sqlite3.Row]) -> dict[str, str | None]:
    leaders: dict[str, str | None] = {}
    for category in CATEGORIES:
        ranked = _ranked([row for row in rows if row["category"] == category])
        leaders[category] = ranked[0]["handle"] if ranked else None
    return leaders


def board_snapshot(db_path: Path | None = None, *, category: str | None = None, now: datetime | None = None, ledger_path: Path | None = None) -> dict[str, Any]:
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        raise BoardError("now must include a timezone")
    day = current.astimezone(timezone.utc).date().isoformat()
    if category is not None:
        category = validate_category(category)
    connection = _connect(db_path or db_path_from_env())
    try:
        _seed_ledger(connection, ledger_path or ledger_path_from_env())
        connection.commit()
        rows = connection.execute("SELECT * FROM contributions ORDER BY ts ASC, id ASC").fetchall()
        today_rows = [row for row in rows if row["ts"][:10] == day]
        crowns = {"today": _crown_leaders(today_rows), "alltime": _crown_leaders(rows)}
        visible_rows = [row for row in rows if category is None or row["category"] == category]
        visible_today = [row for row in today_rows if category is None or row["category"] == category]
        ticker = [_contribution_item(row) for row in sorted(visible_rows, key=lambda row: (row["ts"], row["id"]), reverse=True)[:12]]
        return {"categories": list(CATEGORIES), "crowns": crowns, "today": _ranked(visible_today), "alltime": _ranked(visible_rows), "ticker": ticker}
    finally:
        connection.close()


def record_utm_visit(ref: str, visitor_id: str, client_ip: str, *, now: datetime | None = None, db_path: Path | None = None, ledger_path: Path | None = None) -> dict[str, Any]:
    clean_ref = _utm_ref(ref)
    clean_visitor = _text(visitor_id, "visitor_id", 128)
    clean_ip = _text(client_ip, "client_ip", 64)
    current = now or datetime.now(timezone.utc)
    timestamp = _utc_iso(current)
    day = timestamp[:10]
    connection = _connect(db_path or db_path_from_env())
    try:
        connection.execute("BEGIN IMMEDIATE")
        _seed_ledger(connection, ledger_path or ledger_path_from_env())
        if clean_ref.casefold() != "anon" and connection.execute("SELECT 1 FROM contributions WHERE handle = ? LIMIT 1", (clean_ref,)).fetchone() is None:
            connection.rollback()
            raise BoardError("ref must identify an existing contributor")
        connection.execute("DELETE FROM utm_visits WHERE day < date(?, '-35 days')", (day,))
        count = connection.execute("SELECT COUNT(*) FROM contributions WHERE kind = 'share' AND handle = ? AND ts LIKE ?", (clean_ref, f"{day}%")).fetchone()[0]
        if count >= VISIT_CAP:
            connection.commit()
            return {"counted": False, "count": count, "cap": VISIT_CAP}
        cursor = connection.execute(
            "INSERT OR IGNORE INTO utm_visits (day, ref, visitor_id, client_ip, ts) VALUES (?, ?, ?, ?, ?)",
            (day, clean_ref, clean_visitor, clean_ip, timestamp),
        )
        if cursor.rowcount == 0:
            connection.commit()
            return {"counted": False, "count": count, "cap": VISIT_CAP}
        _insert_contribution(
            connection,
            ts=timestamp,
            kind="share",
            points=POINTS_BY_KIND["share"],
            handle=clean_ref,
            title="Visitor from a shared expedition",
            url=None,
            source_ref=f"share:{day}:{clean_ref}:{clean_visitor}",
            impact_multiplier=1,
            category="dev",
        )
        connection.commit()
        return {"counted": True, "count": count + 1, "cap": VISIT_CAP}
    finally:
        connection.close()
