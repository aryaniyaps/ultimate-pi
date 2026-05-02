---
type: source
source_type: paper
title: "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?"
author: "Carlos E. Jimenez, John Yang, Alexander Wettig, Shunyu Yao, Kexin Pei, Ofir Press, Karthik Narasimhan"
date_published: 2023-10-10
url: "https://arxiv.org/abs/2310.06770"
confidence: high
key_claims:
  - "Real-world software engineering is a rich, sustainable testbed for LLM evaluation"
  - "2,294 problems from 12 popular Python repositories with real GitHub issues and PRs"
  - "Tasks require coordinating changes across multiple functions, classes, and files"
  - "Models must interact with execution environments, process long contexts, and do complex reasoning"
  - "Best model at publication (Claude 2) could only resolve simplest issues"
status: ingested
tags:
  - benchmark
  - software-engineering
  - evaluation
created: 2023-10-10
updated: 2026-04-30

---# SWE-bench: Can Language Models Resolve Real-World GitHub Issues?

The canonical benchmark for evaluating language models on real-world software engineering tasks. Defines the problem scope agents face when navigating large codebases.

## Task Definition

Given a codebase and a GitHub issue description, the model must produce a patch that resolves the issue. This requires:

1. Understanding the issue from natural language
2. Locating relevant code across multiple files
3. Understanding how those files interact
4. Making correct, minimal changes
5. (Implicitly) verifying the fix doesn't break existing tests

## Benchmark Design

- 2,294 issues from 12 repos: django, scikit-learn, matplotlib, sympy, flask, pytest, requests, seaborn, sphinx, astropy, xarray, pylint
- Each instance includes the full pre-issue codebase, issue text, and the gold-standard PR patch
- Evaluation: apply the patch and run the repo's test suite

## Relevance to Agent Codebase Exploration

SWE-bench formalizes exactly the challenge the OSS guide addresses for humans. The benchmark's difficulty demonstrates that even the best models struggle with large codebase navigation — highlighting the need for better agent-specific exploration strategies.
