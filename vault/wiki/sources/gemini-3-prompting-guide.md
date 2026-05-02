---
type: source
status: ingested
source_type: official-documentation
title: "Gemini 3 Prompting Guide"
author: "Google Cloud"
date_published: 2026-04-29
date_fetched: 2026-05-01
url: "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide"
confidence: high
key_claims:
  - "Temperature must stay at default 1.0 for Gemini 3 — lowering causes degraded performance"
  - "Constraints (especially negative) must be placed at the END of the prompt"
  - "Split-step verification prevents hallucination: verify capability → then generate"
  - "Model treats assigned personas seriously and may ignore instructions to maintain persona"
  - "Explicit grounding statement needed when working with hypothetical/ungrounded context"
  - "Synthesis across multiple sources improved by placing questions at end with 'Based on the entire document above...'"
  - "Gemini 3 is less verbose by default; must explicitly steer for conversational/chattier output"
tags:
  - prompting
  - google
  - gemini
  - model-specific
  - harness-design
created: 2026-05-02
updated: 2026-05-02

---# Gemini 3 Prompting Guide

Official prompting guide published by Google Cloud for Gemini 3 models on Vertex AI. Covers prompting strategies specific to Gemini 3's architecture and reasoning capabilities.

## Critical Model-Specific Rules

### Temperature Tuning
- **DO NOT lower temperature below 1.0.** Gemini 3's reasoning is optimized for the default.
- Changing temperature may cause unexpected behavior, looping, or degraded performance, especially for math/reasoning tasks.
- This is a hard constraint — not a suggestion.

### Prompt Structure
- **Context and source material first**
- **Main task instructions second**
- **Negative, formatting, and quantitative constraints LAST**
- The model may drop constraints (especially negative ones) if they appear too early.
- "Place your core request and most critical restrictions as the final line."

### Latency
- Set thinking level to `LOW` for lower latency
- Use system instructions like `think silently`

### Preventing Hallucination
- **Split-step verification**: Verify capability/information exists → then generate answer. Example: "Verify with high confidence if you're able to access the New York Times home page. If you cannot verify, state 'No Info' and STOP."
- **Do not use broad negative constraints** like "do not infer" — these cause over-indexing and failure to perform basic logic.
- Instead: "You are expected to perform calculations and logical deductions based strictly on the provided text. Do not introduce external information."

### Persona Handling
- Model treats assigned personas **very seriously**
- May ignore other instructions to maintain persona adherence
- Explicitly define persona boundaries: "You are a data extractor. You are forbidden from clarifying, explaining, or expanding terms."

### Grounding
- Model may revert to training data over provided context for hypothetical/unreal scenarios
- When working with ungrounded context, explicitly state: "You are a strictly grounded assistant limited to the information provided in the User Context. Treat the provided context as the absolute limit of truth."
- This must be an explicit, strong grounding statement — not implied.

### Synthesizing Multiple Sources
- Model may stop processing after first relevant match in large documents
- Place specific instructions/questions at the END, after data context
- Anchor reasoning: "Based on the entire document above, provide a comprehensive answer."
- Explicitly ask to "Synthesize all relevant information from the text."

### Output Verbosity
- Gemini 3 defaults to less verbose, direct, efficient answers
- For conversational/chatty output, must **explicitly** steer: "Explain this as a friendly, talkative assistant."

### Distinguishing Deduction from External Info
- Open-ended "do not infer" or "do not guess" causes over-indexing
- Better: "Use the provided additional information or context for deductions and avoid using outside knowledge."
- Distinguish between internal deduction (good) and external information injection (bad)
