/**
 * test-diff-integrity — detect suspicious test edits.
 *
 * Flags:
 * - assertion removal patterns
 * - skip inflation (`it.skip`, `describe.skip`, `xit`, `xdescribe`)
 * - disabled/no-test bypass flags in bash
 *
 * On detection, this extension emits escalation records so adversarial review
 * becomes mandatory in downstream policy gates.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const INCIDENTS_DIR = join(process.cwd(), ".pi", "harness", "incidents");
const INCIDENT_FILE = join(INCIDENTS_DIR, "test-diff-integrity.jsonl");

interface IntegrityFlag {
	timestamp: string;
	tool_name: string;
	file_path?: string;
	severity: "medium" | "high";
	reasons: string[];
	force_adversary: boolean;
}

interface EditWriteInputLike {
	filePath?: unknown;
	oldString?: unknown;
	newString?: unknown;
	content?: unknown;
}

function nowIso(): string {
	return new Date().toISOString();
}

function looksLikeTestPath(path: string): boolean {
	const p = path.toLowerCase();
	return (
		p.includes("/test/") ||
		p.includes("/tests/") ||
		p.endsWith(".test.ts") ||
		p.endsWith(".test.tsx") ||
		p.endsWith(".spec.ts") ||
		p.endsWith(".spec.tsx") ||
		p.endsWith(".test.js") ||
		p.endsWith(".spec.js")
	);
}

function countAssertions(content: string): number {
	const patterns = [
		/\bexpect\s*\(/g,
		/\bassert(?:ion)?\b/g,
		/\bto(be|equal|strict)/g,
	];
	let total = 0;
	for (const pattern of patterns) {
		total += (content.match(pattern) ?? []).length;
	}
	return total;
}

function countSkipTokens(content: string): number {
	const patterns = [
		/\bit\.skip\s*\(/g,
		/\bdescribe\.skip\s*\(/g,
		/\bxit\s*\(/g,
		/\bxdescribe\s*\(/g,
		/\btest\.skip\s*\(/g,
	];
	let total = 0;
	for (const pattern of patterns)
		total += (content.match(pattern) ?? []).length;
	return total;
}

function inspectEditLikeChange(
	oldText: string,
	newText: string,
): { reasons: string[]; severity: "medium" | "high" | null } {
	const reasons: string[] = [];
	let severity: "medium" | "high" | null = null;

	const oldAssertions = countAssertions(oldText);
	const newAssertions = countAssertions(newText);
	if (oldAssertions > 0 && newAssertions < oldAssertions) {
		reasons.push(`assertions decreased (${oldAssertions} -> ${newAssertions})`);
		severity = "high";
	}

	const oldSkips = countSkipTokens(oldText);
	const newSkips = countSkipTokens(newText);
	if (newSkips > oldSkips) {
		reasons.push(`skip markers increased (${oldSkips} -> ${newSkips})`);
		if (!severity) severity = "medium";
	}

	if (/\b(passWithNoTests|--pass-with-no-tests)\b/i.test(newText)) {
		reasons.push("contains no-tests bypass token");
		if (!severity) severity = "medium";
	}

	return { reasons, severity };
}

function inspectBashCommand(command: string): {
	reasons: string[];
	severity: "medium" | "high" | null;
} {
	const reasons: string[] = [];
	let severity: "medium" | "high" | null = null;
	const c = command.toLowerCase();

	if (c.includes("--passwithnotests") || c.includes("--pass-with-no-tests")) {
		reasons.push("test command uses --passWithNoTests");
		severity = "high";
	}
	if (c.includes("|| true")) {
		reasons.push("test command includes '|| true' bypass");
		if (!severity) severity = "medium";
	}
	if (/\b(skipping tests|disable tests)\b/.test(c)) {
		reasons.push("test disablement phrase detected");
		if (!severity) severity = "medium";
	}
	return { reasons, severity };
}

async function recordIntegrityFlag(flag: IntegrityFlag): Promise<void> {
	await mkdir(INCIDENTS_DIR, { recursive: true });
	await appendFile(INCIDENT_FILE, `${JSON.stringify(flag)}\n`, "utf-8");
}

export default function testDiffIntegrity(pi: ExtensionAPI) {
	pi.on("tool_call", async (event) => {
		if (event.toolName === "bash") {
			const command = String(event.input.command ?? "");
			const { reasons, severity } = inspectBashCommand(command);
			if (!severity) return undefined;
			const flag: IntegrityFlag = {
				timestamp: nowIso(),
				tool_name: "bash",
				severity,
				reasons,
				force_adversary: true,
			};
			await recordIntegrityFlag(flag);
			pi.appendEntry("harness-test-integrity-flag", flag);
			pi.appendEntry("harness-policy-escalation", {
				timestamp: nowIso(),
				reason: "test_diff_integrity",
				force_adversary: true,
				risk_level: "high",
			});
			return undefined;
		}

		if (event.toolName !== "edit" && event.toolName !== "write")
			return undefined;
		const input = event.input as EditWriteInputLike;
		const filePath = String(input.filePath ?? "");
		if (!filePath || !looksLikeTestPath(filePath)) return undefined;

		const oldText = String(input.oldString ?? "");
		const newText =
			String(input.newString ?? "") || String(input.content ?? "");

		const { reasons, severity } = inspectEditLikeChange(oldText, newText);
		if (!severity) return undefined;

		const flag: IntegrityFlag = {
			timestamp: nowIso(),
			tool_name: event.toolName,
			file_path: filePath,
			severity,
			reasons,
			force_adversary: true,
		};
		await recordIntegrityFlag(flag);
		pi.appendEntry("harness-test-integrity-flag", flag);
		pi.appendEntry("harness-policy-escalation", {
			timestamp: nowIso(),
			reason: "test_diff_integrity",
			force_adversary: true,
			risk_level: severity === "high" ? "high" : "med",
			file_path: filePath,
		});

		if (
			severity === "high" &&
			process.env.HARNESS_TEST_INTEGRITY_BLOCK === "true"
		) {
			return {
				block: true,
				reason: `test-diff-integrity: blocked suspicious test edit (${reasons.join("; ")})`,
			};
		}
		return undefined;
	});

	pi.registerCommand("harness-test-integrity-last", {
		description: "Show latest test-diff-integrity escalation",
		handler: async (_args, ctx) => {
			const entries = ctx.sessionManager.getEntries();
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				if (
					entry.type !== "custom" ||
					entry.customType !== "harness-test-integrity-flag"
				) {
					continue;
				}
				const data = entry.data as IntegrityFlag;
				const msg = [
					"Latest test integrity flag:",
					`  severity: ${data.severity}`,
					`  tool: ${data.tool_name}`,
					`  file: ${data.file_path ?? "(n/a)"}`,
					`  reasons: ${data.reasons.join("; ")}`,
				].join("\n");
				if (ctx.hasUI) {
					ctx.ui.notify(msg, data.severity === "high" ? "warning" : "info");
				} else {
					pi.sendMessage({
						customType: "harness-test-integrity-last",
						content: msg,
						display: true,
					});
				}
				return;
			}
			if (ctx.hasUI)
				ctx.ui.notify("No test integrity flags in this session.", "info");
		},
	});
}
