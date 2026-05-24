---
name: performance-measurement
description: Improve performance with evidence instead of premature optimization. Use when optimizing latency, throughput, memory, startup, storage, queries, algorithms, rendering, build time, or hot paths. Guides baseline measurement, bottleneck isolation, complexity analysis, and regression guards.
---

# Performance Measurement

Use this skill before and during performance work.

## Workflow

1. Define the performance goal and user/system impact.
2. Measure a baseline with representative input or workload.
3. Identify the bottleneck before changing code.
4. Estimate algorithmic complexity and data-size effects.
5. Make the smallest optimization that targets the measured bottleneck.
6. Re-measure and compare against the baseline.
7. Add a benchmark, regression test, or monitoring signal when future regressions matter.
8. Preserve readability unless performance evidence justifies complexity.

## Common bottleneck classes

- repeated expensive work
- inefficient data access pattern
- unnecessary serialization/parsing
- blocking IO in hot path
- unbounded memory growth
- poor batching/caching strategy
- algorithmic complexity mismatch

## Avoid

- Optimizing cold paths.
- Adding caches without invalidation rules.
- Trading correctness or maintainability for unmeasured speed.
