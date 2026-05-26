import * as nodeFs from "node:fs";
import { AnchorStateManager } from "../../harness-anchored-edit/anchor-state.js";
import { EditExecutor } from "../../harness-anchored-edit/edit-executor.js";
import { splitAnchor } from "../../harness-anchored-edit/line-protocol.js";
import type { AnchoredEdit } from "../../harness-anchored-edit/types.js";
import { tryCorrectIndentationMismatchFromContent } from "./edit-autopatch.js";
import { retargetReplacementIndentation } from "./indent-retarget.js";

function leadingIndent(line: string): string {
	return line.match(/^[\t ]*/)?.[0] ?? "";
}

function isIndentationOnlyChange(before: string, after: string): boolean {
	const beforeLines = before.replace(/\r\n/g, "\n").split("\n");
	const afterLines = after.replace(/\r\n/g, "\n").split("\n");
	if (beforeLines.length !== afterLines.length) return false;
	return beforeLines.every(
		(line, index) => line.trim() === afterLines[index].trim(),
	);
}

type AnchoredEditInput = {
	edits?: AnchoredEdit[];
};

export function isAnchoredEditToolInput(
	editInput: unknown,
): editInput is AnchoredEditInput {
	if (!editInput || typeof editInput !== "object") return false;
	const edits = (editInput as AnchoredEditInput).edits;
	if (!Array.isArray(edits) || edits.length === 0) return false;
	return typeof edits[0]?.anchor === "string";
}

/**
 * Indentation-only correction for harness anchored edit.text before apply.
 */
export function applyAnchoredEditAutopatch(
	filePath: string,
	editInput: AnchoredEditInput,
	taskId: string,
): { block: true; reason: string } | undefined {
	const edits = editInput.edits;
	if (!edits?.length) return undefined;

	let crlfContent: string;
	try {
		crlfContent = nodeFs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
	} catch {
		return undefined;
	}

	const lines = crlfContent.split("\n");
	const lineAnchors = AnchorStateManager.reconcile(filePath, lines, taskId);
	const executor = new EditExecutor();
	const { resolvedEdits, failedEdits } = executor.resolveEdits(
		edits,
		lines,
		lineAnchors,
	);
	if (failedEdits.length > 0) return undefined;

	const corrected: Array<{
		label: string;
		original: string;
		corrected: string;
		indentationOnly: boolean;
		apply: (value: string) => void;
	}> = [];

	for (const { lineIdx, endIdx, edit } of resolvedEdits) {
		const editType = edit.edit_type ?? "replace";
		const text = edit.text ?? "";
		if (!text.trim()) continue;

		let referenceBlock: string;
		if (editType === "replace") {
			referenceBlock = lines.slice(lineIdx, endIdx + 1).join("\n");
		} else {
			referenceBlock = lines[lineIdx] ?? "";
		}

		const correctedText = tryCorrectIndentationMismatchFromContent(
			text,
			crlfContent,
		);
		if (correctedText === undefined) {
			const refIndent = leadingIndent(referenceBlock.split("\n")[0] ?? "");
			const textIndent = leadingIndent(text.split("\n")[0] ?? "");
			if (
				refIndent !== textIndent &&
				isIndentationOnlyChange(
					textIndent + text.trimStart(),
					refIndent + text.trimStart(),
				)
			) {
				const retargeted = retargetReplacementIndentation(
					text,
					textIndent + text.trimStart(),
					refIndent + text.trimStart(),
				);
				if (retargeted !== undefined) {
					corrected.push({
						label: `edits anchor ${splitAnchor(edit.anchor).anchor}`,
						original: text,
						corrected: retargeted,
						indentationOnly: true,
						apply: (value) => {
							edit.text = value;
						},
					});
				}
			}
			continue;
		}

		if (correctedText !== text) {
			const retargeted = retargetReplacementIndentation(
				text,
				text,
				correctedText,
			);
			corrected.push({
				label: `edits anchor ${splitAnchor(edit.anchor).anchor}`,
				original: text,
				corrected: retargeted ?? correctedText,
				indentationOnly: isIndentationOnlyChange(text, correctedText),
				apply: (value) => {
					edit.text = value;
				},
			});
		}
	}

	if (corrected.length === 0) return undefined;

	const unsafe = corrected.filter((entry) => !entry.indentationOnly);
	if (unsafe.length > 0) {
		const details = unsafe
			.map(({ label, original }) => {
				const preview = original.trimStart().slice(0, 60).replace(/\n/g, "↵");
				return `${label} ("${preview}…") cannot be auto-patched (not indentation-only).`;
			})
			.join("\n");
		return {
			block: true,
			reason:
				`🔄 RETRYABLE — Indentation mismatch on anchored edit text\n\n` +
				`${details}\n\n` +
				`Next action: re-read the relevant section, then retry with text matching file indentation.`,
		};
	}

	for (const entry of corrected) {
		entry.apply(entry.corrected);
	}
	return undefined;
}
