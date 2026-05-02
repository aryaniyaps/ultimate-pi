---
type: source
source_type: engineering-blog
title: "How to Build Prompt Pipelines with Jinja2 Templating"
author: "Qasim"
date_published: 2026-02-15
url: "https://agentbus.sh/posts/how-to-build-prompt-pipelines-with-jinja2-templating/"
confidence: high
tags:
  - prompt-templating
  - jinja2
  - prompt-pipelines
  - multi-model
related:
  - "[[Research: Prompt Renderer for Multi-Model Agent Harness]]"
key_claims:
  - "Jinja2 provides variables, conditionals, loops, and template inheritance — the same tools that power web frameworks applied to prompt engineering"
  - "Template inheritance (base → child) enables layered prompt systems where adding a new step means creating one .j2 file"
  - "Pipeline runner: define pipelines as data, not code — `inputs_from` mapping connects step outputs to next step's template vars"
  - "Common errors: undefined variables (use defaults), template path issues (use absolute paths), whitespace (use trim_blocks/lstrip_blocks)"
  - "One template handles both zero-shot and few-shot — you control behavior through data, not separate prompt strings"
---

# Prompts as Jinja2 Pipelines

## Core Pattern

```python
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("templates"))
template = env.get_template("classify.j2")
prompt = template.render(role="classifier", categories=["pos","neg"], text="...")
```

## Template Inheritance for Prompt Chains

Base template (`base_prompt.j2`):
```jinja2
You are a {{ role | default("helpful assistant") }}.
{% block task %}{% endblock %}
{% block format_instructions %}Respond in plain text.{% endblock %}
```

Child template (`summarize.j2`):
```jinja2
{% extends "base_prompt.j2" %}
{% block task %}
Summarize in {{ num_sentences }} sentences.
Document: {{ document }}
{% endblock %}
```

## Reusable Pipeline Runner

```python
def run_pipeline(steps: list[dict]) -> dict[str, str]:
    results = {}
    for step in steps:
        kwargs = step.get("kwargs", {})
        for key, ref in step.get("inputs_from", {}).items():
            kwargs[key] = results[ref]
        results[step["name"]] = run_prompt(step["template"], **kwargs)
    return results
```

## Key Takeaways for ultimate-pi

1. **FileSystemLoader + .j2 files** = version-controlled, reviewable prompt templates separate from app logic
2. **Template inheritance** = base prompt defined once, per-model variants extend/override blocks
3. **Conditionals + loops** = dynamic few-shot examples, variable-length context injection
4. **Pipeline as data** = declarative step definitions with explicit data flow
5. **Common pitfalls**: undefined vars → use `| default()`; whitespace → `trim_blocks=True`; special chars → never concatenate user input into template strings
