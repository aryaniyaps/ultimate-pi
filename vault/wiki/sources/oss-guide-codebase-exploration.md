---
type: source
source_type: blog
title: "General Guide For Exploring Large Open Source Codebases"
author: "Parth Parikh, Kishore Ganesh, Chris Ewald, Cory Massaro, Makrand Rajagopal, Sarthak Kundra"
date_published: 2021
url: "https://pncnmnp.github.io/blogs/oss-guide.html"
confidence: high
key_claims:
  - "Human contributors should use a project before contributing to understand its breadth"
  - "Earliest commits reveal the core architecture and initial goals"
  - "Test cases are the best form of documentation for understanding expected behavior"
  - "Don't try to understand the whole codebase; narrow scope to relevant subsystem"
  - "Paper Cut Principle: many small fixes across the codebase builds deep understanding over time"
  - "Reproduce the bug before planning a fix; write a failing test"
  - "Structured theorizing with creative hypothesis generation and verification"
  - "Use debugging, logging, and profilers in addition to print statements"
  - "Feedback from maintainers and rubber-duck debugging are effective"
status: ingested
tags:
  - codebase-exploration
  - open-source
  - human-guide
created: 2026-04-30
updated: 2026-04-30

---# General Guide For Exploring Large Open Source Codebases

A guide created in Fall 2020 for MLH Fellows on how to explore and contribute to large open-source codebases. The guide covers the full lifecycle: choosing a project, getting started, discovering issues, planning, coding, and claiming issues.

## Key Sections

### Getting Started
- **Use it**: Build something with the project to understand its breadth
- **Earliest commits**: Initial commits contain the core architecture and goals
- **Test cases**: Tests are the best documentation — shows how authors expect things to work
- **Tools**: UML diagrams, pyreverse for class diagrams, call graphs for runtime visualization
- **Git log trick**: `git log --pretty=format: --name-only | sort | uniq -c | sort -rg | head -10` to find most-edited files (80/20 rule)
- **Searching**: grep, ctags integrated with vim, GitHub's `/` search

### Planning
- Use the issue description fully — maintainers often identify affected areas
- Don't try to understand the whole codebase — scope down to the relevant subsystem
- **Paper Cut Principle**: many small fixes across the codebase builds mastery
- Figure out how your part fits in; treat everything else as a black box
- Reproduce the issue before planning
- Structured theorizing: brainstorm causes, verify each

### Coding
- Feedback from mentors/maintainers — rubber duck debugging works
- Debugging: step through with gdb/pdb, use data breakpoints
- Logging and profilers for non-linear, multithreaded, or destructive programs
- "Hack it, then get it right" — proof of concept first, robust later
