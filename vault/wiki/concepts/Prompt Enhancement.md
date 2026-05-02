---
type: concept
title: "Prompt Enhancement"
created: 2026-04-30
status: developing
tags:
  - prompt-engineering
  - context
  - retrieval
aliases:
  - Prompt Enrichment
  - Context Injection
related:
  - "[[Context Engine (AI Coding)]]"
  - "[[Semantic Codebase Indexing]]"
sources:
  - "[[Augment Code WorkOS ERC 2025]]"
  - "[[Augment Code Codacy AI Giants]]"
updated: 2026-05-02

---# Prompt Enhancement

The process of automatically enriching a user's query with relevant codebase context before it reaches the LLM. The goal is to give the LLM the same understanding a senior engineer would have when approaching a task.

## How Augment's Prompt Enhancer Works

1. User types a query: "add logging to payment API."
2. Context Engine semantically searches the codebase for relevant code.
3. Enhancer constructs an augmented prompt containing:
   - The original query.
   - Relevant source files and their paths.
   - Existing patterns (how logging is done elsewhere).
   - Related utilities and libraries already in the codebase.
   - Team conventions and coding standards.
4. The augmented prompt is sent to the LLM.

## Key Design Principles

### Reuse Over Reinvention
The enhancer actively detects existing utilities and libraries. In Augment's demo, when asked to add Git branch info to a status bar, the enhancer detected an existing internal Git library and guided the agent to use it instead of shelling out to git.

### Context Budget Management
The enhancer must balance context richness with token budget:
- Retrieve only what's relevant (semantic search).
- Compress retrieved context (summarize large files).
- Rank by relevance, not just similarity.
- Respect the model's context window.

### Pattern Recognition
The enhancer learns from the codebase:
- Naming conventions.
- Error handling patterns.
- Import structure.
- Testing patterns.
- Architectural layering.

## Implementation for Our Harness

```python
def enhance_prompt(query: str, workspace: str) -> str:
    # 1. Semantic search for relevant code
    relevant_files = semantic_search(query, workspace, top_k=10)
    
    # 2. Extract patterns from relevant files
    patterns = extract_patterns(relevant_files)
    
    # 3. Find existing utilities/libraries
    utilities = find_related_utilities(query, workspace)
    
    # 4. Fetch wiki knowledge (our existing knowledge base)
    wiki_context = query_wiki(query)
    
    # 5. Build augmented prompt
    return build_prompt(
        query=query,
        relevant_code=relevant_files,
        patterns=patterns,
        utilities=utilities,
        wiki=wiki_context
    )
```

## Integration with Existing Harness

Our harness already has several context sources:
- **lean-ctx**: Exact file retrieval (grep, find, read).
- **wiki**: Architectural knowledge, research, patterns.
- **ctx_knowledge**: Persistent project conventions and gotchas.

Prompt enhancement would unify these into a preprocessing step before the main agent loop.
