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

export function loadSettings(): PiVccSettings {
	return {
		overrideDefaultCompaction: resolveOverrideDefaultCompaction(),
		debug: resolveVccDebug(),
	};
}

/** No-op — harness VCC does not scaffold or read JSON config files. */
export function scaffoldSettings(): void {}
