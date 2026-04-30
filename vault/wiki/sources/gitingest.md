---
type: source
source_type: tool
name: Gitingest
author: coderamp-labs
date_published: 2025
url: https://gitingest.com
repo: https://github.com/coderamp-labs/gitingest
confidence: high
key_claims:
  - "Turn any Git repository into a simple text digest of its codebase"
  - "Replace 'hub' with 'ingest' in any GitHub URL for prompt-friendly text"
  - Supports public and private repos (via PAT)
  - Pattern include/exclude filtering, file size limits
  - Python package (`pip install gitingest`), CLI, Chrome extension, web UI
  - Output: summary + directory tree + file contents with clear delimiters
tags:
  - codebase-ingestion
  - llm-context
  - tool
---

# Gitingest

## What It Is

Gitingest converts a Git repository into structured plaintext suitable for feeding into an LLM. It clones the repo, extracts all files, and produces a three-part output:

1. **Summary**: Natural language description of the repo
2. **Directory tree**: Hierarchical view of file structure
3. **File contents**: Every file wrapped in `=== FILE: path ===` markers

## How It Works

- Clones the repository (or reads local directory)
- Applies pattern filters (include/exclude globs)
- Applies file size limits (skip files above threshold)
- Generates summary based on repo metadata and structure
- Outputs as structured plaintext

For private repos, a GitHub Personal Access Token (PAT) is used once for cloning and then discarded. Cloned repos are deleted after processing.

## Output Format

```
===============================================
SUMMARY
===============================================
[Repository description]

===============================================
DIRECTORY STRUCTURE
===============================================
repo/
├── src/
│   ├── main.py
│   └── utils.py
├── tests/
└── README.md

===============================================
FILE: src/main.py
===============================================
[file contents]
===============================================
FILE: README.md
===============================================
[file contents]
```

## Integration Surface

- **Python API**: `from gitingest import ingest` → `(summary, tree, content)`
- **CLI**: `gitingest <url> -o - | your_ai_processor`
- **Web**: https://gitingest.com/owner/repo
- **Async**: `from gitingest import ingest_async` for Jupyter/async contexts
- **Environment variables**: `GITHUB_TOKEN`, `GITINGEST_SENTRY_ENABLED`

## Stack

- Backend: FastAPI + Jinja2
- Frontend: Tailwind CSS
- Token estimation: tiktoken
- Analytics: PostHog

## Relevance to ultimate-pi

Direct fit for the harness's need to ingest external codebases as context. Currently the harness uses lean-ctx to read individual files. Gitingest provides bulk codebase ingestion in a format already optimized for LLM context windows.
