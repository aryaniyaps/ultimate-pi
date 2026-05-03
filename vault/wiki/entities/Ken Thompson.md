---
type: entity
entity_type: person
title: "Ken Thompson"
role: "Co-creator of Unix, inventor of B language, UTF-8, Go"
active: true
tags: [person, unix, bell-labs, go]
related:
  - "[[Dennis Ritchie]]"
  - "[[unix-philosophy]]"
  - "[[birth-of-unix-kernighan-interview]]"
  - "[[subtractive-design]]"
---

# Ken Thompson

Co-creator of Unix at Bell Labs (1969), inventor of the B programming language (precursor to C), co-inventor of UTF-8 encoding, and co-designer of the Go programming language at Google. Turing Award recipient (1983).

## Engineering Practices

- **Extreme productivity from deep understanding**: built first Unix in 3 weeks. Reverse-engineered a typesetter in hours — wrote disassembler, assembler, and B interpreter for an unfamiliar CPU in a single day.
- **Subtractive design**: McIlroy recalled the Unix Room culture: "We used to sit around saying, 'What can we throw out? Why is there this option?'"
- **Make it easy to write, test, and run programs**: core design principle from 1974 Ritchie-Thompson Unix paper.
- **Pipes**: implemented the breakthrough composability mechanism that enabled the Unix tool ecosystem.

## Relevance to AI Coding Harness

Thompson's approach demonstrates that deep system understanding enables extreme leverage. For the harness: deep codebase understanding (semantic indexing, call graphs) must precede code generation. The "what can we throw out" ethic maps to a harness that proactively suggests deletions and simplifications, not just additions. Pipes map to composable agent architectures where specialized sub-tools chain together.
