/**
 * JSON Schema validation for harness submit tools (Ajv draft 2020-12, offline).
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

type ValidateFn = (data: unknown) => boolean;

const compileCache = new Map<string, ValidateFn>();
const registeredSchemaIds = new Set<string>();

export const EXTERNAL_SCHEMA_REF = /^[a-z0-9._-]+\.schema\.json$/i;

let ajvSingleton: InstanceType<typeof Ajv2020> | null = null;

function getAjv(): InstanceType<typeof Ajv2020> {
	if (!ajvSingleton) {
		ajvSingleton = new Ajv2020({
			allErrors: true,
			strict: false,
			validateSchema: false,
		});
		addFormats(ajvSingleton);
	}
	return ajvSingleton;
}

/** Collect sibling `*.schema.json` $ref targets (not `#/$defs/...`). */
export function collectExternalSchemaRefs(
	node: unknown,
	out: Set<string>,
): void {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const item of node) collectExternalSchemaRefs(item, out);
		return;
	}
	const obj = node as Record<string, unknown>;
	const ref = obj.$ref;
	if (typeof ref === "string" && EXTERNAL_SCHEMA_REF.test(ref)) {
		out.add(ref);
	}
	for (const value of Object.values(obj)) {
		collectExternalSchemaRefs(value, out);
	}
}

async function loadHarnessSchema(
	specsDir: string,
	schemaFile: string,
): Promise<Record<string, unknown>> {
	const schemaPath = join(specsDir, schemaFile);
	const raw = await readFile(schemaPath, "utf-8");
	return JSON.parse(raw) as Record<string, unknown>;
}

/** Register cross-file $ref targets only; root is registered by `compile()`. */
async function ensureHarnessSchemaDependencies(
	ajv: InstanceType<typeof Ajv2020>,
	specsDir: string,
	schemaFile: string,
	loading: Set<string>,
): Promise<void> {
	if (loading.has(schemaFile)) return;
	loading.add(schemaFile);

	const schema = await loadHarnessSchema(specsDir, schemaFile);
	const schemaId = String(schema.$id ?? schemaFile);

	const externalRefs = new Set<string>();
	collectExternalSchemaRefs(schema, externalRefs);
	for (const refFile of externalRefs) {
		await ensureHarnessSchemaDependencies(ajv, specsDir, refFile, loading);
	}

	if (!registeredSchemaIds.has(schemaId)) {
		ajv.addSchema(schema, schemaId);
		registeredSchemaIds.add(schemaId);
	}

	loading.delete(schemaFile);
}

/** Compile a harness schema (registers cross-file $ref targets first). */
export async function compileHarnessSchema(
	specsDir: string,
	schemaFile: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
	const cacheKey = `${specsDir}:${schemaFile}`;
	if (compileCache.has(cacheKey)) {
		return { ok: true };
	}
	try {
		const schema = await loadHarnessSchema(specsDir, schemaFile);
		const ajv = getAjv();
		const externalRefs = new Set<string>();
		collectExternalSchemaRefs(schema, externalRefs);
		for (const refFile of externalRefs) {
			await ensureHarnessSchemaDependencies(ajv, specsDir, refFile, new Set());
		}
		const schemaId = String(schema.$id ?? schemaFile);
		let compiled: ValidateFn;
		if (registeredSchemaIds.has(schemaId)) {
			const existing = ajv.getSchema(schemaId);
			if (!existing) {
				return {
					ok: false,
					error: `schema ${schemaId} registered but not retrievable from Ajv`,
				};
			}
			compiled = existing;
		} else {
			compiled = ajv.compile(schema);
			registeredSchemaIds.add(schemaId);
		}
		compileCache.set(cacheKey, compiled);
		return { ok: true };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, error: msg };
	}
}

export async function listHarnessSpecSchemaFiles(
	specsDir: string,
): Promise<string[]> {
	const names = await readdir(specsDir);
	return names.filter((n) => n.endsWith(".schema.json")).sort();
}

/** Ensure every listed schema compiles; fails on missing cross-file $ref targets. */
export async function verifyHarnessSchemasCompile(
	specsDir: string,
	schemaFiles: string[],
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
	const errors: string[] = [];
	for (const schemaFile of schemaFiles) {
		const compiled = await compileHarnessSchema(specsDir, schemaFile);
		if (!compiled.ok) {
			errors.push(`${schemaFile}: schema compile failed: ${compiled.error}`);
		}
	}
	return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

/** Every `*.schema.json` $ref in specs must point at a file on disk. */
export async function verifyHarnessSchemaRefIntegrity(
	specsDir: string,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
	const errors: string[] = [];
	const files = await listHarnessSpecSchemaFiles(specsDir);
	for (const schemaFile of files) {
		const schema = await loadHarnessSchema(specsDir, schemaFile);
		const externalRefs = new Set<string>();
		collectExternalSchemaRefs(schema, externalRefs);
		for (const ref of externalRefs) {
			try {
				await loadHarnessSchema(specsDir, ref);
			} catch {
				errors.push(`${schemaFile}: missing $ref target ${ref}`);
			}
		}
	}
	return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export async function validateAgainstHarnessSchema(
	specsDir: string,
	schemaFile: string,
	document: unknown,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
	const compiled = await compileHarnessSchema(specsDir, schemaFile);
	if (!compiled.ok) {
		return { ok: false, errors: [`schema compile failed: ${compiled.error}`] };
	}
	const validate = compileCache.get(`${specsDir}:${schemaFile}`);
	if (!validate) {
		return {
			ok: false,
			errors: [`schema compile failed: ${schemaFile} not in compile cache`],
		};
	}
	const ok = validate(document);
	if (ok) return { ok: true };
	const errors = (
		(
			validate as {
				errors?: Array<{ instancePath?: string; message?: string }>;
			}
		).errors ?? []
	).map((e: { instancePath?: string; message?: string }) =>
		`${e.instancePath || "/"} ${e.message ?? "invalid"}`.trim(),
	);
	return { ok: false, errors };
}
