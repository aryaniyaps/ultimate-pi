import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	ConflictResolutionStrategy,
	PolicyEngine,
} from "@microsoft/agent-governance-sdk";
import {
	resolveHarnessPoliciesDir,
	resolveProjectPoliciesDir,
} from "./config.js";

const PACKAGE_POLICY_FILES = [
	"defaults.yaml",
	"phases.yaml",
	"roles.yaml",
	"orchestrator.yaml",
	"bash-denylists.yaml",
	"web-guard.yaml",
	"workflow-sequences.yaml",
] as const;

let cachedEngine: PolicyEngine | null = null;
let cachedKey: string | null = null;

export class HarnessPolicyLoadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "HarnessPolicyLoadError";
	}
}

function loadYamlFile(engine: PolicyEngine, path: string): void {
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

function loadProjectPolicyDir(engine: PolicyEngine, projectRoot: string): string[] {
	const dir = resolveProjectPoliciesDir(projectRoot);
	const loaded: string[] = [];
	if (!existsSync(dir)) return loaded;
	const names = readdirSync(dir)
		.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
		.sort();
	for (const name of names) {
		loadYamlFile(engine, join(dir, name));
		loaded.push(name);
	}
	return loaded;
}

export interface CreateAgtPolicyEngineInput {
	packageRoot: string;
	projectRoot: string;
}

export function createAgtPolicyEngine(input: CreateAgtPolicyEngineInput): PolicyEngine {
	const engine = new PolicyEngine([], ConflictResolutionStrategy.DenyOverrides);
	const dir = resolveHarnessPoliciesDir(input.packageRoot);
	for (const file of PACKAGE_POLICY_FILES) {
		loadYamlFile(engine, join(dir, file));
	}
	loadProjectPolicyDir(engine, input.projectRoot);
	return engine;
}

/** @deprecated Use createAgtPolicyEngine */
export function createHarnessPolicyEngine(packageRoot: string): PolicyEngine {
	return createAgtPolicyEngine({
		packageRoot,
		projectRoot: process.cwd(),
	});
}

export function getAgtPolicyEngine(
	packageRoot: string,
	projectRoot: string,
): PolicyEngine {
	const key = `${packageRoot}\0${projectRoot}`;
	if (cachedEngine && cachedKey === key) return cachedEngine;
	cachedEngine = createAgtPolicyEngine({ packageRoot, projectRoot });
	cachedKey = key;
	return cachedEngine;
}

export function getHarnessPolicyEngine(packageRoot: string): PolicyEngine {
	return getAgtPolicyEngine(packageRoot, process.cwd());
}

export function resetHarnessPolicyEngineCache(): void {
	cachedEngine = null;
	cachedKey = null;
}

/** Doctor: policies dir exists and all expected YAML files present. */
export function doctorHarnessPolicies(
	packageRoot: string,
	projectRoot = process.cwd(),
): {
	ok: boolean;
	errors: string[];
	policyDir: string;
	loaded: string[];
	projectLoaded: string[];
} {
	const errors: string[] = [];
	const policyDir = resolveHarnessPoliciesDir(packageRoot);
	if (!existsSync(policyDir)) {
		errors.push(`policy directory missing: ${policyDir}`);
	}
	const loaded: string[] = [];
	for (const file of PACKAGE_POLICY_FILES) {
		const path = join(policyDir, file);
		if (!existsSync(path)) {
			errors.push(`missing policy file: ${path}`);
			continue;
		}
		loaded.push(file);
	}
	let projectLoaded: string[] = [];
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
			createAgtPolicyEngine({ packageRoot, projectRoot });
			const projDir = resolveProjectPoliciesDir(projectRoot);
			if (existsSync(projDir)) {
				projectLoaded = readdirSync(projDir).filter(
					(f) => f.endsWith(".yaml") || f.endsWith(".yml"),
				);
			}
		} catch (err) {
			errors.push(`PolicyEngine load failed: ${String(err)}`);
		}
	}
	return { ok: errors.length === 0, errors, policyDir, loaded, projectLoaded };
}
