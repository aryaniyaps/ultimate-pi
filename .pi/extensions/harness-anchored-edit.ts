/**
 * Hash-anchored read/edit — first-class harness read and edit tools (always on).
 * @see .pi/harness/docs/adrs/0051-hash-anchored-executor-edits.md
 */
import { resolve } from "node:path";
import type { TextContent } from "@earendil-works/pi-ai";
import {
	createReadTool,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import {
	anchoredEditTaskId,
	applyAnchoredEditsToFile,
	hashLinesStateful,
} from "../lib/harness-anchored-edit/index.js";
import type { AnchoredEdit } from "../lib/harness-anchored-edit/types.js";

const anchoredEditEntrySchema = Type.Object({
	anchor: Type.String({
		description:
			"Start anchor from read output, format Word§exact line text (e.g. Apple§const x = 1).",
	}),
	end_anchor: Type.Optional(
		Type.String({
			description: "End anchor for replace ranges (same format as anchor).",
		}),
	),
	edit_type: Type.Optional(
		Type.Union([
			Type.Literal("replace"),
			Type.Literal("insert_after"),
			Type.Literal("insert_before"),
		]),
	),
	text: Type.String({ description: "New text for insert/replace." }),
});

const anchoredEditSchema = Type.Object({
	path: Type.String({ description: "Path to the file to edit." }),
	edits: Type.Array(anchoredEditEntrySchema, {
		description:
			"Batch all edits for this file in one call. Use anchors from the latest read.",
	}),
});

const readSchema = Type.Object({
	path: Type.String({ description: "Path to the file to read." }),
	offset: Type.Optional(Type.Number({ description: "1-based start line." })),
	limit: Type.Optional(Type.Number({ description: "Max lines to read." })),
});

function stripAnchoredFromReadOutput(text: string): string {
	return text
		.split("\n")
		.map((line) => {
			const idx = line.indexOf("§");
			if (idx === -1) return line;
			const prefix = line.slice(0, idx);
			if (/^[A-Z][a-zA-Z]*$/.test(prefix)) {
				return line.slice(idx + 1);
			}
			return line;
		})
		.join("\n");
}

export default function harnessAnchoredEdit(pi: ExtensionAPI): void {
	const readToolByCwd = new Map<string, ReturnType<typeof createReadTool>>();

	function getReadTool(cwd: string) {
		let tool = readToolByCwd.get(cwd);
		if (!tool) {
			tool = createReadTool(cwd);
			readToolByCwd.set(cwd, tool);
		}
		return tool;
	}

	pi.registerTool({
		name: "read",
		label: "read",
		description:
			"Read a file; each line is prefixed with a stable anchor (Word§line). Use those anchors in edit.",
		parameters: readSchema,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const base = getReadTool(ctx.cwd);
			const result = await base.execute(toolCallId, params, signal, onUpdate);
			const taskId = anchoredEditTaskId({
				sessionId: (ctx as { sessionId?: string }).sessionId,
			});
			const absolutePath = resolve(ctx.cwd, params.path);
			for (const block of result.content) {
				if (block.type !== "text") continue;
				const plain = stripAnchoredFromReadOutput(block.text);
				block.text = hashLinesStateful(absolutePath, plain, taskId);
			}
			return result;
		},
	});

	pi.registerTool({
		name: "edit",
		label: "edit",
		description:
			"Edit using line anchors from read. Batch multiple edits per file. For replace, set end_anchor (defaults to anchor for single-line replace).",
		parameters: anchoredEditSchema,
		promptGuidelines: [
			"Use anchors from the latest read output (Word§line).",
			"Batch all edits for one file in a single edit call.",
			"For renames across files: sg -p to locate, then minimal anchored edits — do not use replace_symbol tools.",
		],
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const absolutePath = resolve(ctx.cwd, params.path);
			const taskId = anchoredEditTaskId({
				sessionId: (ctx as { sessionId?: string }).sessionId,
			});
			const edits = params.edits as AnchoredEdit[];

			const result = await applyAnchoredEditsToFile(
				absolutePath,
				edits,
				taskId,
			);

			if (!result.ok) {
				return {
					content: [{ type: "text", text: result.error }] as TextContent[],
					details: { error: true },
				};
			}

			return {
				content: [{ type: "text", text: result.message }] as TextContent[],
				details: result.details,
			};
		},
	});
}
