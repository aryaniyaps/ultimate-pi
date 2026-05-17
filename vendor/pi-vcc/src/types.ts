import type { Message } from "@mariozechner/pi-ai";

export interface FileOps {
  readFiles?: string[];
  modifiedFiles?: string[];
  createdFiles?: string[];
}

export type NormalizedBlock =
  | { kind: "user"; text: string; sourceIndex?: number }
  | { kind: "assistant"; text: string; sourceIndex?: number }
  | { kind: "tool_call"; name: string; args: Record<string, unknown>; sourceIndex?: number }
  | { kind: "tool_result"; name: string; text: string; isError: boolean; sourceIndex?: number }
  | { kind: "thinking"; text: string; redacted: boolean; sourceIndex?: number };
