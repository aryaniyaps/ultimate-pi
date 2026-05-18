/**
 * YAML read/write for harness plan artifacts (no JSON plan fallbacks).
 */

import { readFile, rename, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";

const CODE_FENCE_RE = /^```(?:ya?ml|json)?\s*\n?([\s\S]*?)```\s*$/im;

/** @deprecated Use stripCodeFences */
export function stripYamlFences(text: string): string {
	return stripCodeFences(text);
}

export function stripCodeFences(text: string): string {
	const trimmed = text.trim();
	const m = CODE_FENCE_RE.exec(trimmed);
	return m ? m[1].trim() : trimmed;
}

/**
 * Parse agent output or file body: fenced YAML/JSON, raw YAML, or raw JSON object/array.
 */
export function parseStructuredDocument(
	text: string,
	label = "document",
): unknown {
	const body = stripCodeFences(text);
	if (!body.trim()) {
		throw new Error(`${label}: empty document`);
	}

	try {
		const yamlDoc = parse(body, { uniqueKeys: true });
		if (yamlDoc !== null && yamlDoc !== undefined) {
			return yamlDoc;
		}
	} catch {
		/* try JSON below */
	}

	const trimmed = body.trim();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		try {
			return JSON.parse(trimmed) as unknown;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			throw new Error(`${label}: JSON parse failed — ${msg}`);
		}
	}

	throw new Error(
		`${label}: not valid YAML or JSON (use write_harness_yaml with a schema-shaped object)`,
	);
}

export function parseYaml(text: string, label = "yaml"): unknown {
	return parseStructuredDocument(text, label);
}

export async function readYamlFile(
	path: string,
	label?: string,
): Promise<unknown> {
	const raw = await readFile(path, "utf-8");
	return parseStructuredDocument(raw, label ?? path);
}

export async function writeYamlFile(
	path: string,
	data: unknown,
): Promise<void> {
	const tmp = `${path}.tmp`;
	const content = `${stringify(data, { indent: 2 })}\n`;
	await writeFile(tmp, content, "utf-8");
	await rename(tmp, path);
}

export function stringifyYaml(data: unknown): string {
	return `${stringify(data, { indent: 2 })}\n`;
}

/** Normalize arbitrary agent text to canonical YAML file bytes. */
export function normalizeHarnessYamlContent(
	text: string,
	label = "yaml",
): string {
	const doc = parseStructuredDocument(text, label);
	return stringifyYaml(doc);
}
