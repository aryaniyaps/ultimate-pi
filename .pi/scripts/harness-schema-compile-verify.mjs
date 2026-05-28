#!/usr/bin/env node
/**
 * Compile every harness JSON Schema (catches unresolved cross-file $ref).
 * Invoked from harness-verify.mjs via `npx tsx`.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	listHarnessSpecSchemaFiles,
	verifyHarnessSchemaRefIntegrity,
	verifyHarnessSchemasCompile,
} from "../lib/harness-schema-validate.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPECS = join(ROOT, ".pi", "harness", "specs");

const files = await listHarnessSpecSchemaFiles(SPECS);
const integrity = await verifyHarnessSchemaRefIntegrity(SPECS);
if (!integrity.ok) {
	console.error(integrity.errors.join("\n"));
	process.exit(1);
}
const compiled = await verifyHarnessSchemasCompile(SPECS, files);
if (!compiled.ok) {
	console.error(compiled.errors.join("\n"));
	process.exit(1);
}
console.log(`harness-schema-compile-verify: ${files.length} schemas OK`);
