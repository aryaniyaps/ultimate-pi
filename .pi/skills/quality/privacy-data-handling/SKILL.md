---
name: privacy-data-handling
description: Handle personal, sensitive, or customer data safely. Use when adding storage, logs, analytics, exports, imports, integrations, telemetry, search indexes, AI context, or user-facing data flows. Focuses on minimization, retention, access, deletion, and safe observability.
---

# Privacy and Data Handling

Use this skill when code touches data that may identify, describe, or affect people, customers, tenants, organizations, or secrets.

## Workflow

1. Classify data: public, internal, sensitive, personal, secret, regulated, or tenant-scoped.
2. Minimize collection, storage, logging, and propagation.
3. Keep access checks close to reads and writes.
4. Avoid placing sensitive data in logs, errors, metrics labels, analytics, caches, prompts, or filenames.
5. Define retention, deletion, and export implications when adding storage.
6. Redact or aggregate data used for observability.
7. Add tests for tenant isolation, access denial, and redaction where relevant.

## Review questions

- Who can read this data now?
- Where else does this data flow?
- Can it be deleted or corrected if needed?
- Is sensitive data copied into long-lived artifacts?
- Does the final response expose private values?
