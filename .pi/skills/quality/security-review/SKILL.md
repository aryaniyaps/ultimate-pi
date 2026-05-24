---
name: security-review
description: Run a lightweight security pass on code changes. Use when touching authentication, authorization, input handling, files, paths, commands, network calls, serialization, storage, secrets, dependencies, or user-controlled data. Focuses on trust boundaries and common vulnerability classes.
---

# Security Review

Use this skill whenever a change crosses a trust boundary.

## Checklist

- Authentication: is the actor known when required?
- Authorization: is the actor allowed to perform this action on this resource?
- Input validation: is untrusted input constrained before use?
- Injection: are queries, commands, paths, templates, and expressions safely constructed?
- Secrets: are credentials never logged, committed, exposed, or returned?
- Sensitive data: is private data minimized and protected?
- Deserialization/parsing: are formats constrained and failures explicit?
- Filesystem/process/network: are paths, arguments, redirects, and destinations controlled?
- Dependencies: does the change introduce known vulnerable or unnecessary packages?

## Workflow

1. Identify trust boundaries and attacker-controlled values.
2. Trace those values to sensitive sinks.
3. Add validation, authorization, escaping, or isolation at the right layer.
4. Add abuse-case tests for important risks.
5. Report any security assumption that remains unverified.

## Avoid

- Relying only on client-side checks.
- Logging full request bodies or tokens.
- Treating internal callers as inherently safe when data originated outside.
