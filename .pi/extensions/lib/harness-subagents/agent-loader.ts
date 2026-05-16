/**
 * Recursive discovery: $UP_PKG/.pi/agents/** + project .pi/agents/** overrides.
 */

import { createHash } from "node:crypto";
import { type Dirent, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { parseAgentMarkdown } from "./agent-parser.js";
import type { AgentConfig } from "./vendored/types.js";

export type AgentSource = "package" | "project" | "global";

export interface DiscoveredAgentFile {
	id: string;
	path: string;
	source: AgentSource;
	content: string;
}

/** Reject path traversal and unsafe ids. */
export function isSafeAgentId(id: string): boolean {
	if (!id || id.includes("..") || id.startsWith("/") || id.includes("\\")) {
		return false;
	}
	return /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(id);
}

function walkAgentsDir(
	rootDir: string,
	source: AgentSource,
	out: Map<string, DiscoveredAgentFile>,
): void {
	if (!existsSync(rootDir)) return;

	const stack: string[] = [rootDir];
	while (stack.length > 0) {
		const dir = stack.pop()!;
		let entries: Dirent[];
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (!entry.name.endsWith(".md")) continue;

			const rel = relative(rootDir, full).replace(/\\/g, "/");
			const id = rel.replace(/\.md$/i, "");
			if (!isSafeAgentId(id)) continue;

			let content: string;
			try {
				content = readFileSync(full, "utf-8");
			} catch {
				continue;
			}

			out.set(id, { id, path: full, source, content });
		}
	}
}

/**
 * Discover agent files from package, global, and project (low → high priority).
 */
export function discoverAgentFiles(
	cwd: string,
	packageRoot: string,
): Map<string, DiscoveredAgentFile> {
	const files = new Map<string, DiscoveredAgentFile>();

	const packageAgents = join(packageRoot, ".pi", "agents");
	const globalDir = join(getAgentDir(), "agents");
	const projectDir = join(cwd, ".pi", "agents");

	walkAgentsDir(packageAgents, "package", files);
	walkAgentsDir(globalDir, "global", files);
	walkAgentsDir(projectDir, "project", files);

	return files;
}

/** Load merged AgentConfig map (project overrides package for same id). */
export function loadHarnessAgents(
	cwd: string,
	packageRoot: string,
): Map<string, AgentConfig> {
	const agents = new Map<string, AgentConfig>();
	for (const file of discoverAgentFiles(cwd, packageRoot).values()) {
		agents.set(file.id, parseAgentMarkdown(file.id, file.content, file.source));
	}
	return agents;
}

export function sha256Content(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Package-only manifest entries (path → hash). */
export function loadPackageAgentHashes(
	packageRoot: string,
): Map<string, { path: string; sha256: string }> {
	const packageAgents = join(packageRoot, ".pi", "agents");
	const out = new Map<string, { path: string; sha256: string }>();
	const files = new Map<string, DiscoveredAgentFile>();
	walkAgentsDir(packageAgents, "package", files);
	for (const f of files.values()) {
		out.set(f.id, { path: f.path, sha256: sha256Content(f.content) });
	}
	return out;
}

/** Legacy hook used by pi-subagents custom-agents.ts replacement. */
export function loadCustomAgents(
	cwd: string,
	packageRoot: string,
): Map<string, AgentConfig> {
	return loadHarnessAgents(cwd, packageRoot);
}
