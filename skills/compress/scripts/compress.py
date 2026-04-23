#!/usr/bin/env python3
"""Caveman memory compression orchestrator (model-agnostic).

Default LLM backend uses pi CLI so it works with whichever provider/model
is configured in pi.
"""

from __future__ import annotations

import os
import re
import shlex
import subprocess
from pathlib import Path
from typing import Sequence

from .detect import should_compress
from .validate import validate

MAX_RETRIES = 2
MAX_FILE_SIZE = 500_000  # 500KB

OUTER_FENCE_REGEX = re.compile(r"\A\s*(`{3,}|~{3,})[^\n]*\n(.*)\n\1\s*\Z", re.DOTALL)

SENSITIVE_BASENAME_REGEX = re.compile(
    r"(?ix)^("
    r"\.env(\..+)?"
    r"|\.netrc"
    r"|credentials?(\..+)?"
    r"|secrets?(\..+)?"
    r"|passwords?(\..+)?"
    r"|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?"
    r"|authorized_keys"
    r"|known_hosts"
    r"|.*\.(pem|key|p12|pfx|crt|cer|jks|keystore|asc|gpg)"
    r")$"
)
SENSITIVE_PATH_COMPONENTS = frozenset({".ssh", ".aws", ".gnupg", ".kube", ".docker"})
SENSITIVE_NAME_TOKENS = (
    "secret", "credential", "password", "passwd",
    "apikey", "accesskey", "token", "privatekey",
)


def is_sensitive_path(filepath: Path) -> bool:
    if SENSITIVE_BASENAME_REGEX.match(filepath.name):
        return True

    lowered_parts = {p.lower() for p in filepath.parts}
    if lowered_parts & SENSITIVE_PATH_COMPONENTS:
        return True

    normalized = re.sub(r"[_\-\s.]", "", filepath.name.lower())
    return any(tok in normalized for tok in SENSITIVE_NAME_TOKENS)


def strip_llm_wrapper(text: str) -> str:
    m = OUTER_FENCE_REGEX.match(text)
    return m.group(2) if m else text


def _default_llm_cmd() -> str:
    return "pi -p --no-context-files --no-extensions --no-skills --no-prompt-templates"


def _build_cmd() -> list[str]:
    cmd = os.environ.get("CAVEMAN_COMPRESS_CMD", _default_llm_cmd()).strip()
    if not cmd:
        raise RuntimeError("CAVEMAN_COMPRESS_CMD is empty")

    args = shlex.split(cmd)

    # Convenience: if command is pi, optionally pass model from env.
    if args and Path(args[0]).name == "pi":
        model = os.environ.get("CAVEMAN_MODEL", "").strip()
        if model and "--model" not in args:
            args += ["--model", model]

    return args


def call_llm(prompt: str) -> str:
    args = _build_cmd()
    try:
        result = subprocess.run(
            args,
            input=prompt,
            text=True,
            capture_output=True,
            check=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"LLM command not found: {args[0]}. Set CAVEMAN_COMPRESS_CMD to a valid command."
        ) from exc
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or "").strip()
        raise RuntimeError(f"LLM call failed ({' '.join(args)}):\n{stderr}") from exc

    out = (result.stdout or "").strip()
    if not out:
        raise RuntimeError(f"LLM call returned empty output ({' '.join(args)})")
    return strip_llm_wrapper(out)


def build_compress_prompt(original: str) -> str:
    return f"""
Compress this markdown into caveman format.

STRICT RULES:
- Do NOT modify anything inside ``` code blocks
- Do NOT modify anything inside inline backticks
- Preserve ALL URLs exactly
- Preserve ALL headings exactly
- Preserve file paths and commands
- Keep markdown structure (lists/tables/frontmatter)
- Return ONLY compressed markdown body (no surrounding markdown fence)

Only compress natural language prose.

TEXT:
{original}
"""


def build_fix_prompt(original: str, compressed: str, errors: Sequence[str]) -> str:
    errors_str = "\n".join(f"- {e}" for e in errors)
    return f"""You are fixing a caveman-compressed markdown file.

CRITICAL RULES:
- DO NOT recompress entire file
- ONLY fix listed validation errors
- Keep everything else unchanged

ERRORS TO FIX:
{errors_str}

ORIGINAL (reference):
{original}

COMPRESSED (fix this):
{compressed}

Return ONLY the fixed compressed file.
"""


def compress_file(filepath: Path) -> bool:
    filepath = filepath.resolve()

    if not filepath.exists():
        raise FileNotFoundError(f"File not found: {filepath}")

    if filepath.stat().st_size > MAX_FILE_SIZE:
        raise ValueError(f"File too large to compress safely (max 500KB): {filepath}")

    if is_sensitive_path(filepath):
        raise ValueError(
            f"Refusing to compress {filepath}: filename/path looks sensitive "
            "(credentials, keys, secrets, or known private paths)."
        )

    if not should_compress(filepath):
        print("Skipping (not natural language)")
        return False

    print(f"Processing: {filepath}")

    original_text = filepath.read_text(errors="ignore")
    backup_path = filepath.with_name(filepath.stem + ".original.md")

    if backup_path.exists():
        print(f"⚠️ Backup file already exists: {backup_path}")
        print("Aborting to prevent overwrite/data loss.")
        return False

    print("Compressing with configured LLM command...")
    compressed = call_llm(build_compress_prompt(original_text))

    backup_path.write_text(original_text)
    filepath.write_text(compressed)

    for attempt in range(MAX_RETRIES):
        print(f"Validation attempt {attempt + 1}")
        result = validate(backup_path, filepath)

        if result.is_valid:
            print("Validation passed")
            return True

        print("❌ Validation failed:")
        for err in result.errors:
            print(f"   - {err}")

        if attempt == MAX_RETRIES - 1:
            filepath.write_text(original_text)
            backup_path.unlink(missing_ok=True)
            print("❌ Failed after retries — original restored")
            return False

        print("Applying targeted fixes with configured LLM command...")
        compressed = call_llm(build_fix_prompt(original_text, compressed, result.errors))
        filepath.write_text(compressed)

    return True
