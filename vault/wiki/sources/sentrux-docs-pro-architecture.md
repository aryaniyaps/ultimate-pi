---
type: source
source_type: documentation
title: "sentrux Pro Architecture"
author: sentrux
date_published: 2026-03-19
date_fetched: 2026-05-03
url: https://raw.githubusercontent.com/sentrux/sentrux/main/docs/pro-architecture.md
confidence: high
key_claims:
  - "Free binary = 100% public source, fully functional"
  - "Pro features live in runtime-loaded pro.dylib, not behind if-flags"
  - "Ed25519 license keys with offline validation, no server call needed"
  - "Per-user watermarked dylib for anti-piracy"
  - "Pricing: Free / Pro $15/month / Team $40/month/seat"
tags:
  - sentrux
  - licensing
  - business-model
---

# sentrux Pro Architecture

## Design Principles
1. Free binary = 100% public source. Anyone can `cargo build` and verify.
2. Pro features live in pro.dylib, not behind `if tier.is_pro()` flags.
3. License key = Ed25519 signed JSON. Offline validation, no server needed.
4. Per-user watermarked dylib. Each download contains buyer's identity.
5. Source-available Pro code (BSL license — read/audit, not redistribute).

## License Key Format
```json
{
  "user": "github:yjing",
  "tier": "pro",
  "issued": "2026-03-18",
  "expires": "2026-04-18",
  "id": "lic_...",
  "sig": "base64_ed25519_signature"
}
```
Validation: parse JSON → verify Ed25519 sig → check expiry. No server call.

## Pro Features (vs Free)
| Feature | Free | Pro |
|---------|------|-----|
| Scanning (52 languages) | Yes | Yes |
| Quality signal, treemap, 3 color modes | Yes | Yes |
| MCP server (scores), rules engine, quality gate | Yes | Yes |
| MCP diagnostics (which files to fix) | — | Yes |
| 9 color modes (Age, Churn, Risk, Git, etc.) | — | Yes |
| File detail panel (per-function metrics) | — | Yes |
| Evolution details (hotspots, coupling, bus factor) | — | Yes |
| What-if analysis | — | Yes |

## Anti-Piracy Posture
Defense in depth: pro code in dylib, Ed25519 validation, per-user watermark, watermark-license cross-check, telemetry. Accepts that binary patching is always possible — "tiny number of people who crack a $15/month dev tool weren't going to pay."

## Build Pipeline
Public repo CI builds free binary. Private repo CI builds base pro.dylib (no watermark). CDN Worker watermarks and serves on valid license request.

## CLI Commands
```bash
sentrux login              # GitHub OAuth → purchase
sentrux pro activate <key> # saves license, downloads watermarked dylib
sentrux pro status         # shows tier, features
sentrux pro deactivate     # back to free
```

## Revenue Model
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Full scanning, scoring, treemap, 3 colors, MCP scores, rules |
| Pro | $15/mo | +6 colors, diagnostics, what-if, C4, evolution, file detail |
| Team | $40/mo/seat | +shared dashboard, drift alerts, PR annotations, SSO |
