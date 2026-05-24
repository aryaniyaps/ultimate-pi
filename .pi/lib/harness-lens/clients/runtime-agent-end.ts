import * as nodeFs from "node:fs";
import { runFormatPhase, resyncLspFile } from "./pipeline.js";
import type { FormatService } from "./format-service.js";
import { logLatency } from "./latency-logger.js";
import type { RuntimeCoordinator } from "./runtime-coordinator.js";

interface AgentEndDeps {
	ctxCwd?: string;
	getFlag: (name: string) => boolean | string | undefined;
	notify: (msg: string, level: "info" | "warning" | "error") => void;
	dbg: (msg: string) => void;
	runtime: RuntimeCoordinator;
	getFormatService: () => FormatService;
}

export interface AgentEndFormatSummary {
	queued: number;
	formatted: number;
	changed: string[];
	failed: Array<{ filePath: string; errors: string[] }>;
	skipped: Array<{ filePath: string; reason: string }>;
}

export async function handleAgentEnd({
	ctxCwd,
	getFlag,
	notify,
	dbg,
	runtime,
	getFormatService,
}: AgentEndDeps): Promise<AgentEndFormatSummary | undefined> {
	const records = runtime.consumeDeferredFormatFiles();
	if (records.length === 0) return undefined;

	const startedAt = Date.now();
	const summary: AgentEndFormatSummary = {
		queued: records.length,
		formatted: 0,
		changed: [],
		failed: [],
		skipped: [],
	};

	if (getFlag("no-autoformat")) {
		for (const record of records) {
			summary.skipped.push({
				filePath: record.filePath,
				reason: "no-autoformat",
			});
		}
		return summary;
	}

	for (const record of records) {
		const filePath = record.filePath;
		if (!nodeFs.existsSync(filePath)) {
			summary.skipped.push({ filePath, reason: "missing" });
			continue;
		}
		try {
			const result = await runFormatPhase(filePath, getFormatService, dbg);
			summary.formatted++;
			if (result.formatFailures.length > 0) {
				summary.failed.push({ filePath, errors: result.formatFailures });
			}
			if (result.formatChanged) summary.changed.push(filePath);
			if (result.fileContent) {
				await resyncLspFile(
					filePath,
					result.fileContent,
					true,
					false,
					getFlag,
					dbg,
					result.formatChanged,
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			summary.failed.push({ filePath, errors: [message] });
			dbg(`agent_end deferred_format failed for ${filePath}: ${message}`);
		}
	}

	logLatency({
		type: "tool_result",
		toolName: "agent_end",
		filePath: ctxCwd ?? runtime.projectRoot,
		durationMs: Date.now() - startedAt,
		result: "deferred_format_complete",
		metadata: {
			queued: summary.queued,
			formatted: summary.formatted,
			changed: summary.changed.length,
			failed: summary.failed.length,
		},
	});

	if (summary.failed.length > 0) {
		notify(
			`harness-lens deferred format: ${summary.changed.length} changed, ${summary.failed.length} failed`,
			"warning",
		);
	} else if (summary.changed.length > 0) {
		notify(
			`harness-lens deferred format applied to ${summary.changed.length} file(s)`,
			"info",
		);
	}

	return summary;
}
