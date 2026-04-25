# 0003 - Remove redundant README title heading when banner already contains title

- Date: 2026-04-25
- Status: Accepted

## Context
README shows an H1 title and a banner image.
Banner already contains the same project title text (Ultimate Pi).
User requested removing redundant headings.

## Alternatives
1. Keep H1 and keep banner unchanged.
2. Keep H1 and replace banner with non-title artwork.
3. Remove H1 and keep banner as top title element.

## Chosen option
Remove top-level H1 from README and keep banner at top.

## Rationale
- Directly satisfies user request with minimal diff.
- Avoids duplicate title presentation.
- Preserves remaining README structure.

## Consequences
- README no longer has explicit Markdown H1.
- Banner becomes primary title element.
