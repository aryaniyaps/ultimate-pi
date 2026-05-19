/**
 * JSON Schema validation for harness submit tools (Ajv draft 2020-12, offline).
 */

import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

type ValidateFn = (data: unknown) => boolean;

const compileCache = new Map<string, ValidateFn>();
const DEBUG_LOG_PATH =
	"/home/aryaniyaps/ai-projects/ultimate-pi/.cursor/debug-2ca12b.log";

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

async function debugLog(
	hypothesisId: string,
	message: string,
	data: Record<string, unknown>,
): Promise<void> {
	// #region agent log
	try {
		await appendFile(
			DEBUG_LOG_PATH,
			`${JSON.stringify({
				sessionId: "2ca12b",
				hypothesisId,
				location: "harness-schema-validate.ts",
				message,
				data,
				timestamp: Date.now(),
			})}\n`,
		);
	} catch {
		/* ignore */
	}
	// #endregion
}

export async function validateAgainstHarnessSchema(
	specsDir: string,
	schemaFile: string,
	document: unknown,
): Promise<{ ok: true } | { ok: false; errors: string[] }> {
	const cacheKey = `${specsDir}:${schemaFile}`;
	let validate = compileCache.get(cacheKey);
	if (!validate) {
		const schemaPath = join(specsDir, schemaFile);
		const raw = await readFile(schemaPath, "utf-8");
		const schema = JSON.parse(raw) as Record<string, unknown>;
		try {
			const ajv = getAjv();
			const compiled = ajv.compile(schema);
			validate = compiled;
			compileCache.set(cacheKey, compiled);
			await debugLog("H3", "schema compile ok", { schemaFile });
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			await debugLog("H3", "schema compile failed", { schemaFile, error: msg });
			return { ok: false, errors: [`schema compile failed: ${msg}`] };
		}
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
