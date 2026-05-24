/**
 * Oxlint runner for dispatch system
 *
 * Fast JavaScript/TypeScript linter written in Rust.
 * Drop-in replacement for ESLint with better performance.
 *
 * Requires: oxlint (npm install -g oxlint)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { safeSpawnAsync } from "../../safe-spawn.js";
import {
	getJstsLintPolicyForCwd,
	hasVitePlusConfig,
} from "../../tool-policy.js";
import { PRIORITY } from "../priorities.js";
import type {
	Diagnostic,
	DispatchContext,
	RunnerDefinition,
	RunnerResult,
} from "../types.js";
import {
	resolveToolCommand,
	resolveToolCommandWithInstallFallback,
} from "./utils/runner-helpers.js";

function resolveLocalVp(cwd: string): string | null {
	const isWin = process.platform === "win32";
	let dir = cwd;
	const root = path.parse(dir).root;
	while (true) {
		const candidates = isWin
			? [
					path.join(dir, "node_modules", ".bin", "vp.cmd"),
					path.join(dir, "node_modules", ".bin", "vp"),
				]
			: [path.join(dir, "node_modules", ".bin", "vp")];
		for (const candidate of candidates) {
			if (fs.existsSync(candidate)) return candidate;
		}
		if (dir === root) break;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

async function resolveVitePlusCommand(cwd: string): Promise<string | null> {
	const local = resolveLocalVp(cwd);
	if (local) return local;
	const version = await safeSpawnAsync("vp", ["--version"], {
		timeout: 5000,
		cwd,
	});
	return !version.error && version.status === 0 ? "vp" : null;
}

const oxlintRunner: RunnerDefinition = {
	id: "oxlint",
	appliesTo: ["jsts"],
	priority: PRIORITY.LINT_SECONDARY,
	enabledByDefault: true,
	skipTestFiles: true,

	async run(ctx: DispatchContext): Promise<RunnerResult> {
		const cwd = ctx.cwd || process.cwd();
		const policy = getJstsLintPolicyForCwd(cwd);
		if (!policy.preferredRunners.includes("oxlint")) {
			return { status: "skipped", diagnostics: [], semantic: "none" };
		}

		let cmd: string | null = null;
		let args: string[];
		if (hasVitePlusConfig(cwd)) {
			cmd = await resolveVitePlusCommand(cwd);
		}
		if (cmd) {
			args = ["lint", "--format", "unix", ctx.filePath];
		} else {
			// Use ctx.hasTool for async availability check — avoids the synchronous
			// spawnSync probe that blocks the event loop on first call per cwd.
			// FactStore caches the result for the session so subsequent writes are free.
			const oxlintCmd = resolveToolCommand(cwd, "oxlint") ?? "oxlint";
			cmd = (await ctx.hasTool(oxlintCmd))
				? oxlintCmd
				: await resolveToolCommandWithInstallFallback(cwd, "oxlint");
			args = ["--format", "unix", ctx.filePath];
		}
		if (!cmd) {
			return { status: "skipped", diagnostics: [], semantic: "none" };
		}

		// Run oxlint (or Vite+'s vp lint wrapper) on the file.
		const result = await safeSpawnAsync(cmd, args, {
			timeout: 30000,
		});

		// Oxlint returns non-zero when issues found
		if (result.status === 0) {
			return { status: "succeeded", diagnostics: [], semantic: "none" };
		}

		// Parse Unix format output: file:line:column: message (rule)
		const diagnostics = parseOxlintOutput(
			result.stdout + result.stderr,
			ctx.filePath,
		);

		if (diagnostics.length === 0) {
			return { status: "succeeded", diagnostics: [], semantic: "none" };
		}

		return {
			status: "failed",
			diagnostics,
			semantic: "warning",
		};
	},
};

function parseOxlintOutput(raw: string, filePath: string): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const lines = raw.split("\n");

	for (const line of lines) {
		// Parse: file:line:column: message (rule)
		// Example: src/main.ts:10:5: Unexpected console statement (no-console)
		const match = line.match(/^(.+):(\d+):(\d+):\s*(.+?)\s*\(([^)]+)\)$/);
		if (match) {
			const [, _file, lineStr, _col, message, rule] = match;
			diagnostics.push({
				id: `oxlint-${rule}-${lineStr}`,
				message: `${message} (${rule})`,
				filePath,
				line: parseInt(lineStr, 10),
				severity: "warning",
				semantic: "warning",
				tool: "oxlint",
				rule,
			});
		}
	}

	return diagnostics;
}

export default oxlintRunner;
