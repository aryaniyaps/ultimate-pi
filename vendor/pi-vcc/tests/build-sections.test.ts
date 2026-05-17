import { describe, it, expect } from "bun:test";
import { buildSections } from "../src/core/build-sections";
import type { NormalizedBlock } from "../src/types";

describe("buildSections", () => {
  it("returns all-empty for no blocks", () => {
    const r = buildSections({ blocks: [] });
    expect(r.sessionGoal).toEqual([]);
    expect(r.outstandingContext).toEqual([]);
    expect(r.briefTranscript).toBe("");
  });

  it("populates sections from realistic blocks", () => {
    const blocks: NormalizedBlock[] = [
      { kind: "user", text: "Fix the auth bug" },
      { kind: "tool_call", name: "Read", args: { file_path: "auth.ts" } },
      { kind: "tool_result", name: "Read", text: "const x = 1;", isError: false },
      { kind: "tool_call", name: "Edit", args: { file_path: "auth.ts" } },
      { kind: "tool_result", name: "Edit", text: "ok", isError: false },
      { kind: "assistant", text: "- run tests next" },
    ];
    const r = buildSections({ blocks });
    expect(r.sessionGoal).toContain("Fix the auth bug");
    expect(r.briefTranscript).toContain('[user]');
    expect(r.briefTranscript).toContain('* Read "auth.ts"');
    expect(r.briefTranscript).toContain('* Edit "auth.ts"');
  });

  it("captures outstanding context from errors", () => {
    const blocks: NormalizedBlock[] = [
      { kind: "tool_result", name: "bash", text: "FAIL: test broken\ndetails here", isError: true },
    ];
    const r = buildSections({ blocks });
    expect(r.outstandingContext.length).toBeGreaterThan(0);
    expect(r.outstandingContext[0]).toContain("FAIL");
  });

  it("brief transcript hides tool results but shows errors", () => {
    const blocks: NormalizedBlock[] = [
      { kind: "tool_result", name: "Read", text: "lots of code here ...", isError: false },
      { kind: "tool_result", name: "bash", text: "Command not found", isError: true },
    ];
    const r = buildSections({ blocks });
    expect(r.briefTranscript).not.toContain("lots of code");
    expect(r.briefTranscript).toContain("[tool_error] bash");
    expect(r.briefTranscript).toContain("Command not found");
  });

  it("brief transcript merges adjacent assistant sections", () => {
    const blocks: NormalizedBlock[] = [
      { kind: "assistant", text: "Part one." },
      { kind: "tool_call", name: "Read", args: { file_path: "a.ts" } },
      { kind: "assistant", text: "Part two." },
    ];
    const r = buildSections({ blocks });
    const matches = r.briefTranscript.match(/\[assistant\]/g);
    expect(matches?.length).toBe(1);
  });
});
