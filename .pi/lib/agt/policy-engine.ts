import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	ConflictResolutionStrategy,
	PolicyEngine,
} from "@microsoft/agent-governance-sdk";
import { resolveHarnessPoliciesDir } from "./config.js";

const POLICY_FILES = [
	"defaults.yaml",
	"phases.yaml",
	"roles.yaml",
	"orchestrator.yaml",
	"bash-denylists.yaml",
	"web-guard.yaml",
	"workflow-sequences.yaml",
] as const;

let cachedEngine: PolicyEngine | null = null;
let cachedRoot: string | null = null;

export class HarnessPolicyLoadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "HarnessPolicyLoadError";
	}
}

export function createHarnessPolicyEngine(packageRoot: string): PolicyEngine {
	const dir = resolveHarnessPoliciesDir(packageRoot);
	const engine = new PolicyEngine([], ConflictResolutionStrategy.DenyOverrides);
	for (const file of POLICY_FILES) {
		const path = join(dir, file);
		let raw: string;
		try {
			raw = readFileSync(path, "utf-8");
		} catch (err) {
			throw new HarnessPolicyLoadError(
				`Missing or unreadable policy file: ${path} (${String(err)})`,
			);
		}
		engine.loadYaml(raw);
	}
	return engine;
}

export function getHarnessPolicyEngine(packageRoot: string): PolicyEngine {
	if (cachedEngine && cachedRoot === packageRoot) return cachedEngine;
	cachedEngine = createHarnessPolicyEngine(packageRoot);
	cachedRoot = packageRoot;
	return cachedEngine;
}

export function resetHarnessPolicyEngineCache(): void {
	cachedEngine = null;
	cachedRoot = null;
}

/** Doctor: policies dir exists and all expected YAML files present. */
export function doctorHarnessPolicies(packageRoot: string): {
	ok: boolean;
	errors: string[];
	policyDir: string;
	loaded: string[];
} {
	const errors: string[] = [];
	const policyDir = resolveHarnessPoliciesDir(packageRoot);
	if (!existsSync(policyDir)) {
		errors.push(`policy directory missing: ${policyDir}`);
	}
	const loaded: string[] = [];
	for (const file of POLICY_FILES) {
		const path = join(policyDir, file);
		if (!existsSync(path)) {
			errors.push(`missing policy file: ${path}`);
			continue;
		}
		loaded.push(file);
	}
	try {
		const names = readdirSync(policyDir).filter((f) => f.endsWith(".yaml"));
		if (names.length === 0) {
			errors.push(`no YAML policies in ${policyDir}`);
		}
	} catch (err) {
		errors.push(`cannot read policy dir: ${String(err)}`);
	}
	if (errors.length === 0) {
		try {
			createHarnessPolicyEngine(packageRoot);
		} catch (err) {
			errors.push(`PolicyEngine load failed: ${String(err)}`);
		}
	}
	return { ok: errors.length === 0, errors, policyDir, loaded };
}
