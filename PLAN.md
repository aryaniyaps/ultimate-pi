# Plan

## Problem
- ddgr path in web-search skill is unreliable now.
- CLI gets aggressively rate-limited and sometimes fails on async server responses.
- Result: degraded or stalled web lookup flow.

## Immediate plan
1. Keep ddgr as default path, but treat current behavior as unstable.
2. Add retry and backoff plus tighter timeout handling in skill flow.
3. Add fallback search path when ddgr returns rate-limit or async/parse failures.
4. Log failure signatures so query/refinement logic can be tuned.

## Tracking note
- This issue is explicitly tracked here until web-search skill is hardened.
