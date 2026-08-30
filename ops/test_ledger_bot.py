import sys
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ledger_bot


class DiffLeakBoundaryTests(unittest.TestCase):
    def test_substrings_do_not_trigger_unpublished_name(self):
        unpublished = "le" + "rat"
        near_miss = "to" + "l" + "e" + "r" + "a" + "t" + "e"
        with patch.object(ledger_bot, "run_gh", return_value=near_miss + " this word"), patch.object(ledger_bot, "forbidden_names", return_value=[unpublished]):
            self.assertEqual(ledger_bot.diff_leaks(9), [])

    def test_whole_word_still_triggers_case_insensitively(self):
        unpublished = "le" + "rat"
        with patch.object(ledger_bot, "run_gh", return_value="A " + unpublished.upper() + " mention"), patch.object(ledger_bot, "forbidden_names", return_value=[unpublished]):
            self.assertEqual(ledger_bot.diff_leaks(9), [unpublished])


class BoardContributionTests(unittest.TestCase):
    def test_internal_author_is_not_recorded(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(ledger_bot, "BOARD_DB_PATH", Path(directory) / "board.db"):
                self.assertIsNone(ledger_bot.record_contribution({"number": 1, "title": "internal", "author": {"login": "B-AI-bot"}}, 12))
                self.assertFalse((Path(directory) / "board.db").exists())

    def test_external_pr_records_fifty_points_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(ledger_bot, "BOARD_DB_PATH", Path(directory) / "board.db"):
                pr = {"number": 18, "title": "community improvement", "url": "https://github.com/B-AI-bot/living-pitch/pull/18", "author": {"login": "alice"}}
                first = ledger_bot.record_contribution(pr, 15)
                second = ledger_bot.record_contribution(pr, 15)
            self.assertTrue(first["inserted"])
            self.assertFalse(second["inserted"])
            self.assertEqual(first["points"], 50)
            self.assertEqual(first["url"], pr["url"])


if __name__ == "__main__":
    unittest.main()
