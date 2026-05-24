import { randomBytes } from "node:crypto";
import * as path from "node:path";
import { normalizeMapKey } from "./path-utils.js";
import { RUNTIME_CONFIG } from "./runtime-config.js";

export interface DeferredFormatRecord {
	filePath: string;
	cwd: string;
	firstTouchedAt: number;
	lastTouchedAt: number;
	toolNames: Set<"write" | "edit">;
}

export class RuntimeCoordinator {
	private _projectRoot = normalizeMapKey(process.cwd());
	private _sessionGeneration = 0;
	private _pipelineCrashCounts = new Map<string, number>();
	private _telemetrySessionId = `harness-lens-${Date.now().toString(36)}`;
	private _telemetryModel = "unknown";
	private _turnIndex = 0;
	private _writeIndex = 0;
	private _gitGuardHasBlockers = false;
	private _gitGuardSummary = "";
	private readonly _pendingDeferredFormatFiles = new Map<
		string,
		DeferredFormatRecord
	>();
	private readonly _lspReadWarmState = new Map<
		string,
		{ status: "warming" | "ready"; ts: number }
	>();

	resetForSession(): void {
		this._sessionGeneration += 1;
		this._pipelineCrashCounts.clear();
		this._telemetrySessionId = `harness-lens-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
		this._telemetryModel = "unknown";
		this._turnIndex = 0;
		this._writeIndex = 0;
		this._gitGuardHasBlockers = false;
		this._gitGuardSummary = "";
		this._pendingDeferredFormatFiles.clear();
		this._lspReadWarmState.clear();
	}

	updateGitGuardStatus(hasBlockers: boolean, output: string): void {
		this._gitGuardHasBlockers = hasBlockers;
		if (!hasBlockers) {
			this._gitGuardSummary = "";
			return;
		}
		const firstLine = output
			.split("\n")
			.map((line) => line.trim())
			.find((line) => line.length > 0);
		this._gitGuardSummary = (firstLine ?? "Unresolved blockers detected").slice(
			0,
			160,
		);
	}

	get gitGuardHasBlockers(): boolean {
		return this._gitGuardHasBlockers;
	}

	get gitGuardSummary(): string {
		return this._gitGuardSummary;
	}

	beginTurn(): void {
		this._turnIndex += 1;
		this._writeIndex = 0;
	}

	nextWriteIndex(): number {
		this._writeIndex += 1;
		return this._writeIndex;
	}

	setTelemetryIdentity(identity: {
		sessionId?: string;
		model?: string;
		provider?: string;
	}): void {
		if (identity.sessionId?.trim()) {
			this._telemetrySessionId = identity.sessionId.trim();
		}
		const model = identity.model?.trim();
		const provider = identity.provider?.trim();
		if (model && provider) this._telemetryModel = `${provider}/${model}`;
		else if (model) this._telemetryModel = model;
		else if (provider) this._telemetryModel = provider;
	}

	get telemetrySessionId(): string {
		return this._telemetrySessionId;
	}

	get telemetryModel(): string {
		return this._telemetryModel;
	}

	get turnIndex(): number {
		return this._turnIndex;
	}

	get sessionGeneration(): number {
		return this._sessionGeneration;
	}

	formatPipelineCrashNotice(filePath: string, err: unknown): string {
		const key = path.resolve(filePath);
		const count = (this._pipelineCrashCounts.get(key) ?? 0) + 1;
		this._pipelineCrashCounts.set(key, count);
		const message = err instanceof Error ? err.message : String(err);
		const shortMessage = message.split("\n")[0].slice(0, 220);
		const shouldSurface =
			count <= RUNTIME_CONFIG.crashNotice.alwaysShowFirstN ||
			count % RUNTIME_CONFIG.crashNotice.showEveryNth === 0;
		if (!shouldSurface) return "";
		return [
			"⚠️ harness-lens pipeline crashed while analyzing this write.",
			`File: ${path.basename(filePath)} | crash count this session: ${count}`,
			`Error: ${shortMessage}`,
			"Recovery: LSP service was reset. If this repeats, rerun with --no-lsp.",
		].join("\n");
	}

	get projectRoot(): string {
		return this._projectRoot;
	}

	set projectRoot(value: string) {
		this._projectRoot = normalizeMapKey(value);
	}

	deferFormat(filePath: string, cwd: string, toolName: "write" | "edit"): void {
		const key = path.resolve(filePath);
		const now = Date.now();
		const existing = this._pendingDeferredFormatFiles.get(key);
		if (existing) {
			existing.lastTouchedAt = now;
			existing.cwd = cwd;
			existing.toolNames.add(toolName);
			return;
		}
		this._pendingDeferredFormatFiles.set(key, {
			filePath: key,
			cwd,
			firstTouchedAt: now,
			lastTouchedAt: now,
			toolNames: new Set([toolName]),
		});
	}

	consumeDeferredFormatFiles(): DeferredFormatRecord[] {
		const records = [...this._pendingDeferredFormatFiles.values()];
		this._pendingDeferredFormatFiles.clear();
		return records;
	}

	shouldWarmLspOnRead(filePath: string, maxAgeMs = 120_000): boolean {
		const state = this._lspReadWarmState.get(path.resolve(filePath));
		if (!state) return true;
		if (state.status === "warming") return false;
		return Date.now() - state.ts > maxAgeMs;
	}

	markLspReadWarmStarted(filePath: string): void {
		this._lspReadWarmState.set(path.resolve(filePath), {
			status: "warming",
			ts: Date.now(),
		});
	}

	markLspReadWarmCompleted(filePath: string): void {
		this._lspReadWarmState.set(path.resolve(filePath), {
			status: "ready",
			ts: Date.now(),
		});
	}

	clearLspReadWarmState(filePath: string): void {
		this._lspReadWarmState.delete(path.resolve(filePath));
	}
}
