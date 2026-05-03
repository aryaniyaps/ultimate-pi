---
type: source
source_type: interview-blog
title: "7 Learnings from Anders Hejlsberg: Architect Behind C# and TypeScript"
author: "Aaron Winston, GitHub Blog"
date_published: 2026-01-27
url: "https://github.blog/developer-skills/programming-languages-and-frameworks/7-learnings-from-anders-hejlsberg-the-architect-behind-c-and-typescript/"
confidence: high
key_claims:
  - "Fast feedback loops matter more than elegance"
  - "Scaling software means letting go of personal preferences"
  - "TypeScript succeeded because it extended JavaScript instead of replacing it"
  - "Visibility is part of what makes open source work — develop in the open"
  - "Behavioral compatibility often matters more than architectural purity"
  - "In an AI-driven workflow, grounding matters more than generation — type systems as guardrails"
  - "Leaving JavaScript as implementation language for Go was a necessary break for performance"
tags: [anders-hejlsberg, typescript, csharp, language-design, ai-coding]
---

# 7 Learnings from Anders Hejlsberg

## 1. Fast feedback matters more than almost anything else

Turbo Pascal's impact came from shortening the feedback loop — edit, compile, run without touching disk. "When you typed your code, you wanted to run it immediately." TypeScript's value comes from tooling: incremental checking, fast partial results, language services that respond quickly even on large codebases. Fast feedback changes behavior: developers experiment more, refactor more confidently, catch problems closer to introduction.

## 2. Scaling software means letting go of personal preferences

"You have to accept that things get done differently than you would have preferred. Fixing it would not really change the behavior anyway." The goal shifts from code that looks the way you'd write it to code that many people can understand, maintain, and evolve together.

## 3. TypeScript extended JavaScript instead of replacing it

Creating a brand-new language in 2012 would have required years of investment in editors, debuggers, and community adoption. TypeScript worked with constraints developers already had. "Meaningful progress often comes from making the systems you already depend on more capable instead of trying to start over."

## 4. Visibility is part of what makes open source work

2014 move to GitHub transformed TypeScript. Design debates, rejected ideas, and tradeoffs remain accessible. "12 years of history captured in our project."

## 5. Leaving JavaScript as implementation language was a necessary break

TypeScript compiler ported to Go for performance and concurrency. Not a rewrite — semantic fidelity was the goal. "The new compiler needed to behave exactly like the old one, including quirks and edge cases."

## 6. AI workflow: grounding matters more than generation

Hejlsberg skeptical of AI-first programming languages. The risk: "plausible, confident code that lacks enough grounding in the realities of a codebase." Strong type systems, reliable refactoring tools, and accurate semantic models become essential guardrails. "The most valuable tools in an AI-assisted workflow aren't the ones that generate the most code, but the ones that constrain it correctly."

## 7. Open collaboration builds institutional memory

"Years of discussion, decisions, and tradeoffs remain searchable and visible. That history does not disappear into private email threads or internal systems."
