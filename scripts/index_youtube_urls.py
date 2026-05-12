#!/usr/bin/env python3
"""Index YouTube watch URLs: yt-dlp metadata + Firecrawl transcript scrape.

Writes ``<data-dir>/<channel-handle>/<YYYY-MM-DD>/<video-id>_<title-slug>.txt`` and
``.meta.txt``, and merges ``_index.tsv`` per channel. No channel-specific filters.
Default ``data-dir`` is ``<repo>/data/yt-vid`` when this file lives in ``<repo>/scripts/``.

Requirements: ``yt-dlp`` and ``firecrawl`` CLI on PATH (see ``firecrawl --status``).

Examples:
  python3 scripts/index_youtube_urls.py 'https://www.youtube.com/watch?v=VIDEO_ID'
  python3 scripts/index_youtube_urls.py --urls-file urls.txt
  python3 scripts/index_youtube_urls.py --data-dir ./data/yt-vid --firecrawl-cwd . URL
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse

SLEEP_SEC = 5.0


def slug(s: str, max_len: int = 80) -> str:
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[-\s]+", "-", s).strip("-") or "untitled"
    return s[:max_len].rstrip("-")


def ymd(upload_date: str) -> str:
    if len(upload_date) == 8 and upload_date.isdigit():
        return f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:8]}"
    return "unknown-date"


def parse_firecrawl_youtube_transcript(md: str) -> str | None:
    marker = "## Transcript"
    i = md.find(marker)
    if i == -1:
        return None
    rest = md[i + len(marker) :].lstrip("\n")
    lines_out: list[str] = []
    for line in rest.splitlines():
        if line.startswith("## ") and lines_out:
            break
        lines_out.append(line)
    text = "\n".join(lines_out).strip()
    if len(text) < 30:
        return None
    return text


def _firecrawl_transcript_sane(text: str) -> bool:
    """Reject full-page scrapes where ## Transcript captured sidebar/recommendations."""
    head = text[:1200]
    if "NaN / NaN" in head:
        return False
    if head.count("[![]") >= 2 or head.count("hqdefault.jpg") >= 2:
        return False
    if head.count("views •") >= 2:
        return False
    return True


def fetch_transcript_firecrawl(
    video_id: str,
    *,
    firecrawl_bin: str,
    firecrawl_cwd: Path,
    wait_ms: int = 20000,
    attempts: int = 3,
    scrape_timeout: int = 300,
) -> str | None:
    url = f"https://www.youtube.com/watch?v={video_id}"
    for attempt in range(attempts):
        if attempt:
            time.sleep(4.0)
        fd, out = tempfile.mkstemp(suffix=".md", prefix="ytfc-")
        os.close(fd)
        out_path = Path(out)
        try:
            cmd = [
                firecrawl_bin,
                "scrape",
                url,
                "--wait-for",
                str(wait_ms),
                "--only-main-content",
                "-o",
                str(out_path),
            ]
            r = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=scrape_timeout,
                cwd=str(firecrawl_cwd),
            )
            if r.returncode != 0:
                continue
            md = out_path.read_text(encoding="utf-8", errors="replace")
            text = parse_firecrawl_youtube_transcript(md)
            if text and _firecrawl_transcript_sane(text):
                return text
        except (OSError, subprocess.TimeoutExpired, ValueError):
            pass
        finally:
            out_path.unlink(missing_ok=True)
    return None


def needs_transcript(path: Path) -> bool:
    if not path.exists():
        return True
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return True
    return text.strip().startswith("(no transcript")


def channel_dir_from_handle(uploader_id: str) -> str:
    h = (uploader_id or "unknown-channel").strip()
    if h.startswith("@"):
        h = h[1:]
    return h.lower() or "unknown-channel"


def video_id_from_arg(s: str) -> str:
    s = s.strip()
    if re.fullmatch(r"[0-9A-Za-z_-]{11}", s):
        return s
    u = urlparse(s)
    host = (u.netloc or "").lower().removeprefix("www.")
    if host == "youtu.be":
        seg = u.path.strip("/").split("/")[0]
        if re.fullmatch(r"[0-9A-Za-z_-]{11}", seg):
            return seg
    qs = parse_qs(u.query)
    if "v" in qs and qs["v"]:
        vid = qs["v"][0]
        if re.fullmatch(r"[0-9A-Za-z_-]{11}", vid):
            return vid
    raise SystemExit(f"Could not parse YouTube video id from: {s!r}")


def yt_dlp_row(watch_url: str, *, yt_dlp_bin: str) -> tuple[str, str, str, str]:
    """Returns (video_id, upload_date, title, uploader_id)."""
    cmd = [
        yt_dlp_bin,
        "--no-download",
        "--ignore-errors",
        "--print",
        "%(id)s|%(upload_date)s|%(title)s|%(uploader_id)s",
        watch_url,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise SystemExit(f"yt-dlp failed ({r.returncode}): {watch_url}\n{r.stderr}")
    line = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ""
    parts = line.split("|", 3)
    if len(parts) < 4:
        raise SystemExit(f"Unexpected yt-dlp output for {watch_url!r}: {line!r}")
    vid, udate, title, handle = parts[0], parts[1], parts[2], parts[3]
    if not udate.isdigit() or len(udate) != 8:
        raise SystemExit(f"Bad upload_date from yt-dlp: {udate!r}")
    return vid, udate, title, handle or "@unknown"


def merge_index(idx: Path, rows: dict[str, tuple[str, str]]) -> None:
    if idx.exists():
        for i, line in enumerate(idx.read_text(encoding="utf-8").splitlines()):
            line = line.strip()
            if not line:
                continue
            if i == 0 and line.startswith("video_id"):
                continue
            parts = line.split("\t")
            if len(parts) >= 3:
                vid, ud, tit = parts[0], parts[1], parts[2]
                rows.setdefault(vid, (ud, tit))
    lines = ["video_id\tupload_date\ttitle"]
    for vid in sorted(rows.keys()):
        ud, tit = rows[vid]
        lines.append(f"{vid}\t{ud}\t{tit.replace(chr(9), ' ')}")
    idx.parent.mkdir(parents=True, exist_ok=True)
    idx.write_text("\n".join(lines) + "\n", encoding="utf-8")


def collect_urls(args: argparse.Namespace) -> list[str]:
    out: list[str] = []
    for a in args.url:
        out.append(a.strip())
    if args.urls_file:
        raw = Path(args.urls_file).read_text(encoding="utf-8")
        for line in raw.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                out.append(line)
    seen: set[str] = set()
    uniq: list[str] = []
    for u in out:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    return uniq


def default_paths() -> tuple[Path, Path]:
    """(data_dir, firecrawl_cwd) when script lives in <repo>/scripts/."""
    here = Path(__file__).resolve()
    repo = here.parent.parent
    return repo / "data" / "yt-vid", repo


def main() -> int:
    default_data, default_fc_cwd = default_paths()
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "url",
        nargs="*",
        help="YouTube watch URLs, youtu.be links, or 11-char video ids",
    )
    ap.add_argument(
        "--urls-file",
        metavar="PATH",
        help="Text file with one URL or id per line (# comments allowed)",
    )
    ap.add_argument(
        "--data-dir",
        type=Path,
        metavar="DIR",
        default=default_data,
        help=f"Root for channel folders (default: {default_data})",
    )
    ap.add_argument(
        "--firecrawl-cwd",
        type=Path,
        metavar="DIR",
        default=default_fc_cwd,
        help="Working directory for firecrawl subprocess (default: repo root next to scripts/)",
    )
    ap.add_argument(
        "--yt-dlp",
        metavar="BIN",
        default="yt-dlp",
        help="yt-dlp executable name or path (default: yt-dlp)",
    )
    ap.add_argument(
        "--firecrawl",
        metavar="BIN",
        default="",
        help="firecrawl executable (default: search PATH)",
    )
    ap.add_argument(
        "--wait-for",
        type=int,
        default=20000,
        metavar="MS",
        help="Firecrawl scrape --wait-for milliseconds (default 20000)",
    )
    ap.add_argument(
        "--sleep",
        type=float,
        default=SLEEP_SEC,
        metavar="SEC",
        help=f"Seconds between Firecrawl scrapes (default {SLEEP_SEC})",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Print yt-dlp metadata only; do not scrape or write files",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="Re-scrape even when a non-placeholder transcript already exists",
    )
    args = ap.parse_args()
    urls = collect_urls(args)
    if not urls:
        ap.error("Pass at least one url, or use --urls-file")

    fc_bin = args.firecrawl.strip() or shutil.which("firecrawl")
    if not fc_bin and not args.dry_run:
        raise SystemExit(
            "firecrawl CLI not found on PATH. Install it and run `firecrawl --status`, "
            "or pass --firecrawl /path/to/firecrawl."
        )

    data_dir: Path = args.data_dir
    fc_cwd: Path = args.firecrawl_cwd

    index_rows: dict[str, dict[str, tuple[str, str]]] = {}
    first_scrape = True

    for raw in urls:
        vid_guess = video_id_from_arg(raw)
        watch = f"https://www.youtube.com/watch?v={vid_guess}"
        vid, udate, title, uploader_id = yt_dlp_row(watch, yt_dlp_bin=args.yt_dlp)
        ch_slug = channel_dir_from_handle(uploader_id)
        day = ymd(udate)
        out_base = data_dir / ch_slug
        day_dir = out_base / day
        base = f"{vid}_{slug(title)}"
        path = day_dir / f"{base}.txt"
        meta_path = day_dir / f"{base}.meta.txt"

        if args.dry_run:
            print(f"{ch_slug}\t{day}\t{vid}\t{udate}\t{title}", flush=True)
            bucket = index_rows.setdefault(ch_slug, {})
            bucket[vid] = (udate, title)
            continue

        day_dir.mkdir(parents=True, exist_ok=True)
        need = args.force or needs_transcript(path)
        text: str | None
        if need:
            if not first_scrape:
                time.sleep(max(0.0, args.sleep))
            first_scrape = False
            print(f"scrape {ch_slug} {day} {vid} …", flush=True)
            assert fc_bin is not None
            text = fetch_transcript_firecrawl(
                vid,
                firecrawl_bin=fc_bin,
                firecrawl_cwd=fc_cwd,
                wait_ms=args.wait_for,
            )
        else:
            print(f"skip {ch_slug} {day} {vid} (existing transcript)", flush=True)
            text = None

        ch_meta = uploader_id if uploader_id.startswith("@") else f"@{uploader_id}"
        meta = (
            f"video_id: {vid}\n"
            f"upload_date: {udate}\n"
            f"title: {title}\n"
            f"url: https://www.youtube.com/watch?v={vid}\n"
            f"transcript_source: firecrawl\n"
            f"channel: {ch_meta}\n"
        )
        meta_path.write_text(meta, encoding="utf-8")
        if need:
            if text is None:
                path.write_text(
                    "(no transcript yet: Firecrawl scrape had no ## Transcript section or empty body. "
                    "Retry later or open the watch URL in a browser.)\n",
                    encoding="utf-8",
                )
                print("  -> no transcript", flush=True)
            else:
                path.write_text(text, encoding="utf-8")
                print(f"  -> ok ({len(text)} chars)", flush=True)

        bucket = index_rows.setdefault(ch_slug, {})
        bucket[vid] = (udate, title)

    if not args.dry_run:
        for ch_slug, rows in index_rows.items():
            idx = data_dir / ch_slug / "_index.tsv"
            merge_index(idx, dict(rows))
            print(f"wrote {idx}", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
