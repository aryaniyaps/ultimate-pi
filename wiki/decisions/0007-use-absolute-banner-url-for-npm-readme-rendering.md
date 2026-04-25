# 0007 - Use absolute banner URL for npm README rendering

- Date: 2026-04-25
- Status: Accepted

## Context
README banner currently uses repository-relative path .github/banner.png.
GitHub renders relative image paths in repository context.
npm README rendering does not reliably resolve repository-relative image paths.

## Alternatives
1. Keep relative image path.
2. Remove banner image from README.
3. Use absolute raw GitHub URL to banner asset.

## Chosen option
Replace README banner image path with absolute raw.githubusercontent.com URL.

## Rationale
- Works in npm package page rendering.
- Still works in GitHub README rendering.
- Minimal one-line README diff.

## Consequences
- URL tied to repository path/branch (main).
- Banner breaks if file path or default branch changes.
