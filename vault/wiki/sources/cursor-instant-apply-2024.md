---
type: source
source_type: engineering-blog
title: "Editing Files at 1000 Tokens per Second"
author: "Aman Sanger (Cursor/Anysphere)"
date_published: 2024-05-14
url: "https://cursor.com/blog/instant-apply"
confidence: high
tags: [cursor, speculative-edits, fast-apply, diff-models, code-editing, latency]
key_claims:
  - "Fast Apply: custom model trained for full-file rewrites, not diff generation"
  - "Speculative edits: deterministic speculation using existing code as draft tokens. 9-13x speedup"
  - "Diffs fail because: fewer thinking tokens, out-of-distribution, line number hallucination"
  - "Search/replace diff format (Aider-inspired) eliminates line numbers but most models still fail"
  - "Fine-tuned Llama-3-70b + speculative edits outperforms GPT-4o on accuracy and speed"
  - "~1000 tokens/sec on 70B model, deployed with Fireworks AI inference engine"
---

# Editing Files at 1000 Tokens per Second

Cursor's May 2024 technical post on their Fast Apply model and speculative edits algorithm.

## Why Full-File Rewrites Beat Diffs

1. **Fewer thinking tokens**: Diffs constrain output tokens, giving model fewer forward passes
2. **Out of distribution**: Models see more full files than diffs in training
3. **Line number hallucination**: Tokenizers treat multi-digit numbers as single tokens; model must commit on first token

Cursor tested Aider-inspired search/replace diff format (no line numbers, redundant +/- markers). Only Claude Opus could output accurate diffs. Most models fail badly.

## Speculative Edits Algorithm

Unlike standard speculative decoding (draft model proposes, target verifies), Cursor's **speculative edits** uses the *existing code as draft tokens*. Since code edits reuse 80-90% of existing lines, the current file contents serve as high-quality draft predictions. The target model verifies which spans to keep vs replace.

This is deterministic speculation — no draft model needed. Deployed with Fireworks AI custom inference engine.

## Training Pipeline

Synthetic data from cmd-k prompts → GPT-4 produces chat response → LM "applies" change → mix with real apply data (80/20). Downsampled: small files, repeated filenames, no-op edits. Best model: Llama-3-70b fine-tuned.

## Relevance to Harness

Our P10 fuzzy edit matching addresses the same "diff problem" from the tool side. Cursor solves it from the model side (train model to output full rewritten files, not diffs). We should consider: for our edit tool, could we accept full-file rewrites and diff them server-side? This would be more model-friendly.
