---
name: service-mesh
description: "Use when applying the service mesh pattern to service architectures: move cross-cutting network concerns such as retries, mTLS, routing, observability, policy, and traffic shaping out of service code while preserving domain ownership."
---

# Service Mesh Pattern

Use this skill when cross-service networking concerns are polluting service code or need centralized policy.

## Fit

Use with multiple networked services that need consistent traffic policy, mTLS, observability, retries, or progressive delivery.
Avoid for small systems where a mesh would add platform complexity without clear benefit.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "service mesh pattern microservices network policy observability"`.
3. Identify cross-cutting network behavior embedded in services.
4. Decide what belongs in mesh/platform versus application code.
5. Remove one cross-cutting concern from service code safely.
6. Add tests/config checks for equivalent behavior.

## Target Shape

```text
services/<service>/code/     # domain/application code without mesh vendor logic
platform/mesh/
  policies/
  routes/
  telemetry/
  security/
```

## Implementation Rules

- Service code owns business behavior, data, and explicit dependency calls.
- Mesh/platform owns mTLS, traffic routing, retries where safe, timeouts, telemetry, and policy.
- Do not hide business retries or non-idempotent compensation in mesh config.
- Timeout and retry budgets must align with application semantics.
- Mesh config is versioned, reviewed, and tested like code.

## Migration Steps

1. Inventory duplicated network concerns in services.
2. Pick one safe concern such as telemetry headers or mTLS policy.
3. Add mesh/platform config with rollout guardrails.
4. Remove redundant service code.
5. Validate runtime behavior in tests or staging.
6. Document ownership and rollback.

## Verification

- Use graphify to confirm service modules no longer depend on platform/mesh internals.
- Test timeout/retry behavior for idempotent and non-idempotent calls.
- Validate telemetry, route, and security policies with existing platform checks.

## Output Contract

Return: concern inventory, mesh/app ownership split, config/code patch, rollout plan, verification, and operational risks.
