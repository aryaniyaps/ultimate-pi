/**
 * Biome check runner for dispatch system
 *
 * Dispatch mode is diagnostics-only.
 * Autofix is handled earlier by the post-write pipeline to avoid
 * mutating files mid-dispatch after LSP sync has already happened.
 */

import * as path from "node:path";
import { resolvePackagePath } from "../../package-root.js";
import { safeSpawnAsync } from "../../safe-spawn.js";
import {
	getAutofixCapability,
	getBiomeConfigPath,
	getJstsLintPolicyForCwd,
} from "../../tool-policy.js";
import { PRIORITY } from "../priorities.js";
import type {
	Diagnostic,
	DispatchContext,
	RunnerDefinition,
	RunnerResult,
} from "../types.js";

import { resolveToolCommandWithInstallFallback } from "./utils/runner-helpers.js";

interface BiomeDiagnostic {
	severity: "error" | "warning" | "information" | "hint";
	category: string;
	message: string;
	location: {
		source: string;
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
	tags?: string[];
}

function parseBiomeJson(
	raw: string,
	filePath: string,
): { diagnostics: Diagnostic[]; parseError?: string } {
	try {
		const result = JSON.parse(raw);
		const diagnostics: BiomeDiagnostic[] = result.diagnostics || [];
		const autofix = getAutofixCapability("biome");

		return {
			diagnostics: diagnostics.map((d) => ({
				id: `biome:${d.category}:${d.location.start.line}`,
				message: d.message,
				filePath,
				line: d.location.start.line,
				column: d.location.start.column,
				severity: d.severity === "error" ? "error" : "warning",
				semantic: d.severity === "error" ? "blocking" : ("warning" as const),
				tool: "biome",
				rule: d.category,
				fixable: d.tags?.includes("fixable") ?? false,
				autoFixAvailable:
					(d.tags?.includes("fixable") ?? false) &&
					(autofix?.safePipelineAutofix ?? false),
				fixKind:
					d.tags?.includes("fixable") && autofix?.fixKind !== "none"
						? autofix?.fixKind
						: undefined,
			})),
		};
	} catch (err) {
		return {
			diagnostics: [],
			parseError: err instanceof Error ? err.message : String(err),
		};
	}
}

const biomeCheckJsonRunner: RunnerDefinition = {
	id: "biome-check-json",
	appliesTo: ["jsts"],
	priority: PRIORITY.FORMAT_AND_LINT_PRIMARY,
	enabledByDefault: true,

	async run(ctx: DispatchContext): Promise<RunnerResult> {
		const cwd = ctx.cwd || path.dirname(ctx.filePath);
		const policy = getJstsLintPolicyForCwd(cwd);

		// Defer to ESLint/oxlint if the project has explicitly configured one —
		// biome runs as the default linter only when no alternative is present.
		if (!policy.hasBiomeConfig && policy.hasExplicitNonBiomeLinter) {
			return { status: "skipped", diagnostics: [], semantic: "none" };
		}

		const cmd = await resolveToolCommandWithInstallFallback(cwd, "biome");
		if (!cmd) {
			return { status: "skipped", diagnostics: [], semantic: "none" };
		}

		// Build config path — use user's if exists, else pi-lens config
		const userConfigPath = getBiomeConfigPath(cwd);
		const configArg = [
			"--config-path=" +
				(userConfigPath ??
					resolvePackagePath(import.meta.url, "config/biome/core.jsonc")),
		];

		// Run biome lint (diagnostics only - format is handled separately)
		const checkResult = await safeSpawnAsync(
			cmd,
			[
				"lint",
				"--reporter=json",
				"--no-errors-on-unmatched",
				...configArg,
				ctx.filePath,
			],
			{ timeout: 30000, cwd },
		);

		// Handle spawn errors (e.g., binary not found)
		if (checkResult.error) {
			return { status: "skipped", diagnostics: [], semantic: "none" };
		}

		const parsed =
			checkResult.status === 0 || checkResult.status === 1
				? parseBiomeJson(checkResult.stdout || "", ctx.filePath)
				: { diagnostics: [] as Diagnostic[] };

		if (parsed.parseError) {
			const raw = checkResult.stdout || checkResult.stderr || "";
			const preview = raw.replace(/\s+/g, " ").slice(0, 160);
			return {
				status: "failed",
				diagnostics: [
					{
						id: "biome:parse-error:1",
						message: "Biome JSON parse failed: " + parsed.parseError + (preview ? " (output preview: " + preview + ")" : ""),
						filePath: ctx.filePath,
						line: 1,
						column: 1,
						severity: "warning",
						semantic: "warning",
						tool: "biome",
					},
				],
				semantic: "warning",
			};
		}

		const diagnostics = parsed.diagnostics;
		let semantic: RunnerResult["semantic"] = "none";
		if (diagnostics.some((d) => d.semantic === "blocking")) {
			semantic = "blocking";
		} else if (diagnostics.length > 0) {
			semantic = "warning";
		}

		return {
			status: semantic === "blocking" ? "failed" : "succeeded",
			diagnostics,
			semantic,
		};
	},
};

export default biomeCheckJsonRunner;
