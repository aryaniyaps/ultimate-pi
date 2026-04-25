# 0008 - Rename banner asset for cache-busting on npm README

- Date: 2026-04-25
- Status: Accepted

## Context
Banner image update is not reflected on npm package page.
README already uses absolute raw.githubusercontent URL.
Likely cause is CDN/browser cache on unchanged asset path.

## Alternatives
1. Keep same filename and wait for cache expiry.
2. Add query parameter to image URL.
3. Rename banner file and update README URL.

## Chosen option
Rename banner file path from .github/banner.png to .github/banner-v2.png and update README reference.

## Rationale
- New path forces cache miss immediately.
- Minimal, safe change.
- Works in GitHub and npm renderers.

## Consequences
- Any external links to old filename break.
- Future banner refreshes should use versioned filenames.
