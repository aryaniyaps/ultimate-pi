---
type: entity
entity_type: person
title: "Bjarne Stroustrup"
role: "Creator of C++"
active: true
tags: [person, c++, language-design, columbia]
related:
  - "[[pragmatic-language-design]]"
---

# Bjarne Stroustrup

Creator of C++ (1985). Professor at Columbia University. Member of US National Academy of Engineering. Recipient of the 2018 Charles Stark Draper Prize.

## Engineering Practices

- **C compatibility as pragmatic choice**: "Within C++, there is a much smaller and cleaner language struggling to get out... [which] would have been an unimportant cult language." Stroustrup prioritized real-world adoption over theoretical purity.
- **Evolutionary design**: The Design and Evolution of C++ documents decisions across decades. "Language design issues, fundamental design decisions, and history don't change very often."
- **Programming is for others**: "Assumes that your aim is to eventually write programs that are good enough for others to use and maintain." Focus on fundamental concepts, not language-technical details.
- **Static typing as safety and efficiency**: committed to static type checking over dynamic typing for systems programming. Type safety enables both performance and correctness guarantees.
- **C++ Core Guidelines**: community-driven standardization of best practices, maintained on GitHub.

## Relevance to AI Coding Harness

Stroustrup's evolutionary approach maps to incremental harness improvement rather than rewrites. C++ compatibility with C demonstrates that working within existing ecosystem constraints produces wider adoption than clean-slate designs. The focus on programs "good enough for others to use and maintain" maps directly to harness quality gates: AI output must pass the same maintainability standards as human code. Static typing as guardrail echoes Hejlsberg's view that types constrain AI output correctly.
