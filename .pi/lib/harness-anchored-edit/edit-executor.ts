import { getDelimiter, splitAnchor, stripHashes } from "./line-protocol.js";
import type {
	AnchoredEdit,
	FailedAnchoredEdit,
	ResolvedAnchoredEdit,
} from "./types.js";

export class EditExecutor {
	resolveEdits(
		edits: AnchoredEdit[],
		lines: string[],
		lineAnchors: string[],
	): {
		resolvedEdits: ResolvedAnchoredEdit[];
		failedEdits: FailedAnchoredEdit[];
	} {
		const failedEdits: FailedAnchoredEdit[] = [];
		const resolvedEdits: ResolvedAnchoredEdit[] = [];
		const normalized = lineAnchors.map((h) => h.trim());

		for (const edit of edits) {
			const diagnostics: string[] = [];
			const editType = edit.edit_type ?? "replace";

			const { index: lineIdx, error: startError } = this.resolveAnchor(
				"anchor",
				edit.anchor,
				normalized,
				lines,
			);
			if (startError) diagnostics.push(startError);

			let endIdx = lineIdx;
			if (editType === "replace") {
				const endAnchorRaw = edit.end_anchor ?? edit.anchor;
				const { index: resolvedEndIdx, error: endError } = this.resolveAnchor(
					"end_anchor",
					endAnchorRaw,
					normalized,
					lines,
				);
				if (endError) diagnostics.push(endError);
				endIdx = resolvedEndIdx;
			}

			if (lineIdx !== -1 && endIdx !== -1 && endIdx < lineIdx) {
				diagnostics.push(
					"Range error: anchor must refer to a line that precedes or is the same as end_anchor.",
				);
			}

			if (diagnostics.length > 0) {
				failedEdits.push({ edit, error: diagnostics.join(" ") });
			} else {
				resolvedEdits.push({ lineIdx, endIdx, edit });
			}
		}
		return { resolvedEdits, failedEdits };
	}

	resolveAnchor(
		type: "anchor" | "end_anchor",
		rawAnchor: string | undefined,
		normalizedLineHashes: string[],
		lines: string[],
	): { index: number; error?: string } {
		const anchorRaw = rawAnchor || "";
		if (!anchorRaw.trim()) return { index: -1, error: `${type} is missing.` };

		const { anchor: anchorName, content: providedContent } =
			splitAnchor(anchorRaw);
		const anchorExtractRegex = /^[A-Z][a-zA-Z]*$/;
		if (!anchorExtractRegex.test(anchorName)) {
			return {
				index: -1,
				error: `${type} is missing or incorrectly formatted. It must start with a single word followed by the delimiter (e.g., "Apple${getDelimiter()}").`,
			};
		}

		const index = normalizedLineHashes.indexOf(anchorName);
		if (index === -1) {
			return {
				index: -1,
				error: `${type} "${anchorName}" not found in the file. Re-read the file for current anchors.`,
			};
		}

		if (providedContent.includes("\n") || providedContent.includes("\r")) {
			return {
				index: -1,
				error: `${type} "${anchorName}" must refer to a single line (Anchor${getDelimiter()}{line_text}).`,
			};
		}

		const actualContent = lines[index];
		if (providedContent !== actualContent) {
			return {
				index: -1,
				error: `${type} "${anchorName}" line mismatch. Expected: "${actualContent}", Provided: "${providedContent}".`,
			};
		}

		return { index };
	}

	applyEdits(
		lines: string[],
		resolvedEdits: ResolvedAnchoredEdit[],
	): { finalLines: string[] } {
		const sortedEdits = [...resolvedEdits].sort(
			(a, b) => b.lineIdx - a.lineIdx,
		);
		const newLines = [...lines];

		for (const { lineIdx, endIdx, edit } of sortedEdits) {
			const editType = edit.edit_type ?? "replace";
			const cleanText = stripHashes(edit.text || "");
			const replacementLines = cleanText === "" ? [] : cleanText.split(/\r?\n/);

			let removedInThisEdit: number;
			let spliceIndex: number;

			if (editType === "insert_after") {
				spliceIndex = lineIdx + 1;
				removedInThisEdit = 0;
			} else if (editType === "insert_before") {
				spliceIndex = lineIdx;
				removedInThisEdit = 0;
			} else {
				spliceIndex = lineIdx;
				removedInThisEdit = endIdx - lineIdx + 1;
			}

			newLines.splice(spliceIndex, removedInThisEdit, ...replacementLines);
		}

		return { finalLines: newLines };
	}

	formatFailureMessage(edit: AnchoredEdit, error?: string): string {
		const diagnostic = error
			? ` ${error}`
			: " Check anchors and line content from the latest read.";
		return `Anchored edit failed (anchor: "${edit.anchor}", end_anchor: "${edit.end_anchor ?? ""}").${diagnostic}`;
	}
}
