/**
 * Tree-sitter Fixer
 *
 * Calculates text replacements for tree-sitter structural matches.
 * Used to implement auto-fixes for tree-sitter rules.
 */

import * as fs from "node:fs";

export interface FixTemplate {
	action: "remove" | "replace" | "wrap";
	template?: string; // For replace/wrap: use {{VAR}} for metavariable interpolation
	replacement?: string; // Simple string replacement
}

export interface FixEdit {
	filePath: string;
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
	oldText: string;
	newText: string;
}

export class TreeSitterFixer {
	/**
	 * Calculate fix for a structural match
	 */
	calculateFix(
		filePath: string,
		nodeRange: {
			startLine: number;
			startColumn: number;
			endLine: number;
			endColumn: number;
		},
		nodeText: string,
		template: FixTemplate,
		captures: Record<string, string>,
	): FixEdit | null {
		switch (template.action) {
			case "remove":
				return this.calculateRemove(filePath, nodeRange, nodeText);
			case "replace":
				return this.calculateReplace(
					filePath,
					nodeRange,
					nodeText,
					template,
					captures,
				);
			case "wrap":
				return this.calculateWrap(
					filePath,
					nodeRange,
					nodeText,
					template,
					captures,
				);
			default:
				return null;
		}
	}

	/**
	 * Calculate removal fix (delete the matched node)
	 */
	private calculateRemove(
		filePath: string,
		nodeRange: {
			startLine: number;
			startColumn: number;
			endLine: number;
			endColumn: number;
		},
		nodeText: string,
	): FixEdit {
		return {
			filePath,
			startLine: nodeRange.startLine,
			startColumn: nodeRange.startColumn,
			endLine: nodeRange.endLine,
			endColumn: nodeRange.endColumn,
			oldText: nodeText,
			newText: "",
		};
	}

	/**
	 * Calculate replacement fix
	 */
	private calculateReplace(
		filePath: string,
		nodeRange: {
			startLine: number;
			startColumn: number;
			endLine: number;
			endColumn: number;
		},
		nodeText: string,
		template: FixTemplate,
		captures: Record<string, string>,
	): FixEdit | null {
		let newText = template.replacement || template.template || "";

		// Interpolate captures: {{VAR}} -> capture value
		for (const [name, value] of Object.entries(captures)) {
			newText = newText.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), value);
		}

		return {
			filePath,
			startLine: nodeRange.startLine,
			startColumn: nodeRange.startColumn,
			endLine: nodeRange.endLine,
			endColumn: nodeRange.endColumn,
			oldText: nodeText,
			newText,
		};
	}

	/**
	 * Calculate wrap fix (wrap matched code in new structure)
	 */
	private calculateWrap(
		filePath: string,
		nodeRange: {
			startLine: number;
			startColumn: number;
			endLine: number;
			endColumn: number;
		},
		nodeText: string,
		template: FixTemplate,
		captures: Record<string, string>,
	): FixEdit | null {
		if (!template.template) return null;

		let wrapped = template.template;

		// Replace {{BODY}} or similar with the actual code
		for (const [name, value] of Object.entries(captures)) {
			wrapped = wrapped.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), value);
		}

		return {
			filePath,
			startLine: nodeRange.startLine,
			startColumn: nodeRange.startColumn,
			endLine: nodeRange.endLine,
			endColumn: nodeRange.endColumn,
			oldText: nodeText,
			newText: wrapped,
		};
	}

	/**
	 * Apply a fix to a file
	 */
	applyFix(edit: FixEdit): void {
		const content = fs.readFileSync(edit.filePath, "utf-8");
		const lines = content.split("\n");

		// Calculate absolute positions
		const startLineIdx = edit.startLine - 1; // 0-indexed
		const endLineIdx = edit.endLine - 1;

		// Build new content
		const before = lines.slice(0, startLineIdx).join("\n");
		const after = lines.slice(endLineIdx + 1).join("\n");

		// Handle same-line case
		if (startLineIdx === endLineIdx) {
			const line = lines[startLineIdx];
			const beforePart = line.slice(0, edit.startColumn);
			const afterPart = line.slice(edit.endColumn);
			const newLine = beforePart + edit.newText + afterPart;
			lines[startLineIdx] = newLine;
			fs.writeFileSync(edit.filePath, lines.join("\n"), "utf-8");
			return;
		}

		// Multi-line replacement
		const newContent =
			(before ? before + "\n" : "") +
			edit.newText +
			(after ? "\n" + after : "");

		fs.writeFileSync(edit.filePath, newContent, "utf-8");
	}

	/**
	 * Check if two edits overlap (can't apply both)
	 */
	editsOverlap(edit1: FixEdit, edit2: FixEdit): boolean {
		if (edit1.filePath !== edit2.filePath) return false;

		// Simple line-based overlap check
		// More sophisticated would check column ranges too
		return !(
			edit1.endLine < edit2.startLine || edit2.endLine < edit1.startLine
		);
	}

	/**
	 * Sort edits by position (top to bottom) for sequential application
	 */
	sortEdits(edits: FixEdit[]): FixEdit[] {
		return [...edits].sort((a, b) => {
			if (a.startLine !== b.startLine) {
				return a.startLine - b.startLine;
			}
			return a.startColumn - b.startColumn;
		});
	}
}
