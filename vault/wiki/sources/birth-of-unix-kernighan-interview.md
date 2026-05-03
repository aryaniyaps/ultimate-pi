---
type: source
source_type: interview-podcast
title: "The Birth of UNIX — Brian Kernighan on Bell Labs"
author: "Brian Kernighan (interviewed by Adam Gordon Bell)"
date_published: 2020-11-01
url: "https://corecursive.com/brian-kernighan-unix-bell-labs1/"
confidence: high
key_claims:
  - "Ken Thompson built the first working Unix in 3 weeks"
  - "Bell Labs culture: shared machine, shared source tree, everyone on same filesystem"
  - "The Unix Room as collaborative physical space"
  - "Ken Thompson reversed-engineered a typesetter in hours: disassembler, assembler, B interpreter"
  - "Pipes enabled Cambrian explosion of composable tools"
  - "Community built around shared machine and shared source — `who` command as social tool"
  - "The only rule: you changed it last, it's yours"
tags: [unix, bell-labs, ken-thompson, brian-kernighan, history]
---

# The Birth of UNIX — Brian Kernighan Interview

## Ken Thompson's Productivity

- Built first working Unix in 3 weeks while wife was on vacation.
- Reverse-engineered a typesetter in hours: wrote a disassembler for an unfamiliar CPU from binary code, then an assembler, then a B language interpreter — all in about a day.
- Brian Kernighan: "For Ken, it was just like breathing. Oh, okay, done. Next."

## The Unix Room Culture

- Physical shared space on Bell Labs 6th floor with a PDP-11 and teletypes.
- "If you wanted, you could go sit in your office and think deep thoughts... then come back to the common space when you wanted to."
- Shared machine + shared filesystem: everyone could see everyone's source code.
- "The only real rule: you changed it last, it's yours."
- `who` command as community builder — showed who was logged in and when they last acted.
- 10-kilo chocolate bars on the table, Private Eye magazine from Dennis Ritchie.

## The Pipes Breakthrough

- Doug McIlroy pushed for program composition for years.
- Ken Thompson implemented it. The pipe symbol `|` "just clicked instantly."
- Within days: "frenzy of fixing up programs so that they would work properly in pipelines."
- Sort was repackaged to read stdin/write stdout — pattern used daily by millions since.

## Kernighan on Modern Programming

- "I found it easier to program when I was trying to figure out the logic for myself rather than trying to figure out where in the infinite stack of documentation was the function I needed."
- "Too much of today's programming is more like looking it up."

## Richard Hamming's Influence

- "He would reserve Friday afternoons for thinking great thoughts."
- Asked chemists: "Could your work lead to a Nobel Prize? If not, why are you working on it?"
- But the Unix work itself didn't seem important at the time — it was just making programming easier for themselves.

## Kernighan's Thesis as Tool-Building Metaphor

- His PhD thesis formatting program: the first 500 cards were the program, the remaining 5,500 were the thesis. "It's building tools that let you do things, and the tools are often some kind of specialized language."
