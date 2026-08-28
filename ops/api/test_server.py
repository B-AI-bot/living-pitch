import sys
import unittest
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server import (
    MutationInput,
    ResidentCache,
    ResidentWarmingUp,
    extract_observations,
    handle_resident,
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


if __name__ == "__main__":
    unittest.main()
