/**
 * Parse sentrux check / gate CLI stdout (and optional upstream JSON).
 */

import { createHash } from "node:crypto";

export const PARSER_VERSION = "1.0.0";

const PROGRESS_LINE =
	/^\[(?:scan|build_project_map|resolve|resolve_imports|build_graphs)\]/;

const VIOLATION_HEAD =
	/^([✗⚠])\s+\[(\w+)\]\s+([\w_]+):\s+(.+)$/;
const QUALITY_LINE = /^Quality:\s*(\d+)\s*$/;
const RULES_CHECKED = /^sentrux check —\s*(\d+)\s+rules checked/;
const GATE_QUALITY =
	/^Quality:\s*(\d+)\s*->\s*(\d+)\s*$/;
const GATE_METRIC = /^(\w[\w\s]*?):\s*(.+?)\s*→\s*(.+?)\s*$/;
const GATE_DEGRADED_LINE = /^✗\s+DEGRADED\s*$/i;
const GATE_PASS_LINE = /^✓\s+No degradation detected/i;
const GATE_VIOLATION = /^\s+✗\s+(.+)$/;

/** Strip scan progress noise; keep user-facing lines. */
export function filterSentruxOutputLines(text) {
	return text
		.split(/\r?\n/)
		.filter((line) => line.trim() && !PROGRESS_LINE.test(line.trim()))
		.filter((line) => !line.startsWith("Scanning "));
}

export function sha256(text) {
	return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * @param {string} text — filtered check stdout
 */
export function parseCheckOutput(text) {
	const lines = filterSentruxOutputLines(text);
	const result = {
		parse_ok: true,
		parse_errors: [],
		rules_checked: null,
		quality_signal: null,
		check_pass: true,
		violations: [],
	};

	for (const line of lines) {
		const rulesM = line.match(RULES_CHECKED);
		if (rulesM) {
			result.rules_checked = Number.parseInt(rulesM[1], 10);
			continue;
		}
		const qM = line.match(QUALITY_LINE);
		if (qM) {
			result.quality_signal = Number.parseInt(qM[1], 10);
			continue;
		}
		if (line.includes("violation(s) found")) {
			result.check_pass = false;
		}
		if (line.includes("All rules pass")) {
			result.check_pass = true;
		}
	}

	const rawViolations = [];
	let current = null;
	for (const line of lines) {
		const head = line.match(VIOLATION_HEAD);
		if (head) {
			if (current) rawViolations.push(current);
			current = {
				severity: head[2].toLowerCase(),
				rule: head[3],
				message: head[4].trim(),
				files: [],
			};
			if (head[1] === "✗") result.check_pass = false;
			continue;
		}
		if (current && /^\s{4}\S/.test(line)) {
			current.files.push(line.trim());
		}
	}
	if (current) rawViolations.push(current);

	result.violations = dedupeViolations(rawViolations);
	return result;
}

const BOUNDARY_PAIR = new Set(["layer_direction", "boundary"]);

function filesKey(v) {
	return [...v.files].sort().join("|");
}

function violationKey(v) {
	return `${v.rule}::${filesKey(v)}`;
}

function dedupeViolations(raw) {
	const byKey = new Map();
	for (const v of raw) {
		let key = violationKey(v);
		if (BOUNDARY_PAIR.has(v.rule)) {
			const fk = filesKey(v);
			for (const [k, existing] of byKey) {
				if (
					BOUNDARY_PAIR.has(existing.rule) &&
					filesKey(existing) === fk
				) {
					key = k;
					break;
				}
			}
		}
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, { ...v, related_rules: [] });
			continue;
		}
		if (existing.rule !== v.rule && !existing.related_rules.includes(v.rule)) {
			existing.related_rules.push(v.rule);
		}
		if (v.severity === "error") existing.severity = "error";
	}
	return [...byKey.values()];
}

/**
 * @param {string} text — filtered gate stdout
 */
export function parseGateOutput(text) {
	const lines = filterSentruxOutputLines(text);
	const result = {
		parse_ok: true,
		parse_errors: [],
		status: "pass",
		quality_before: null,
		quality_after: null,
		metrics: [],
		degraded_reasons: [],
	};

	for (const line of lines) {
		const qM = line.match(GATE_QUALITY);
		if (qM) {
			result.quality_before = Number.parseInt(qM[1], 10);
			result.quality_after = Number.parseInt(qM[2], 10);
			continue;
		}
		const mM = line.match(GATE_METRIC);
		if (mM) {
			result.metrics.push({
				name: mM[1].trim().toLowerCase().replace(/\s+/g, "_"),
				before: mM[2].trim(),
				after: mM[3].trim(),
			});
			continue;
		}
		if (GATE_DEGRADED_LINE.test(line)) {
			result.status = "degraded";
			continue;
		}
		if (GATE_PASS_LINE.test(line)) {
			result.status = "pass";
			continue;
		}
		const vM = line.match(GATE_VIOLATION);
		if (vM) {
			result.degraded_reasons.push(vM[1].trim());
		}
	}

	if (
		result.quality_before != null &&
		result.quality_after != null &&
		result.quality_after < result.quality_before - 200
	) {
		if (!result.degraded_reasons.some((r) => /quality/i.test(r))) {
			result.degraded_reasons.push(
				`Quality signal dropped: ${result.quality_before} -> ${result.quality_after}`,
			);
		}
	}

	return result;
}

/** Map violation rules → inferred bottleneck root-cause bucket. */
export function inferBottleneck(violations, gate) {
	const rules = new Set(violations.map((v) => v.rule));
	if (rules.has("boundary") || rules.has("layer_direction")) {
		return { bottleneck: "modularity", bottleneck_inferred: true };
	}
	if (rules.has("max_cc") || rules.has("max_fn_lines")) {
		return { bottleneck: "equality", bottleneck_inferred: true };
	}
	if (rules.has("max_cycles")) {
		return { bottleneck: "acyclicity", bottleneck_inferred: true };
	}
	if (gate?.degraded_reasons?.some((r) => /coupling/i.test(r))) {
		return { bottleneck: "modularity", bottleneck_inferred: true };
	}
	if (gate?.degraded_reasons?.some((r) => /complex function/i.test(r))) {
		return { bottleneck: "equality", bottleneck_inferred: true };
	}
	return { bottleneck: "modularity", bottleneck_inferred: true };
}

/** Parse `path:func (cc=N)` from max_cc violation file lines. */
export function parseComplexFunctionEntries(violations) {
	const out = [];
	for (const v of violations) {
		if (v.rule !== "max_cc") continue;
		for (const f of v.files) {
			const m = f.match(/^(.+?):([^(\s]+)\s*\(cc=(\d+)\)\s*$/);
			if (m) {
				out.push({
					file: m[1],
					func: m[2],
					cc: Number.parseInt(m[3], 10),
				});
			}
		}
	}
	return out;
}

/** Parse god file lines from no_god_files violations. */
export function parseGodFileEntries(violations) {
	const out = [];
	for (const v of violations) {
		if (v.rule !== "no_god_files") continue;
		for (const f of v.files) {
			const m = f.match(/^(.+?)\s*\(fan-out=(\d+)\)/);
			if (m) {
				out.push({ path: m[1], fan_out: Number.parseInt(m[2], 10) });
			} else {
				out.push({ path: f, fan_out: null });
			}
		}
	}
	return out;
}

/**
 * Try upstream `sentrux check --format json` payload (future / optional).
 * @param {unknown} json
 */
export function normalizeUpstreamCheckJson(json) {
	if (!json || typeof json !== "object") return null;
	const doc = /** @type {Record<string, unknown>} */ (json);
	if (doc.format !== "json" && !doc.violations && !doc.diagnostics) {
		return null;
	}
	return {
		source: "upstream",
		check_pass: doc.check_pass !== false && !(doc.violation_count > 0),
		quality_signal:
			typeof doc.quality_signal === "number" ? doc.quality_signal : null,
		rules_checked:
			typeof doc.rules_checked === "number" ? doc.rules_checked : null,
		violations: Array.isArray(doc.violations) ? doc.violations : [],
		bottleneck: typeof doc.bottleneck === "string" ? doc.bottleneck : null,
		root_causes: doc.root_causes ?? null,
		diagnostics: doc.diagnostics ?? null,
		bottleneck_inferred: false,
	};
}
