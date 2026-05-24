---
name: microkernel
description: "Use when building plugin or extension architecture: a stable core kernel with explicit extension points, plugin contracts, registration, isolation, versioning, and compatibility checks."
---

# Microkernel / Plugin Architecture

Use this skill when the codebase needs a small core and independently variable plugins.

## Fit

Use for CLIs, editors, rules engines, integrations, workflow engines, agent tools, and product variants.
Avoid when variation is low or plugin isolation would add more complexity than it removes.

## Agent Workflow

1. Read `graphify-out/GRAPH_REPORT.md`.
2. Run `graphify query "microkernel plugin extension points core adapters"`.
3. Identify stable core responsibilities versus variable behavior.
4. Define extension contracts before extracting plugins.
5. Move one variable feature behind a plugin boundary.
6. Add compatibility and registration checks.

## Target Shape

```text
codebase/kernel/
  contracts           # plugin interfaces, capabilities, lifecycle
  registry            # discovery, validation, ordering
  runtime             # core orchestration
codebase/plugins/
  <plugin-name>/
    entrypoint        # manifest + implementation
    tests/
```

## Implementation Rules

- Kernel owns orchestration, lifecycle, contracts, capability negotiation, and safe defaults.
- Plugins own optional behavior only; they must not mutate kernel internals.
- Plugin APIs are versioned and narrow.
- Registration validates name, version, capabilities, dependencies, and conflicts.
- Side effects are exposed through kernel-provided services, not global imports.

## Migration Steps

1. Name the extension point.
2. Create contract and manifest types.
3. Implement an in-process registry.
4. Wrap one existing variation as the first built-in plugin.
5. Replace direct branching with registry dispatch.
6. Add contract tests reused by every plugin.

## Verification

- `graphify explain "registry"` should show kernel-to-plugin direction, not plugin-to-kernel internals.
- Add tests for plugin registration, invalid manifests, lifecycle failures, and version mismatch.
- Search for plugin imports of kernel private paths.

## Output Contract

Return: kernel boundary, extension points, plugin contract, migrated plugin, compatibility tests, and known limitations.
