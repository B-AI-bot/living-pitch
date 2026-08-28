import sys
import unittest
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server import (
    MutationInput,
    extract_observations,
    is_sensitive_site,
    normalize_target,
    RoastCache,
    roast_payload,
    safe_markdown_data,
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


if __name__ == "__main__":
    unittest.main()
