#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

URL_REGEX = re.compile(r"https?://[^\s)]+")
FENCE_OPEN_REGEX = re.compile(r"^(\s{0,3})(`{3,}|~{3,})(.*)$")
HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.*)", re.MULTILINE)
BULLET_REGEX = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)
PATH_REGEX = re.compile(r"(?:\./|\.\./|/|[A-Za-z]:\\)[\w\-/\\\.]+|[\w\-\.]+[/\\][\w\-/\\\.]+")


class ValidationResult:
    def __init__(self) -> None:
        self.is_valid = True
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def add_error(self, msg: str) -> None:
        self.is_valid = False
        self.errors.append(msg)

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)


def read_file(path: Path) -> str:
    return path.read_text(errors="ignore")


def extract_headings(text: str) -> list[tuple[str, str]]:
    return [(level, title.strip()) for level, title in HEADING_REGEX.findall(text)]


def extract_code_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    lines = text.split("\n")
    i = 0
    n = len(lines)

    while i < n:
        m = FENCE_OPEN_REGEX.match(lines[i])
        if not m:
            i += 1
            continue

        fence_char = m.group(2)[0]
        fence_len = len(m.group(2))
        block_lines = [lines[i]]
        i += 1
        closed = False

        while i < n:
            close_m = FENCE_OPEN_REGEX.match(lines[i])
            if (
                close_m
                and close_m.group(2)[0] == fence_char
                and len(close_m.group(2)) >= fence_len
                and close_m.group(3).strip() == ""
            ):
                block_lines.append(lines[i])
                closed = True
                i += 1
                break
            block_lines.append(lines[i])
            i += 1

        if closed:
            blocks.append("\n".join(block_lines))

    return blocks


def extract_urls(text: str) -> set[str]:
    return set(URL_REGEX.findall(text))


def extract_paths(text: str) -> set[str]:
    return set(PATH_REGEX.findall(text))


def count_bullets(text: str) -> int:
    return len(BULLET_REGEX.findall(text))


def validate_headings(orig: str, comp: str, result: ValidationResult) -> None:
    h1 = extract_headings(orig)
    h2 = extract_headings(comp)

    if len(h1) != len(h2):
        result.add_error(f"Heading count mismatch: {len(h1)} vs {len(h2)}")
    if h1 != h2:
        result.add_warning("Heading text/order changed")


def validate_code_blocks(orig: str, comp: str, result: ValidationResult) -> None:
    if extract_code_blocks(orig) != extract_code_blocks(comp):
        result.add_error("Code blocks not preserved exactly")


def validate_urls(orig: str, comp: str, result: ValidationResult) -> None:
    u1 = extract_urls(orig)
    u2 = extract_urls(comp)
    if u1 != u2:
        result.add_error(f"URL mismatch: lost={u1 - u2}, added={u2 - u1}")


def validate_paths(orig: str, comp: str, result: ValidationResult) -> None:
    p1 = extract_paths(orig)
    p2 = extract_paths(comp)
    if p1 != p2:
        result.add_warning(f"Path mismatch: lost={p1 - p2}, added={p2 - p1}")


def validate_bullets(orig: str, comp: str, result: ValidationResult) -> None:
    b1 = count_bullets(orig)
    b2 = count_bullets(comp)
    if b1 == 0:
        return
    if abs(b1 - b2) / b1 > 0.15:
        result.add_warning(f"Bullet count changed too much: {b1} -> {b2}")


def validate(original_path: Path, compressed_path: Path) -> ValidationResult:
    result = ValidationResult()
    orig = read_file(original_path)
    comp = read_file(compressed_path)

    validate_headings(orig, comp, result)
    validate_code_blocks(orig, comp, result)
    validate_urls(orig, comp, result)
    validate_paths(orig, comp, result)
    validate_bullets(orig, comp, result)

    return result
