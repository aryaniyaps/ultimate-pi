#!/usr/bin/env python3
"""Caveman Compress CLI.

Usage:
    python -m scripts <filepath>
"""

import sys
from pathlib import Path

from .compress import compress_file
from .detect import detect_file_type, should_compress


def print_usage() -> None:
    print("Usage: python -m scripts <filepath>")


def main() -> None:
    if len(sys.argv) != 2:
        print_usage()
        sys.exit(1)

    filepath = Path(sys.argv[1])

    if not filepath.exists():
        print(f"❌ File not found: {filepath}")
        sys.exit(1)

    if not filepath.is_file():
        print(f"❌ Not a file: {filepath}")
        sys.exit(1)

    filepath = filepath.resolve()
    file_type = detect_file_type(filepath)

    print(f"Detected: {file_type}")

    if not should_compress(filepath):
        print("Skipping: file is not natural language (or is excluded)")
        sys.exit(0)

    print("Starting caveman compression...\n")

    try:
        success = compress_file(filepath)
        if success:
            backup_path = filepath.with_name(filepath.stem + ".original.md")
            print("\n✅ Compression completed")
            print(f"Compressed: {filepath}")
            print(f"Backup:     {backup_path}")
            sys.exit(0)

        print("\n❌ Compression failed")
        sys.exit(2)

    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(130)
    except Exception as exc:
        print(f"\n❌ Error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
