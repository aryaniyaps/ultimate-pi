/**
 * TypeScript LSP runner for dispatch system
 *
 * Uses the new LSP client architecture (Phase 3) when --lens-lsp is enabled.
 * Falls back to built-in TypeScriptClient for backward compatibility.
 *
 * @deprecated The built-in TypeScriptClient is deprecated. Use --lens-lsp for full LSP support.
 */

import { getLSPService } from "../../lsp/index.js";
import { PRIORITY } from "../priorities.js";
import { resolveRunnerPath } from "../runner-context.js";
import type {
	Diagnostic,
	DispatchContext,
	RunnerDefinition,
	RunnerResult,
} from "../types.js";
import { readFileContent } from "./utils.js";

type TypeScriptClientModule = typeof import("../../typescript-client.js");
let tsClientModulePromise: Promise<TypeScriptClientModule | null> | undefined;

async function loadTypeScriptClient(): Promise<TypeScriptClientModule | null> {
	if (!tsClientModulePromise) {
		tsClientModulePromise = import("../../typescript-client.js").catch(
			() => null,
		);
	}
	return tsClientModulePromise;
}

const tsLspRunner: RunnerDefinition = {
	id: "ts-lsp",
	appliesTo: ["jsts"],
	priority: PRIORITY.LSP_FALLBACK,
	enabledByDefault: true,

	async run(ctx: DispatchContext): Promise<RunnerResult> {
		// Only check TypeScript files
		if (!ctx.filePath.match(/\.tsx?$/)) {
			return { status: "skipped", diagnostics: [], semantic: "none" };
		}

		// When LSP is enabled (not disabled via --no-lsp), prefer the unified lsp runner.
		// But if LSP service isn't actually available for this file, keep ts fallback.
		if (!ctx.pi.getFlag("no-lsp")) {
			const lspService = getLSPService();
			const spawned = await lspService.getClientForFile(ctx.filePath);
			if (spawned) {
				return { status: "skipped", diagnostics: [], semantic: "none" };
			}
		}

		// DEPRECATED: Fall back to built-in TypeScriptClient
		// This path is deprecated and will be removed in a future release
		return runWithBuiltinClient(ctx);
	},
};

/**
 * Run with deprecated built-in TypeScriptClient
 * @deprecated Use runWithLSPClient instead
 */
async function runWithBuiltinClient(
	ctx: DispatchContext,
): Promise<RunnerResult> {
	const diagnosticPath = resolveRunnerPath(ctx.cwd, ctx.filePath);
	const tsClientMod = await loadTypeScriptClient();
	if (!tsClientMod) {
		return { status: "skipped", diagnostics: [], semantic: "none" };
	}
	const tsClient = new tsClientMod.TypeScriptClient();

	const content = readFileContent(ctx.filePath);
	if (!content) {
		return { status: "skipped", diagnostics: [], semantic: "none" };
	}
	tsClient.updateFile(ctx.filePath, content);

	const diags = tsClient.getDiagnostics(ctx.filePath);

	if (diags.length === 0) {
		return { status: "succeeded", diagnostics: [], semantic: "none" };
	}

	// Get code fixes for all errors
	const allFixes = tsClient.getAllCodeFixes(ctx.filePath);

	// Convert to diagnostics
	const diagnostics: Diagnostic[] = [];

	// The built-in client returns Diagnostic with { range: { start: { line, character } } }
	for (const d of diags) {
		// Safely access nested properties
		if (!d.range?.start) continue;

		const line = d.range.start.line;
		const character = d.range.start.character ?? 0;
		let severity: "error" | "warning" | "info" = "info";
		if (d.severity === 1) severity = "error";
		else if (d.severity === 2) severity = "warning";
		const semantic = d.severity === 1 ? "blocking" : "warning";

		// Find fixes for this line
		const lineFixes = allFixes.get(line);
		const fixDescription = lineFixes?.[0]?.description;
		const hasFixes = !!lineFixes && lineFixes.length > 0;
		const message = fixDescription
			? `${d.message} [💡 ${fixDescription}]`
			: d.message;

		diagnostics.push({
			id: `ts:${d.code}:${line}`,
			message,
			filePath: diagnosticPath,
			line: line + 1,
			column: character + 1,
			severity,
			semantic,
			tool: "ts-lsp",
			fixable: hasFixes,
			autoFixAvailable: false,
			fixKind: hasFixes ? "suggestion" : undefined,
			fixSuggestion: fixDescription,
		});
	}

	return {
		status: "failed",
		diagnostics,
		semantic: "blocking",
	};
}

export default tsLspRunner;
