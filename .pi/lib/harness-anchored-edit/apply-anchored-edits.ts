import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnchorStateManager } from "./anchor-state.js";
import { EditExecutor } from "./edit-executor.js";
import type { AnchoredEdit } from "./types.js";

type EditDiffHelpers = {
	detectLineEnding: (content: string) => "\r\n" | "\n";
	generateDiffString: (
		oldContent: string,
		newContent: string,
	) => { diff: string; firstChangedLine?: number };
	normalizeToLF: (text: string) => string;
	restoreLineEndings: (text: string, ending: "\r\n" | "\n") => string;
	stripBom: (content: string) => { bom: string; text: string };
};

type FileMutationQueue = <T>(path: string, fn: () => Promise<T>) => Promise<T>;

let editDiffHelpers: EditDiffHelpers | undefined;
let fileMutationQueue: FileMutationQueue | undefined;

function resolvePiDistEntry(): string {
	const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
	return join(
		repoRoot,
		"node_modules/@earendil-works/pi-coding-agent/dist/index.js",
	);
}

async function loadPiEditRuntime(): Promise<{
	editDiff: EditDiffHelpers;
	withFileMutationQueue: FileMutationQueue;
}> {
	if (editDiffHelpers && fileMutationQueue) {
		return {
			editDiff: editDiffHelpers,
			withFileMutationQueue: fileMutationQueue,
		};
	}
	const piEntry = resolvePiDistEntry();
	const pi = await import("@earendil-works/pi-coding-agent");
	const require = createRequire(piEntry);
	editDiffHelpers = require(
		join(dirname(piEntry), "core/tools/edit-diff.js"),
	) as EditDiffHelpers;
	fileMutationQueue = pi.withFileMutationQueue as FileMutationQueue;
	return {
		editDiff: editDiffHelpers,
		withFileMutationQueue: fileMutationQueue,
	};
}

export type ApplyAnchoredEditsResult =
	| {
			ok: true;
			details: { diff: string; firstChangedLine?: number };
			message: string;
	  }
	| { ok: false; error: string };

export async function applyAnchoredEditsToFile(
	absolutePath: string,
	edits: AnchoredEdit[],
	taskId: string,
): Promise<ApplyAnchoredEditsResult> {
	if (!edits.length) {
		return {
			ok: false,
			error: "edit: edits must contain at least one anchored edit.",
		};
	}

	const { editDiff, withFileMutationQueue } = await loadPiEditRuntime();
	const {
		detectLineEnding,
		generateDiffString,
		normalizeToLF,
		restoreLineEndings,
		stripBom,
	} = editDiff;

	return withFileMutationQueue(absolutePath, async () => {
		try {
			await access(absolutePath, constants.R_OK | constants.W_OK);
		} catch (error) {
			const code =
				error instanceof Error && "code" in error
					? String(error.code)
					: String(error);
			return {
				ok: false,
				error: `Could not edit file: ${absolutePath}. Error code: ${code}.`,
			};
		}

		const buffer = await readFile(absolutePath);
		const rawContent = buffer.toString("utf-8");
		const { bom, text: content } = stripBom(rawContent);
		const originalEnding = detectLineEnding(content);
		const normalizedContent = normalizeToLF(content);
		const lines = normalizedContent.split("\n");

		const lineAnchors = AnchorStateManager.reconcile(
			absolutePath,
			lines,
			taskId,
		);
		const executor = new EditExecutor();
		const { resolvedEdits, failedEdits } = executor.resolveEdits(
			edits,
			lines,
			lineAnchors,
		);

		if (failedEdits.length > 0) {
			return {
				ok: false,
				error: failedEdits
					.map((f) => executor.formatFailureMessage(f.edit, f.error))
					.join("\n"),
			};
		}

		const { finalLines } = executor.applyEdits(lines, resolvedEdits);
		const newContent = finalLines.join("\n");

		if (newContent === normalizedContent) {
			return {
				ok: false,
				error:
					"Anchored edit made no changes. Re-read the file and verify anchors and text.",
			};
		}

		const finalContent = bom + restoreLineEndings(newContent, originalEnding);
		await writeFile(absolutePath, finalContent, "utf-8");

		const diffResult = generateDiffString(normalizedContent, newContent);
		return {
			ok: true,
			details: {
				diff: diffResult.diff,
				firstChangedLine: diffResult.firstChangedLine,
			},
			message: `Successfully applied ${edits.length} anchored edit(s).`,
		};
	});
}

export function isAnchoredEditInput(input: unknown): boolean {
	if (!input || typeof input !== "object") return false;
	const edits = (input as { edits?: unknown }).edits;
	if (!Array.isArray(edits) || edits.length === 0) return false;
	const first = edits[0];
	if (!first || typeof first !== "object") return false;
	return typeof (first as { anchor?: unknown }).anchor === "string";
}
