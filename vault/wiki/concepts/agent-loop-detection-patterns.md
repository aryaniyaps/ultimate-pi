---
aliases: ["agent loop patterns", "stuck agent detection", "tool call loops"]
type: concept
title: "Agent Loop Detection Patterns"
created: 2026-04-30
status: developing
tags:
  - concept
  - loop-detection
  - agent-reliability
  - production
related:
  - "[[Research: Meta-Agent Context Drift Detection]]"
  - "[[context-drift-in-agents]]"
  - "[[meta-agent-context-pruning]]"
  - "[[langsight-loop-detection]]"
  - "[[ironclaw-drift-monitor]]"
updated: 2026-05-02

---# Agent Loop Detection Patterns

Production-grade detection patterns for identifying when an AI agent is stuck in a non-productive loop. Based on LangSight's production experience and ironclaw's DriftMonitor proposal.

## Three Loop Types

### 1. Direct Repetition

Same tool called with identical arguments multiple times in a row. Most common pattern.

**Cause**: Tool returns error or unexpected result. LLM's retry logic doesn't distinguish "transient failure, retry" from "structural failure, give up."

**Real-world example**: Support agent called `crm-mcp/lookup_customer` 89 times with identical arguments. CRM returned slightly malformed response. Agent decided it needed more data, called same tool, got same malformed response, repeated. Cost: $214.

**Detection**: `SHA256(tool_name + normalized_args)[:16]`. If same hash appears ≥3 times in session window, flag as loop.

### 2. Ping-Pong Between Tools

Two tools called alternately without state change between calls.

**Example**: Agent calls CRM → gets customer → calls Billing → gets invoices → calls CRM again with same args → calls Billing again.

**Detection**: Sequence pattern matching on last 6 calls. A-B-A-B-A-B pattern triggers detection.

### 3. Retry-Without-Progress

Tool call succeeds (no error) but response doesn't satisfy agent's internal goal. Agent keeps calling with minor argument variations.

**Detection**: Semantic similarity of consecutive reasoning outputs >0.95 cosine across multiple steps. Computationally expensive.

## Detection Approaches

### Approach 1: Argument Hash (Recommended)

```python
import hashlib, json
from collections import Counter

def compute_call_hash(tool_name: str, args: dict) -> str:
    payload = f"{tool_name}:{json.dumps(args, sort_keys=True)}"
    return hashlib.sha256(payload.encode()).hexdigest()[:16]

class LoopDetector:
    def __init__(self, threshold: int = 3):
        self.threshold = threshold
        self.call_counts = Counter()

    def record_call(self, tool_name: str, args: dict) -> bool:
        call_hash = compute_call_hash(tool_name, args)
        self.call_counts[call_hash] += 1
        return self.call_counts[call_hash] >= self.threshold
```

Catches >90% of real-world loops with zero false positives at threshold 3.

### Approach 2: Sliding Window Rate

Count tool calls regardless of argument variation. If tool called >N times in M seconds, flag.

```python
from collections import deque
from datetime import datetime, timedelta

class RateLoopDetector:
    def __init__(self, max_calls: int = 10, window_seconds: int = 60):
        self.max_calls = max_calls
        self.window = timedelta(seconds=window_seconds)
        self.call_times: dict[str, deque] = {}

    def record_call(self, tool_name: str) -> bool:
        now = datetime.utcnow()
        if tool_name not in self.call_times:
            self.call_times[tool_name] = deque()
        times = self.call_times[tool_name]
        while times and now - times[0] > self.window:
            times.popleft()
        times.append(now)
        return len(times) >= self.max_calls
```

### Approach 3: LLM Similarity

Compare semantic similarity between consecutive reasoning outputs. Most sophisticated but computationally expensive. Usually overkill — Approaches 1+2 catch >90%.

## Intervention Strategies

| Strategy | When | Risk |
|----------|------|------|
| **Warn + continue** | Early monitoring, unsure about thresholds | No false-termination risk, but loops continue |
| **Terminate session** | Production, confident in thresholds | False termination loses partial work |
| **Inject recovery** | Want agent to self-correct | Agent may ignore or loop again |
| **Prune + restart** | Proposed meta-agent pattern | Pruning may remove useful context |

## Threshold Tuning

- **Default**: 3 identical calls. Works for most agents.
- **Polling agents**: Use time-based windows (Approach 2), not count-based.
- **Retry-heavy workflows**: Increase to 5-7.
- **Sub-agents**: Each sub-agent gets own detector. Parent calling same sub-agent multiple times is not a loop.
- **Start with warn, switch to terminate**: Monitor for a week, then enforce.

## Always Combine With Budget Guardrails

Loop detection catches known patterns. Budget guardrails catch unknown patterns:
- Max cost per session ($1 default)
- Max steps (25 default)
- Max wall time (120s default)
- Soft alert at 80% of budget

## See Also

- [[meta-agent-context-pruning]] — Extends detection with pruning + restart
- [[langsight-loop-detection]] — Source: production deployment guide
- [[ironclaw-drift-monitor]] — Source: 5-rule DriftMonitor proposal
