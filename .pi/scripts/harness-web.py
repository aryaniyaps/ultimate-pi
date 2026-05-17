#!/usr/bin/env python3
"""harness-web — Scrapling-backed web search and scrape for ultimate-pi harness agents."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import time
from pathlib import Path

# Re-exec with scrapling's uv-tool Python when the library is not on default python3.
def _bootstrap_scrapling() -> None:
    try:
        import scrapling  # noqa: F401
    except ImportError:
        scrapling_bin = shutil.which("scrapling")
        if not scrapling_bin:
            sys.exit(
                'scrapling not installed. Run: uv tool install "scrapling[fetchers]" && scrapling install'
            )
        with open(scrapling_bin, encoding="utf-8") as fh:
            shebang = fh.readline().strip()
        if shebang.startswith("#!"):
            os.execv(shebang[2:], [shebang[2:], *sys.argv])


_bootstrap_scrapling()

# Imports after bootstrap (scrapling must be available).
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from harness_web.config import HarnessWebConfig, load_config  # noqa: E402
from harness_web.output import write_search_results  # noqa: E402
from harness_web.scrape import bulk_scrape, map_url, scrape_url  # noqa: E402
from harness_web.search_ddg import search_ddg  # noqa: E402

DEFAULT_WEB_DIR = ".web"


def _default_out(sub: str) -> Path:
    return Path(DEFAULT_WEB_DIR) / sub


def cmd_search(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    out = Path(args.output or _default_out("search.json"))
    results = search_ddg(args.query, limit=args.limit, config=config)
    write_search_results(out, results, args.query)
    print(f"wrote {out} ({len(results)} results)")
    return 0


def cmd_scrape(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    out = Path(args.output or _default_out("page.md"))
    fast = config.use_fast_for_url(args.url, args.fast)
    scrape_url(
        args.url,
        str(out),
        config=config,
        fast=fast,
        wait_ms=args.wait_for,
    )
    mode = "fast" if fast else "stealth"
    print(f"wrote {out} ({mode})")
    return 0


def cmd_map(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    out = Path(args.output or _default_out("map.json"))
    fast = config.use_fast_for_url(args.url, args.fast)
    map_url(args.url, str(out), config=config, fast=fast, limit=args.limit)
    print(f"wrote {out}")
    return 0


def cmd_bulk_scrape(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    sleep_sec = args.sleep if args.sleep is not None else config.rate_limit_ms / 1000.0
    if args.urls:
        urls = list(args.urls)
    elif args.from_search:
        import json

        data = json.loads(Path(args.from_search).read_text(encoding="utf-8"))
        urls = [item["url"] for item in data.get("data", {}).get("web", []) if item.get("url")]
    else:
        urls = search_ddg(args.query, limit=args.limit, config=config)
        urls = [r["url"] for r in urls]

    if not urls:
        print("bulk-scrape: no URLs to fetch", file=sys.stderr)
        return 1

    out_dir = Path(args.output or _default_out("bulk"))
    fast = args.fast or config.fetch_mode == "fast"
    failures = bulk_scrape(
        urls[: args.limit],
        str(out_dir),
        config=config,
        fast=fast,
        sleep_sec=sleep_sec,
    )
    print(f"wrote {len(urls[: args.limit]) - len(failures)} pages to {out_dir}")
    for fail in failures:
        print(f"  failed: {fail}", file=sys.stderr)
    return 1 if failures and len(failures) == len(urls) else 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="harness-web",
        description="Harness web layer: search (DDG HTML) and scrape (Scrapling).",
    )
    sub = p.add_subparsers(dest="command", required=True)

    ps = sub.add_parser("search", help="Search via DuckDuckGo HTML SERP")
    ps.add_argument("query", help="Search query")
    ps.add_argument("-o", "--output", help="JSON output path (default: .web/search.json)")
    ps.add_argument("--limit", type=int, default=5)
    ps.set_defaults(func=cmd_search)

    pc = sub.add_parser("scrape", help="Scrape a URL to markdown")
    pc.add_argument("url")
    pc.add_argument("-o", "--output", help="Markdown output (default: .web/page.md)")
    pc.add_argument(
        "--fast",
        action="store_true",
        help="HTTP get + ai-targeted extract (skip stealth browser)",
    )
    pc.add_argument(
        "--wait-for",
        type=int,
        default=None,
        metavar="MS",
        help="Extra wait after load (stealth mode, milliseconds)",
    )
    pc.set_defaults(func=cmd_scrape)

    pb = sub.add_parser("bulk-scrape", help="Search then scrape multiple URLs")
    pb.add_argument("query", nargs="?", help="Search query when not using --from-search")
    pb.add_argument("-o", "--output", help="Output directory (default: .web/bulk)")
    pb.add_argument("--limit", type=int, default=3, help="Max URLs to scrape")
    pb.add_argument("--from-search", metavar="JSON", help="Use URLs from search JSON file")
    pb.add_argument("urls", nargs="*", help="Explicit URLs to scrape")
    pb.add_argument("--fast", action="store_true")
    pb.add_argument(
        "--sleep",
        type=float,
        default=None,
        help="Seconds between scrapes (default: HARNESS_WEB_RATE_LIMIT_MS)",
    )
    pb.set_defaults(func=cmd_bulk_scrape)

    pm = sub.add_parser("map", help="List same-host links from a page")
    pm.add_argument("url")
    pm.add_argument("-o", "--output", help="JSON output (default: .web/map.json)")
    pm.add_argument("--limit", type=int, default=100)
    pm.add_argument("--fast", action="store_true")
    pm.set_defaults(func=cmd_map)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    config = load_config()
    t0 = time.monotonic()
    rc = args.func(args, config)
    _ = time.monotonic() - t0
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
