import type { FactStore, ReadonlyFactStore } from "./fact-store.js";
import type { DispatchContext } from "./types.js";

export interface FactProvider {
  /** e.g. "fact.file.content" */
  id: string;
  /** Keys this provider writes, e.g. ["file.content", "file.lineCount"] */
  provides: string[];
  /** Keys that must exist in the store before this provider runs */
  requires: string[];
  appliesTo(ctx: DispatchContext): boolean;
  run(ctx: DispatchContext, store: FactStore): Promise<void> | void;
}

export interface FactRule {
  /** e.g. "rule.defensive.error-obscuring" */
  id: string;
  /** Keys required from the store — rule is skipped if any are absent */
  requires: string[];
  appliesTo(ctx: DispatchContext): boolean;
  evaluate(ctx: DispatchContext, store: ReadonlyFactStore): import("./types.js").Diagnostic[];
}
