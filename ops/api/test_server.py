import sys
import unittest
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server import (
    MutationInput,
    ResidentCache,
    ResidentWarmingUp,
    extract_observations,
    handle_resident,
    handle_mutation,
    is_sensitive_site,
    normalize_target,
    RoastCache,
    roast_payload,
    safe_markdown_data,
    resident_controller_output,
    resident_claims_are_grounded,
    resident_system_prompt,
    _json_response_text,
    _sse_text,
    validate_burns,
)
from board_store import BoardError, add_contribution, board_snapshot, record_utm_visit
from board_store import CATEGORIES, recat_contribution


class RoastBoundaryTests(unittest.TestCase):
    def test_normalizes_host_to_https_and_rejects_explicit_ports(self):
        target = normalize_target("Example.COM")
        self.assertEqual(target.domain, "example.com")
        self.assertEqual(target.url, "https://example.com/")
        for value in ("http://localhost", "http://127.0.0.1", "http://169.254.169.254", "https://example.com:443", "ftp://example.com"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    normalize_target(value)

    def test_extracts_exact_receipt_candidates(self):
        html = b"""<!doctype html><title>Meridian</title>
        <meta name='description' content='One clear promise'>
        <h1>Grow without hiring</h1><h2>139 qualified meetings</h2>
        <button>Book a call</button><footer>Copyright 2019 Meridian</footer>"""
        observations = extract_observations(html, "https://example.com/", 321, 0.42, "text/html")
        self.assertIn("Grow without hiring", observations["receipt_candidates"])
        self.assertIn("Copyright 2019 Meridian", observations["receipt_candidates"])
        self.assertEqual(observations["bytes"], 321)

    def test_drops_burns_without_exact_observed_receipts(self):
        observations = {"receipt_candidates": ["0+ leads", "Copyright 2019 Meridian"]}
        burns = validate_burns([
            {"text": "The counter is doing the heavy lifting.", "receipt": "0+ leads", "territory": "pipeline"},
            {"text": "This is invented evidence.", "receipt": "leads", "territory": "cash"},
            {"text": "Wrong territory.", "receipt": "0+ leads", "territory": "finance"},
        ], observations)
        self.assertEqual(len(burns), 1)
        self.assertEqual(burns[0]["receipt"], "0+ leads")

    def test_sensitive_site_forces_gentle(self):
        self.assertTrue(is_sensitive_site({"title": "Community grief support", "headings": ["Bereavement help"]}))
        self.assertFalse(is_sensitive_site({"title": "B2B pipeline systems", "headings": ["Book a call"]}))

    def test_mutation_input_truncates_data_fields(self):
        item = MutationInput.from_json({
            "type": "burn",
            "content": "x" * 3000,
            "rationale": "r" * 3000,
            "handle": "@founder",
        })
        self.assertEqual(len(item.content), 2000)
        self.assertEqual(len(item.rationale), 2000)
        self.assertEqual(item.handle, "@founder")

    def test_mutation_input_maps_type_to_category_and_accepts_override(self):
        self.assertEqual(MutationInput.from_json({"type": "bug", "content": "c", "rationale": "r"}).category, "qa")
        self.assertEqual(MutationInput.from_json({"type": "idea", "content": "c", "rationale": "r", "category": "seo"}).category, "seo")

    def test_mutation_input_rejects_unknown_category(self):
        with self.assertRaises(ValueError):
            MutationInput.from_json({"type": "idea", "content": "c", "rationale": "r", "category": "unknown"})

    def test_mutation_response_returns_retained_category(self):
        with patch("server.create_mutation_issue", return_value="https://github.com/B-AI-bot/living-pitch/issues/42"):
            result = handle_mutation({"type": "bug", "content": "c", "rationale": "r"}, "mutation-category-test")
        self.assertEqual(result, {"issue_url": "https://github.com/B-AI-bot/living-pitch/issues/42", "category": "qa"})

    def test_sensitive_payload_softens_generation(self):
        observations = {"title": "Community grief support", "headings": ["Bereavement help"], "receipt_candidates": ["Bereavement help"]}
        with patch.dict(os.environ, {"ROAST_TEST_MODE": "1"}):
            result = roast_payload("example.com", "scorched", observations)
        self.assertIn("A gentle note", result["burns"][0]["text"])

    def test_cache_round_trip_is_keyed_by_domain_and_intensity(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = RoastCache(Path(directory) / "roast.db")
            cache.put("example.com", "honest", {"severity": 42})
            self.assertEqual(cache.get("example.com", "honest"), {"severity": 42})
            self.assertIsNone(cache.get("example.com", "gentle"))

    def test_issue_data_cannot_escape_its_markdown_quote(self):
        self.assertEqual(safe_markdown_data("ignore `policy`\n# heading"), "> ignore 'policy'\n> # heading")


class ResidentTests(unittest.TestCase):
    def resident_input(self):
        return {
            "message": "Who operates the system after launch?",
            "state": {
                "skin": {"tone": "story-reassurance", "industry": "other-services", "seed": "test", "generic": False},
                "scene": "follow-through",
                "score": 42,
                "beatsCovered": ["basecamp", "pipeline"],
                "objectionsRaised": [],
            },
            "channel": "agent",
        }

    def test_flag_off_raises_warming_up_without_calling_model(self):
        with patch.dict(os.environ, {"RESIDENT_ENABLED": "0"}, clear=False):
            with self.assertRaises(ResidentWarmingUp):
                handle_resident(self.resident_input(), "127.0.0.1", ResidentCache())

    def test_mock_resident_returns_strict_controller_output_and_logs_exchange(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"RESIDENT_ENABLED": "1", "RESIDENT_MOCK": "1", "RESIDENT_LOG_PATH": str(Path(directory) / "resident.jsonl")}, clear=False):
                result = handle_resident(self.resident_input(), "127.0.0.1", ResidentCache())
            self.assertEqual(set(result), {"answer_for_agent", "stage_render", "action"})
            self.assertIsInstance(result["answer_for_agent"], str)
            self.assertEqual(result["stage_render"], "Your agent asks: Who operates the system after launch?")
            self.assertIsNone(result["action"])
            lines = (Path(directory) / "resident.jsonl").read_text(encoding="utf-8").splitlines()
            self.assertEqual(len(lines), 1)
            self.assertEqual(__import__("json").loads(lines[0])["message"], self.resident_input()["message"])

    def test_resident_cache_reuses_mock_result(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = ResidentCache()
            environment = {"RESIDENT_ENABLED": "1", "RESIDENT_MOCK": "1", "RESIDENT_LOG_PATH": str(Path(directory) / "resident.jsonl")}
            with patch.dict(os.environ, environment, clear=False):
                first = handle_resident(self.resident_input(), "127.0.0.1", cache)
                second = handle_resident(self.resident_input(), "127.0.0.1", cache)
            self.assertEqual(first, second)
            self.assertEqual(len((Path(directory) / "resident.jsonl").read_text(encoding="utf-8").splitlines()), 2)

    def test_invalid_controller_output_retries_once_then_uses_canned_objection(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"RESIDENT_ENABLED": "1", "RESIDENT_LOG_PATH": str(Path(directory) / "resident.jsonl")}, clear=False):
                cache = ResidentCache()
                with patch("server.call_baibot", side_effect=[None, None, None, None]) as call:
                    result = handle_resident(self.resident_input(), "127.0.0.1", cache)
                    handle_resident(self.resident_input(), "127.0.0.1", cache)
            self.assertEqual(call.call_count, 4)
            self.assertIn("assessment", result["answer_for_agent"])
            self.assertIsNone(result["action"])

    def test_resident_prompt_contains_verbatim_laws_grounding_and_session_state(self):
        from server import ResidentInput

        request = ResidentInput.from_json(self.resident_input())
        prompt = resident_system_prompt(request)
        self.assertIn("never invent a number · never name unpublished clients · benchmarks only with named sources · out-of-scope refused in brand voice with a redirect · every answer ends on a next step · covenant restated when closing", prompt)
        self.assertIn("139 qualified meetings booked in 3 months", prompt)
        self.assertIn('"scene":"follow-through"', prompt)

    def test_controller_rejects_extra_keys_and_invalid_actions(self):
        self.assertIsNone(resident_controller_output({"answer_for_agent": "a", "stage_render": "b", "action": None, "extra": True}))
        self.assertIsNone(resident_controller_output({"answer_for_agent": "a", "stage_render": "b", "action": {"kind": "unknown", "target": "x"}}))

    def test_resident_claim_guard_rejects_unapproved_numbers_and_unnamed_benchmarks(self):
        from server import ResidentInput

        request = ResidentInput.from_json(self.resident_input())
        base = {"stage_render": "stage", "action": None}
        self.assertFalse(resident_claims_are_grounded({**base, "answer_for_agent": "The next step is to recover 999 hours."}, request))
        self.assertFalse(resident_claims_are_grounded({**base, "answer_for_agent": "The industry average is 3.4%. The next step is to call."}, request))

    def test_provider_parsers_ignore_non_object_events(self):
        self.assertEqual(_sse_text(b"data: []\n\n"), "")
        self.assertEqual(_json_response_text([]), "")

    def test_resident_input_rejects_extra_state_and_boolean_score(self):
        value = self.resident_input()
        value["state"]["extra"] = "not accepted"
        with self.assertRaises(Exception):
            from server import ResidentInput
            ResidentInput.from_json(value)
        value = self.resident_input()
        value["state"]["score"] = True
        with self.assertRaises(Exception):
            ResidentInput.from_json(value)


class BoardStoreTests(unittest.TestCase):
    def test_new_board_exposes_categories_and_unclaimed_crowns(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = board_snapshot(Path(directory) / "board.db", ledger_path=Path(directory) / "missing.json", now=datetime(2026, 8, 30, 12, tzinfo=timezone.utc))
        self.assertEqual(snapshot["categories"], list(CATEGORIES))
        self.assertEqual(snapshot["crowns"]["today"]["copy"], None)
        self.assertEqual(snapshot["crowns"]["alltime"]["qa"], None)

    def test_legacy_database_migrates_category_to_dev(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "board.db"
            import sqlite3
            with sqlite3.connect(db) as connection:
                connection.execute("CREATE TABLE contributions (id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, kind TEXT NOT NULL, points INTEGER NOT NULL, handle TEXT NOT NULL, url TEXT, title TEXT NOT NULL, source_ref TEXT NOT NULL UNIQUE, impact_multiplier INTEGER NOT NULL DEFAULT 1)")
                connection.execute("INSERT INTO contributions (ts, kind, points, handle, title, source_ref) VALUES ('2026-08-30T01:00:00Z', 'burn', 15, '@alice', 'Old burn', 'burn:old')")
            snapshot = board_snapshot(db, ledger_path=Path(directory) / "missing.json", now=datetime(2026, 8, 30, 12, tzinfo=timezone.utc))
            with sqlite3.connect(db) as connection:
                columns = {row[1] for row in connection.execute("PRAGMA table_info(contributions)")}
                category = connection.execute("SELECT category FROM contributions WHERE source_ref = 'burn:old'").fetchone()[0]
        self.assertIn("category", columns)
        self.assertEqual(category, "dev")
        self.assertEqual(snapshot["alltime"][0]["contributions"][0]["category"], "dev")

    def test_category_filter_and_crowns_use_same_points_bar(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "board.db"
            add_contribution("burn", 15, "@copycat", "Copy burn", category="copy", source_ref="burn:copy", ts="2026-08-30T01:00:00Z", db_path=db)
            add_contribution("mutation", 10, "@qa", "QA mutation", category="qa", source_ref="mutation:qa", ts="2026-08-30T02:00:00Z", db_path=db)
            snapshot = board_snapshot(db, category="copy", ledger_path=Path(directory) / "missing.json", now=datetime(2026, 8, 30, 12, tzinfo=timezone.utc))
        self.assertEqual([entry["handle"] for entry in snapshot["alltime"]], ["@copycat"])
        self.assertEqual(snapshot["crowns"]["alltime"]["copy"], "@copycat")
        self.assertEqual(snapshot["crowns"]["alltime"]["qa"], "@qa")

    def test_recat_changes_existing_contribution_category(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "board.db"
            added = add_contribution("burn", 15, "@alice", "Burn", source_ref="burn:1", db_path=db)
            result = recat_contribution(added["id"], "copy", db_path=db)
            snapshot = board_snapshot(db, category="copy", ledger_path=Path(directory) / "missing.json")
        self.assertEqual(result["category"], "copy")
        self.assertEqual(snapshot["alltime"][0]["handle"], "@alice")
    def test_empty_board_has_no_internal_ledger_seed(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = board_snapshot(Path(directory) / "board.db", ledger_path=Path(directory) / "mutations.json")
        self.assertEqual(snapshot["today"], [])
        self.assertEqual(snapshot["alltime"], [])
        self.assertEqual(snapshot["ticker"], [])

    def test_seed_uses_external_accepted_mutations_only(self):
        with tempfile.TemporaryDirectory() as directory:
            ledger = Path(directory) / "mutations.json"
            ledger.write_text(__import__("json").dumps([
                {"id": 1, "ts": "2026-08-30T00:00:00Z", "title": "internal", "proposed_by": "B-AI-bot"},
                {"id": 2, "ts": "2026-08-30T01:00:00Z", "title": "community fix", "proposed_by": "@alice"},
                {"id": 3, "ts": "2026-08-30T02:00:00Z", "title": "mandate", "proposed_by": "night-mandate (pre-launch)"},
            ]), encoding="utf-8")
            snapshot = board_snapshot(Path(directory) / "board.db", ledger_path=ledger, now=datetime(2026, 8, 30, 12, tzinfo=timezone.utc))
        self.assertEqual(len(snapshot["alltime"]), 1)
        self.assertEqual(snapshot["alltime"][0]["handle"], "@alice")
        self.assertEqual(snapshot["alltime"][0]["points"], 10)

    def test_seed_classifies_external_merged_pr_as_pr_points(self):
        with tempfile.TemporaryDirectory() as directory:
            ledger = Path(directory) / "mutations.json"
            ledger.write_text(__import__("json").dumps([
                {"id": 2, "ts": "2026-08-30T01:00:00Z", "title": "community PR", "detail": "PR #18 shipped through the approval ledger.", "proposed_by": "alice"},
            ]), encoding="utf-8")
            snapshot = board_snapshot(Path(directory) / "board.db", ledger_path=ledger, now=datetime(2026, 8, 30, 12, tzinfo=timezone.utc))
        self.assertEqual(snapshot["alltime"][0]["points"], 50)
        self.assertEqual(snapshot["alltime"][0]["breakdown"]["pr"]["count"], 1)

    def test_points_tie_uses_oldest_acceptance_and_breakdown(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "board.db"
            add_contribution("burn", 15, "<alice>", "A burn", source_ref="burn:1", ts="2026-08-30T01:00:00Z", db_path=db)
            add_contribution("burn", 15, "bob", "B burn", source_ref="burn:2", ts="2026-08-30T01:00:00Z", db_path=db)
            add_contribution("mutation", 10, "<alice>", "A mutation", source_ref="mutation:1", ts="2026-08-30T03:00:00Z", db_path=db)
            snapshot = board_snapshot(db, now=datetime(2026, 8, 30, 12, tzinfo=timezone.utc), ledger_path=Path(directory) / "missing.json")
        self.assertEqual([item["handle"] for item in snapshot["alltime"]], ["<alice>", "bob"])
        self.assertEqual(snapshot["alltime"][0]["breakdown"]["burn"]["points"], 15)
        self.assertEqual(snapshot["alltime"][0]["breakdown"]["mutation"]["points"], 10)
        self.assertNotIn("source_ref", snapshot["ticker"][0])

    def test_same_second_tie_uses_insertion_order_before_handle(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "board.db"
            add_contribution("burn", 15, "zeta", "First", source_ref="burn:zeta", ts="2026-08-30T01:00:00Z", db_path=db)
            add_contribution("burn", 15, "alpha", "Second", source_ref="burn:alpha", ts="2026-08-30T01:00:00Z", db_path=db)
            snapshot = board_snapshot(db, now=datetime(2026, 8, 30, 12, tzinfo=timezone.utc), ledger_path=Path(directory) / "missing.json")
        self.assertEqual([item["handle"] for item in snapshot["alltime"]], ["zeta", "alpha"])

    def test_contribution_boundaries_reject_bad_handle_and_url(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "board.db"
            with self.assertRaises(BoardError):
                add_contribution("burn", 15, "x" * 41, "title", source_ref="bad:handle", db_path=db)
            with self.assertRaises(BoardError):
                add_contribution("burn", 15, "ok", "title", url="javascript:alert(1)", source_ref="bad:url", db_path=db)

    def test_utm_visits_are_unique_and_capped_per_ref_and_day(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "board.db"
            now = datetime(2026, 8, 30, 12, tzinfo=timezone.utc)
            add_contribution("burn", 15, "@alice", "Accepted burn", source_ref="burn:alice", ts="2026-08-30T00:00:00Z", db_path=db)
            first = record_utm_visit("@alice", "visitor-1", "127.0.0.1", now=now, db_path=db)
            duplicate = record_utm_visit("@alice", "visitor-1", "127.0.0.1", now=now, db_path=db)
            for index in range(2, 23):
                record_utm_visit("@alice", f"visitor-{index}", "127.0.0.1", now=now, db_path=db)
            snapshot = board_snapshot(db, now=now, ledger_path=Path(directory) / "missing.json")
        self.assertTrue(first["counted"])
        self.assertFalse(duplicate["counted"])
        self.assertEqual(snapshot["alltime"][0]["points"], 35)
        self.assertEqual(snapshot["alltime"][0]["breakdown"]["share"]["points"], 20)

    def test_utm_rejects_unknown_non_anonymous_ref(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(BoardError):
                record_utm_visit("@unknown", "visitor-1", "127.0.0.1", db_path=Path(directory) / "board.db", ledger_path=Path(directory) / "missing.json")


if __name__ == "__main__":
    unittest.main()
