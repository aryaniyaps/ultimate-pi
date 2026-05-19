/**
 * Parse HarnessSpawnContext embedded in subagent task strings.
 */

const SPAWN_CTX_EQ_RE = /HarnessSpawnContext\s*=\s*(\{[\s\S]*?\})(?:\s|$|\.)/;

export interface ParsedSpawnContext {
	run_id?: string;
	run_dir?: string;
	agent?: string;
	plan_packet_path?: string;
}

function extractBalancedJsonObject(s: string, start: number): string | null {
	if (s[start] !== "{") return null;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < s.length; i++) {
		const ch = s[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') {
			inString = true;
			continue;
		}
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return s.slice(start, i + 1);
		}
	}
	return null;
}

function normalizeSpawnContext(parsed: unknown): ParsedSpawnContext | null {
	if (!parsed || typeof parsed !== "object") return null;
	const o = parsed as Record<string, unknown>;
	const run_id = typeof o.run_id === "string" ? o.run_id : undefined;
	const run_dir = typeof o.run_dir === "string" ? o.run_dir : undefined;
	const agent = typeof o.agent === "string" ? o.agent : undefined;
	const plan_packet_path =
		typeof o.plan_packet_path === "string" ? o.plan_packet_path : undefined;
	if (!run_id && !run_dir) return null;
	return { run_id, run_dir, agent, plan_packet_path };
}

export function parseSpawnContextFromTask(
	task: string,
): ParsedSpawnContext | null {
	const eqMatch = SPAWN_CTX_EQ_RE.exec(task);
	if (eqMatch?.[1]) {
		try {
			return normalizeSpawnContext(JSON.parse(eqMatch[1]));
		} catch {
			// fall through to JSON-object forms
		}
	}

	const firstBrace = task.indexOf("{");
	if (firstBrace >= 0) {
		const blob = extractBalancedJsonObject(task, firstBrace);
		if (blob) {
			try {
				const outer = JSON.parse(blob) as Record<string, unknown>;
				if (
					outer.HarnessSpawnContext &&
					typeof outer.HarnessSpawnContext === "object"
				) {
					return normalizeSpawnContext(outer.HarnessSpawnContext);
				}
				if (typeof outer.run_id === "string") {
					return normalizeSpawnContext(outer);
				}
			} catch {
				// ignore
			}
		}
	}

	return null;
}
