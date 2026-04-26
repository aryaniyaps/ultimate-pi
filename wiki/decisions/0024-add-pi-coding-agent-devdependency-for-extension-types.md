# 0024 - Add `@mariozechner/pi-coding-agent` as dev dependency for extension type resolution

- Date: 2026-04-26
- Status: Accepted

## Context
TypeScript in `extensions/lean-ctx-enforce.ts` imports from `@mariozechner/pi-coding-agent`.
Without a local dependency entry, editor/TS tooling reports:
`Cannot find module '@mariozechner/pi-coding-agent' or its corresponding type declarations.`

## Alternatives
1. Add ambient module shim (`declare module ...`) locally.
2. Remove typings and use `any`/dynamic imports.
3. Add official package as a development dependency.

## Chosen option
Adopt option 3.

## Rationale
- Uses upstream official type declarations (`dist/index.d.ts`).
- Avoids brittle local shims and type drift.
- Keeps runtime behavior unchanged while fixing IDE/TS resolution.

## Consequences
- Repo now expects `npm install` to include one dev dependency.
- Type tooling can resolve extension imports cleanly.
- No extension runtime logic changes.
