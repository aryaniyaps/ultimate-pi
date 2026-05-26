#!/usr/bin/env python3
"""harness-web — Scrapling-backed web search and scrape for ultimate-pi harness agents."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

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
from harness_web.deep_search import run_deep_search  # noqa: E402
from harness_web.evidence_bundle import build_evidence_bundle, write_evidence_bundle  # noqa: E402
from harness_web.find_similar import run_find_similar  # noqa: E402
from harness_web.output import (  # noqa: E402
    write_deep_search_results,
    write_search_results,
)
from harness_web.scrape import (  # noqa: E402
    bulk_scrape,
    map_url,
    scrape_url,
    scrape_url_with_highlights,
)
from harness_web.search import search  # noqa: E402

TIER_LIMITS = {
    "instant": 5,
    "standard": 10,
    "deep": 10,
    "research": 15,
}

DEFAULT_WEB_DIR = ".web"


def _default_out(sub: str) -> Path:
    return Path(DEFAULT_WEB_DIR) / sub


def _tier_limit(tier: str, cli_limit: int | None) -> int:
    if cli_limit is not None:
        return cli_limit
    return TIER_LIMITS.get(tier, 10)


def cmd_search(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    tier = getattr(args, "tier", None) or "standard"
    limit = _tier_limit(tier, args.limit)
    out = Path(args.output or _default_out("search.json"))
    results = search(args.query, limit=limit, config=config)
    write_search_results(out, results, args.query, engine=config.search_engine, tier=tier)
    print(f"wrote {out} ({len(results)} results, tier={tier})")
    return 0


def cmd_search_deep(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    out = Path(args.output or _default_out("search-deep.json"))
    angles_path = Path(args.angles_file) if args.angles_file else None
    plan, ranked = run_deep_search(
        args.query,
        config=config,
        angles_file=angles_path,
        expand_heuristic=args.expand_heuristic,
        category=args.category,
        per_angle_limit=args.per_angle_limit,
        final_limit=args.limit,
    )
    angle_dicts = [
        {"id": a.id, "query": a.query, "rationale": a.rationale} for a in plan.angles
    ]
    write_deep_search_results(
        out,
        query=args.query,
        engine=config.search_engine,
        tier="deep",
        plan_angles=angle_dicts,
        ranked_web=ranked,
    )
    print(f"wrote {out} ({len(ranked)} fused results, {len(plan.angles)} angles)")
    return 0


def cmd_find_similar(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    out = Path(args.output or _default_out("search-deep.json"))
    plan, ranked = run_find_similar(
        args.url,
        config=config,
        final_limit=args.limit,
        per_angle_limit=args.per_angle_limit,
        fast_fetch=args.fast,
    )
    angle_dicts = [
        {"id": a.id, "query": a.query, "rationale": a.rationale} for a in plan.angles
    ]
    write_deep_search_results(
        out,
        query=plan.intent,
        engine=config.search_engine,
        tier="deep",
        plan_angles=angle_dicts,
        ranked_web=ranked,
    )
    print(f"wrote {out} ({len(ranked)} similar results)")
    return 0


def cmd_scrape(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    out = Path(args.output or _default_out("page.md"))
    fast = config.use_fast_for_url(args.url, args.fast)
    hl_out = args.highlights_output
    hl_query = (args.highlight_query or "").strip()
    if args.highlights and hl_query:
        scrape_url_with_highlights(
            args.url,
            str(out),
            hl_out or str(_default_out("highlights.json")),
            config=config,
            fast=fast,
            wait_ms=args.wait_for,
            highlight_query=hl_query,
        )
        print(f"wrote {out} (highlights)")
    else:
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


def cmd_contents_batch(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    import json

    out_dir = Path(args.output or _default_out("contents"))
    out_dir.mkdir(parents=True, exist_ok=True)
    urls: list[str] = list(args.urls or [])
    if args.from_search:
        data = json.loads(Path(args.from_search).read_text(encoding="utf-8"))
        for item in data.get("data", {}).get("web", []):
            u = (item.get("url") or "").strip()
            if u:
                urls.append(u)
    if not urls:
        print("contents-batch: no URLs", file=sys.stderr)
        return 1

    hl_query = (args.highlight_query or "").strip()
    manifest: list[dict] = []
    sleep_sec = config.rate_limit_ms / 1000.0
    for i, url in enumerate(urls[: args.limit]):
        if i and sleep_sec > 0:
            time.sleep(sleep_sec)
        safe = urlparse(url).netloc.replace(".", "_")
        md_path = out_dir / f"{safe}.md"
        hl_path = out_dir / f"{safe}.highlights.json" if args.highlights and hl_query else None
        fast = config.use_fast_for_url(url, args.fast)
        try:
            if hl_path:
                scrape_url_with_highlights(
                    url,
                    str(md_path),
                    str(hl_path),
                    config=config,
                    fast=fast,
                    wait_ms=None,
                    highlight_query=hl_query,
                )
            else:
                scrape_url(url, str(md_path), config=config, fast=fast, wait_ms=None)
            manifest.append({"url": url, "markdown": str(md_path), "ok": True})
        except Exception as err:  # noqa: BLE001
            manifest.append({"url": url, "ok": False, "error": str(err)})

    manifest_path = out_dir / "manifest.json"
    manifest_path.write_text(json.dumps({"urls": manifest}, indent=2) + "\n", encoding="utf-8")
    if args.evidence_bundle and args.from_search:
        eb_path = Path(args.evidence_bundle)
        bundle = build_evidence_bundle(Path(args.from_search), query=hl_query)
        write_evidence_bundle(eb_path, bundle)
        print(f"wrote {eb_path}")
    print(f"wrote {len(manifest)} entries to {out_dir}")
    return 0


def cmd_map(args: argparse.Namespace, config: HarnessWebConfig) -> int:
    out = Path(args.output or _default_out("map.json"))
    fast = config.use_fast_for_url(args.url, args.fast)
    map_url(args.url, str(out), config=config, fast=fast, limit=args.limit)
    print(f"wrote {out}")
    return 0


def cmd_status(_args: argparse.Namespace, config: HarnessWebConfig) -> int:
    import json

    payload = {
        "search_engine": config.search_engine,
        "searxng_url": config.searxng_url,
        "fetch_mode": config.fetch_mode,
        "script": str(Path(__file__).resolve()),
        "bootstrap": "ok",
    }
    print(json.dumps(payload, indent=2))
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
        serp = search(args.query, limit=args.limit, config=config)
        urls = [r["url"] for r in serp]

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
        description="Harness web layer: search (DDG HTML or SearXNG) and scrape (Scrapling).",
    )
    sub = p.add_subparsers(dest="command", required=True)

    ps = sub.add_parser("search", help="Search via configured SERP (HARNESS_WEB_SEARCH_ENGINE)")
    ps.add_argument("query", help="Search query")
    ps.add_argument("-o", "--output", help="JSON output path (default: .web/search.json)")
    ps.add_argument("--limit", type=int, default=None)
    ps.add_argument(
        "--tier",
        choices=("instant", "standard", "deep", "research"),
        default="standard",
        help="WRS tier (instant=5, standard=10 results)",
    )
    ps.set_defaults(func=cmd_search)

    pd = sub.add_parser("search-deep", help="Multi-angle SERP fusion (WRS deep)")
    pd.add_argument("query", help="Original research intent")
    pd.add_argument("-o", "--output", help="JSON output (default: .web/search-deep.json)")
    pd.add_argument("--limit", type=int, default=10, help="Final fused result count")
    pd.add_argument("--per-angle-limit", type=int, default=8, help="SERP hits per angle")
    pd.add_argument(
        "--angles-file",
        metavar="YAML",
        help="Angles from web-query-expander (.web/angles.yaml)",
    )
    pd.add_argument(
        "--expand-heuristic",
        action="store_true",
        help="Emergency angle templates without expander subagent",
    )
    pd.add_argument("--category", help="Hint: code|company|people|paper|news")
    pd.set_defaults(func=cmd_search_deep)

    pf = sub.add_parser("find-similar", help="Pages similar to a seed URL")
    pf.add_argument("url", help="Seed URL")
    pf.add_argument("-o", "--output", help="JSON output (default: .web/search-deep.json)")
    pf.add_argument("--limit", type=int, default=10)
    pf.add_argument("--per-angle-limit", type=int, default=6)
    pf.add_argument("--fast", action="store_true", help="Fast HTTP for seed fetch")
    pf.set_defaults(func=cmd_find_similar)

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
    pc.add_argument("--highlights", action="store_true", help="Extract query-aligned excerpts")
    pc.add_argument("--highlight-query", help="Query for highlight scoring")
    pc.add_argument(
        "--highlights-output",
        help="Highlights JSON path (default: .web/highlights.json)",
    )
    pc.set_defaults(func=cmd_scrape)

    pbatch = sub.add_parser("contents-batch", help="Batch scrape URLs to markdown manifest")
    pbatch.add_argument("urls", nargs="*", help="URLs to fetch")
    pbatch.add_argument("-o", "--output", help="Output directory (default: .web/contents)")
    pbatch.add_argument("--limit", type=int, default=5)
    pbatch.add_argument(
        "--from-search",
        metavar="JSON",
        help="URLs from search.json or search-deep.json",
    )
    pbatch.add_argument("--fast", action="store_true")
    pbatch.add_argument("--highlights", action="store_true")
    pbatch.add_argument("--highlight-query", default="")
    pbatch.add_argument(
        "--evidence-bundle",
        metavar="JSON",
        help="Write evidence-bundle.json from --from-search",
    )
    pbatch.set_defaults(func=cmd_contents_batch)

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

    pst = sub.add_parser("status", help="Print harness-web config as JSON (setup/diagnostics)")
    pst.set_defaults(func=cmd_status)

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
