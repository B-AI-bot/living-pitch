#!/usr/bin/env python3
"""Human-operated contribution recorder for accepted burns and feedback."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from board_store import CATEGORIES, BoardError, add_contribution, recat_contribution


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description="Record a ledger-accepted board contribution")
    subcommands = command.add_subparsers(dest="command", required=True)
    add = subcommands.add_parser("add")
    add.add_argument("--kind", required=True, choices=("pr", "burn", "mutation", "share"))
    add.add_argument("--handle", required=True)
    add.add_argument("--points", required=True, type=int)
    add.add_argument("--title", required=True)
    add.add_argument("--url")
    add.add_argument("--source-ref")
    add.add_argument("--impact-multiplier", type=int, default=1)
    add.add_argument("--category", choices=CATEGORIES, default="dev")
    recat = subcommands.add_parser("recat")
    recat.add_argument("id", type=int)
    recat.add_argument("category", choices=CATEGORIES)
    return command


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        if args.command == "recat":
            result = recat_contribution(args.id, args.category)
        else:
            result = add_contribution(
                args.kind,
                args.points,
                args.handle,
                args.title,
                url=args.url,
                source_ref=args.source_ref,
                impact_multiplier=args.impact_multiplier,
                category=args.category,
            )
    except BoardError as error:
        parser().error(str(error))
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
