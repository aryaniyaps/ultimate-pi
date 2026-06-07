/**
 * ultimate-pi VCC configuration — env only (no config files).
 *
 * @see https://github.com/sting8k/pi-vcc (vendored algorithm)
 * @see https://github.com/lllyasviel/VCC
 */

export interface PiVccSettings {
	/** When true, VCC handles /compact, auto-threshold, and overflow compaction. */
	overrideDefaultCompaction: boolean;
	/** Write debug snapshot to /tmp/pi-vcc-debug.json on each compaction. */
	debug: boolean;
	/** Compact when context usage ≥ this percent (harness auto-compact extension). */
	compactThresholdPercent: number;
	/** Hysteresis: re-arm after usage falls below this percent. */
	compactRearmPercent: number;
	/** Enable harness 50% auto-compact gate. */
	compactAuto: boolean;
	/** Allow auto-compact in subagent subprocesses (default false). */
	compactSubagents: boolean;
}

const FALSE_VALUES = new Set(["false", "0", "off", "no"]);
const TRUE_VALUES = new Set(["true", "1", "on", "yes"]);

function parseHarnessBool(envName: string, defaultValue: boolean): boolean {
	const raw = process.env[envName]?.trim().toLowerCase();
	if (!raw) {
		return defaultValue;
	}
	if (FALSE_VALUES.has(raw)) {
		return false;
	}
	if (TRUE_VALUES.has(raw)) {
		return true;
	}
	return defaultValue;
}

/** Whether VCC overrides Pi built-in LLM compaction (default: true). */
export function resolveOverrideDefaultCompaction(): boolean {
	return parseHarnessBool("HARNESS_VCC_COMPACTION", true);
}

/** Compaction debug snapshots (default: false). */
export function resolveVccDebug(): boolean {
	return parseHarnessBool("HARNESS_VCC_DEBUG", false);
}

function parseHarnessPercent(envName: string, defaultValue: number): number {
	const raw = process.env[envName]?.trim();
	if (!raw) return defaultValue;
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 1 || n > 99) return defaultValue;
	return n;
}

export function resolveCompactThresholdPercent(): number {
	return parseHarnessPercent("HARNESS_COMPACT_THRESHOLD_PERCENT", 50);
}

export function resolveCompactRearmPercent(): number {
	return parseHarnessPercent("HARNESS_COMPACT_REARM_PERCENT", 40);
}

export function resolveCompactAuto(): boolean {
	return parseHarnessBool("HARNESS_COMPACT_AUTO", true);
}

export function resolveCompactSubagents(): boolean {
	return parseHarnessBool("HARNESS_COMPACT_SUBAGENTS", false);
}

export function loadSettings(): PiVccSettings {
	return {
		overrideDefaultCompaction: resolveOverrideDefaultCompaction(),
		debug: resolveVccDebug(),
		compactThresholdPercent: resolveCompactThresholdPercent(),
		compactRearmPercent: resolveCompactRearmPercent(),
		compactAuto: resolveCompactAuto(),
		compactSubagents: resolveCompactSubagents(),
	};
}

/** No-op — harness VCC does not scaffold or read JSON config files. */
export function scaffoldSettings(): void {}
