/**
 * agents.manifest.json drift detection (package agents vs installed hashes).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	type DiscoveredAgentFile,
	loadPackageAgentHashes,
	sha256Content,
} from "./agent-loader.js";

export interface ManifestEntry {
	path: string;
	sha256: string;
}

export interface AgentsManifest {
	schema_version: string;
	package: string;
	package_version: string;
	generated_at: string;
	agents: Record<string, ManifestEntry>;
}

export interface DriftItem {
	id: string;
	kind: "missing_in_manifest" | "hash_mismatch" | "missing_on_disk";
	expected?: string;
	actual?: string;
}

export interface DriftReport {
	ok: boolean;
	packageVersion: string;
	items: DriftItem[];
}

function readPackageVersion(packageRoot: string): string {
	try {
		const pkg = JSON.parse(
			readFileSync(join(packageRoot, "package.json"), "utf-8"),
		) as { version?: string };
		return pkg.version ?? "unknown";
	} catch {
		return "unknown";
	}
}

export function readAgentsManifest(packageRoot: string): AgentsManifest | null {
	const path = join(packageRoot, ".pi", "harness", "agents.manifest.json");
	try {
		return JSON.parse(readFileSync(path, "utf-8")) as AgentsManifest;
	} catch {
		return null;
	}
}

export function getDriftReport(packageRoot: string): DriftReport {
	const manifest = readAgentsManifest(packageRoot);
	const onDisk = loadPackageAgentHashes(packageRoot);
	const packageVersion = readPackageVersion(packageRoot);
	const items: DriftItem[] = [];

	if (!manifest) {
		return {
			ok: false,
			packageVersion,
			items: [{ id: "*", kind: "missing_on_disk" }],
		};
	}

	for (const [id, entry] of onDisk) {
		const expected = manifest.agents[id];
		if (!expected) {
			items.push({ id, kind: "missing_in_manifest" });
			continue;
		}
		if (expected.sha256 !== entry.sha256) {
			items.push({
				id,
				kind: "hash_mismatch",
				expected: expected.sha256,
				actual: entry.sha256,
			});
		}
	}

	for (const id of Object.keys(manifest.agents)) {
		if (!onDisk.has(id)) {
			items.push({ id, kind: "missing_on_disk" });
		}
	}

	return { ok: items.length === 0, packageVersion, items };
}

export function buildManifestFromFiles(
	files: Iterable<DiscoveredAgentFile>,
	packageName: string,
	packageVersion: string,
): AgentsManifest {
	const agents: Record<string, ManifestEntry> = {};
	for (const f of files) {
		if (f.source !== "package") continue;
		const relPath = `.pi/agents/${f.id}.md`;
		agents[f.id] = {
			path: relPath,
			sha256: sha256Content(f.content),
		};
	}
	return {
		schema_version: "1.0.0",
		package: packageName,
		package_version: packageVersion,
		generated_at: new Date().toISOString(),
		agents,
	};
}
