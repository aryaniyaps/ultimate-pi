---
type: source
source_type: interview-blog
title: "Python's Design Philosophy — Guido van Rossum"
author: "Guido van Rossum"
date_published: 2009-01-13
url: "http://python-history.blogspot.com/2009/01/pythons-design-philosophy.html"
confidence: high
key_claims:
  - "Borrow ideas from elsewhere whenever it makes sense"
  - "Things should be as simple as possible, but no simpler (Einstein)"
  - "Do one thing well (Unix philosophy)"
  - "Don't fret too much about performance — plan to optimize later"
  - "Don't try for perfection because 'good enough' is often just that"
  - "It's okay to cut corners sometimes, especially if you can do it right later"
  - "The Python implementation should not be tied to a particular platform"
  - "Errors should not be fatal. At the same time, errors should not pass silently"
  - "A bug in the user's Python code should never lead to undefined behavior of the interpreter"
tags: [python, guido-van-rossum, language-design, zen-of-python]
also_see:
  - "[[guido-van-rossum-2025-interview]]"
---

# Python's Design Philosophy — Guido van Rossum

## Timesaving Rules (from Python's origin as skunkworks project)

- Borrow ideas from elsewhere whenever it makes sense.
- "Things should be as simple as possible, but no simpler." (Einstein)
- Do one thing well (The Unix Philosophy).
- Don't fret too much about performance — plan to optimize later when needed.
- Don't fight the environment and go with the flow.
- Don't try for perfection because "good enough" is often just that.
- It's okay to cut corners sometimes, especially if you can do it right later.

## Design Principles

- The Python implementation should not be tied to a particular platform.
- Don't bother users with details that the machine can handle.
- Support and encourage platform-independent user code, but don't cut off access to platform capabilities.
- A large complex system should have multiple levels of extensibility.
- Errors should not be fatal. User code should be able to recover.
- Errors should not pass silently (led to exceptions throughout).
- A bug in user code should never lead to undefined interpreter behavior; a core dump is never the user's fault.

## The Zen of Python (Tim Peters)

Beautiful is better than ugly. Explicit is better than implicit. Simple is better than complex. Readability counts. Errors should never pass silently. In the face of ambiguity, refuse the temptation to guess. There should be one — and preferably only one — obvious way to do it. If the implementation is hard to explain, it's a bad idea. Namespaces are one honking great idea.

## Deliberate Departures from ABC

The ABC group (where van Rossum worked before Python) strived for perfection, used optimal algorithms for asymptotically large collections (bad for small ones), isolated users from the "big bad world of computers," and created a closed system. Python deliberately went opposite: pragmatic, evolutionary, open, and welcoming of user participation in design.

## Guido's 2025 Perspective on Type Hints

"Type hints are useful above about 10,000 lines of code — below that, it's of diminishing value since a developer can keep enough of it in their head. I wouldn't foist them upon beginners." (Source: [[guido-van-rossum-2025-interview]])
