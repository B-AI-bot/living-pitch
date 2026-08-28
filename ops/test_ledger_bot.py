import sys
import unittest
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


if __name__ == "__main__":
    unittest.main()
