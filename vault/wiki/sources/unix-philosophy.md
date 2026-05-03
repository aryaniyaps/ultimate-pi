---
type: source
source_type: encyclopedia
title: "Unix Philosophy"
author: "Wikipedia contributors; originating from Ken Thompson, Dennis Ritchie, Doug McIlroy"
date_published: 2025
url: "https://en.wikipedia.org/wiki/Unix_philosophy"
confidence: high
key_claims:
  - "Write programs that do one thing and do it well"
  - "Write programs to work together"
  - "Write programs to handle text streams, because that is a universal interface"
  - "The power of a system comes more from the relationships among programs than from the programs themselves"
  - "Everything was small... What can we throw out?"
  - "Prototype software before polishing it"
tags: [unix, philosophy, composability, pipes, minimalism]
---

# Unix Philosophy

## Core Tenets (Doug McIlroy, 1978)

1. Make each program do one thing well. To do a new job, build afresh rather than complicate old programs by adding new features.
2. Expect the output of every program to become the input to another, as yet unknown, program. Don't clutter output with extraneous information.
3. Design and build software, even operating systems, to be tried early, ideally within weeks. Don't hesitate to throw away clumsy parts and rebuild them.
4. Use tools in preference to unskilled help to lighten a programming task.

## The 1994 Summary (Peter Salus, crediting McIlroy)

- Write programs that do one thing and do it well.
- Write programs to work together.
- Write programs to handle text streams, because that is a universal interface.

## Eric Raymond's 17 Unix Rules (The Art of Unix Programming, 2003)

Key rules: Build modular programs. Write readable programs. Use composition. Separate mechanisms from policy. Write simple programs. Write small programs. Write transparent programs. Write robust programs. Make data complicated when required, not the program. Value developer time over machine time. Prototype before polishing.

## McIlroy's Critique of Linux Bloat

Douglas McIlroy: "Adoring admirers have fed Linux goodies to a disheartening state of obesity. Everything was small... We used to sit around in the Unix Room saying, 'What can we throw out? Why is there this option?' It's often because there is some deficiency in the basic design — you didn't really hit the right design point. Instead of adding an option, think about what was forcing you to add that option."

## Worse is Better (Richard P. Gabriel)

Unix embodied "worse is better": simplicity of interface and implementation matters more than correctness, consistency, and completeness. This design style has key evolutionary advantages.

## The Pipes Breakthrough

The vertical bar (`|`) emerged from Doug McIlroy's long-standing desire for program composition. Ken Thompson implemented it. The notation "just clicked instantly." Within days, there was a "frenzy of going in and fixing up programs so that they would work properly in pipelines." Sort was repackaged to read stdin and write stdout — a pattern now used daily by millions.
