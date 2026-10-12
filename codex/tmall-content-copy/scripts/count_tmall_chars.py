#!/usr/bin/env python3
"""Count common Tmall/Taobao title units: ASCII=1, non-ASCII=2."""

import argparse
import sys


def count_units(text: str) -> int:
    return sum(1 if ord(char) < 128 else 2 for char in text)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("text", nargs="*", help="text to count; reads stdin when omitted")
    parser.add_argument("--limit", type=int, default=60)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        assert count_units("奥克斯AUX体脂秤2代") == 18
        assert count_units("，,") == 3
        print("ok")
        return

    values = args.text or [sys.stdin.read().rstrip("\n")]
    for value in values:
        used = count_units(value)
        print(f"{used}/{args.limit}\t剩余 {args.limit - used}\t{value}")


if __name__ == "__main__":
    main()
