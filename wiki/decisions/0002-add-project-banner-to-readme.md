# 0002 - Add project banner to README

- Date: 2026-04-25
- Status: Accepted

## Context
User requested adding .github/banner.png to README.md as project banner.
README currently has no image banner.

## Alternatives
1. Keep no banner.
2. Use HTML img tag for size/alignment control.
3. Use standard Markdown image link.

## Chosen option
Use standard Markdown image syntax near top of README:
![Ultimate PI banner](.github/banner.png)

## Rationale
- Minimal diff.
- Renders on GitHub without extra HTML.
- Keeps README portable and simple.

## Consequences
- Large image may dominate first screen on some displays.
- Future size control would require switching to HTML tag.
