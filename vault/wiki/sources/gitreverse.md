---
type: source
source_type: tool
name: GitReverse
author: filiksyos
date_published: 2025
url: https://gitreverse.com
repo: https://github.com/filiksyos/gitreverse
confidence: high
key_claims:
  - "Turn a GitHub repository into a plain-language coding agent prompt"
  - "Reverse engineer a codebase into a prompt that likely created it"
  - Uses OpenRouter LLM to generate synthetic user prompts from repo metadata
  - Replace 'hub' with 'reverse' in any GitHub URL
  - Has "Deep Reverse" mode for more detailed prompts
  - Public repos only
tags:
  - prompt-generation
  - repo-analysis
  - llm-tool
created: 2026-04-30
updated: 2026-04-30
status: ingested
title: "GitReverse"

---# GitReverse

## What It Is

GitReverse takes a public GitHub repo URL and generates a synthetic user prompt — a prompt someone might paste into Cursor, Claude Code, or Codex to "vibe code" the project from scratch.

## How It Works

1. Fetches repo metadata via GitHub API: description, topics, language breakdown, file tree, README
2. Sends metadata + README to an LLM via OpenRouter
3. LLM generates a synthetic user prompt describing what the repo does and how to build it
4. Output: 3-5 paragraphs of natural language prompt

**Crucially, it does NOT read the actual source code files.** It only uses metadata and README. This means the generated prompt is a high-level description, not a code-level specification.

## Features

- **Quick Reverse**: Basic prompt from metadata + README
- **Deep Reverse**: More detailed prompt (likely uses more metadata or a different LLM prompt)
- **Library**: Browse previously generated prompts
- **History**: Personal prompt generation history
- **Manual control**: Toggle for manual parameter adjustment
- **Shareable URLs**: `/owner/repo` route pattern

## Output Example (for gitreverse repo itself)

> Build me a simple web app that can "reverse engineer" a GitHub repository. The main idea is to take a public repo's URL and generate a synthetic prompt. The user interface should be clean and straightforward: just a single page with an input box. On the backend, it will need to use the GitHub API to fetch the repo's metadata, its root file tree, and the README content. Then, it should pass all that context to a large language model using OpenRouter to generate the final prompt. Let's build this with Next.js using the App Router, React, and TypeScript. For styling, please use Tailwind CSS.

## Stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS
- OpenRouter for LLM access
- GitHub API for repo metadata

## Relevance to ultimate-pi

**Low direct relevance.** GitReverse generates prompts FROM repos — it helps a USER figure out what prompt to write. The ultimate-pi harness is an AGENT that already receives prompts. The harness doesn't need to generate prompts from repos; it needs to ingest repos as context. GitReverse solves the inverse problem.
