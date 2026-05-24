---
name: api-contract-design
description: Design stable contracts for modules, services, commands, events, plugins, CLIs, and public interfaces. Use when adding or changing any boundary that other code or people depend on. Focuses on minimal contracts, compatibility, versioning, errors, idempotency, and documentation.
---

# API and Contract Design

Use this skill for any boundary with callers or consumers.

## Contract elements

Define:

- purpose and owner
- inputs and validation rules
- outputs and guarantees
- error cases
- idempotency and ordering expectations
- compatibility/versioning expectations
- security and privacy constraints
- observability expectations

## Workflow

1. Identify consumers and their real needs.
2. Keep the contract smaller than the implementation model.
3. Separate public contract from internal representation.
4. Make defaults and optional fields explicit.
5. Preserve backward compatibility unless a breaking change is approved.
6. Add contract tests or examples for important cases.
7. Document semantics near the contract surface.

## Review questions

- Can the implementation change without breaking consumers?
- Are failure modes part of the contract?
- Is the contract stable enough to test?
- Are names domain-specific and unambiguous?
