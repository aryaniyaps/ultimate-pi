import type { FactRule } from "../fact-provider-types.js";
import type { Diagnostic } from "../types.js";
import type { FunctionSummary } from "../facts/function-facts.js";

const FAN_OUT_THRESHOLD = 20;

export const highFanOutRule: FactRule = {
	id: "high-fan-out",
	requires: ["file.functionSummaries"],
	appliesTo(ctx) {
		return /\.tsx?$/.test(ctx.filePath);
	},
	evaluate(ctx, store) {
		const fns =
			store.getFileFact<FunctionSummary[]>(ctx.filePath, "file.functionSummaries") ?? [];

		const diagnostics: Diagnostic[] = [];

		for (const f of fns) {
			// Filter out noise: utility calls, logging, type assertions
			const meaningful = f.outgoingCalls.filter((c) => {
				const lower = c.toLowerCase();
				return (
					!lower.startsWith("console.") &&
					!lower.startsWith("math.") &&
					!lower.startsWith("json.") &&
					!lower.startsWith("object.") &&
					!lower.startsWith("array.") &&
					!lower.startsWith("string(") &&
					!lower.startsWith("number(") &&
					!lower.startsWith("boolean(") &&
					!lower.startsWith("error(") &&
					c !== "resolve" && c !== "reject" &&
					c !== "next" && c !== "done"
				);
			});

			if (meaningful.length < FAN_OUT_THRESHOLD) continue;

			diagnostics.push({
				id: `high-fan-out:${ctx.filePath}:${f.line}`,
				tool: "high-fan-out",
				rule: "high-fan-out",
				filePath: ctx.filePath,
				line: f.line,
				column: f.column,
				severity: "warning",
				semantic: "warning",
				message: `'${f.name}' calls ${meaningful.length} distinct functions — coordination smell, consider splitting responsibilities`,
			});
		}

		return diagnostics;
	},
};
