/**
 * Shared agent discovery helpers (manifest + tests).
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export function isSafeAgentId(id) {
	if (!id || id.includes("..") || id.startsWith("/") || id.includes("\\")) {
		return false;
	}
	return /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(id);
}

export function sha256Content(content) {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

export function walkAgentsDir(rootDir, source, out) {
	if (!existsSync(rootDir)) return;
	const stack = [rootDir];
	while (stack.length > 0) {
		const dir = stack.pop();
		let entries;
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
			let content;
			try {
				content = readFileSync(full, "utf-8");
			} catch {
				continue;
			}
			out.set(id, { id, path: full, source, content });
		}
	}
}

export function discoverFromRoots(packageAgentsDir, projectAgentsDir, globalAgentsDir) {
	const files = new Map();
	walkAgentsDir(packageAgentsDir, "package", files);
	if (globalAgentsDir) walkAgentsDir(globalAgentsDir, "global", files);
	walkAgentsDir(projectAgentsDir, "project", files);
	return files;
}

export function getDriftReport(manifest, onDiskHashes) {
	const items = [];
	if (!manifest) {
		return { ok: false, items: [{ id: "*", kind: "missing_on_disk" }] };
	}
	for (const [id, entry] of onDiskHashes) {
		const expected = manifest.agents[id];
		if (!expected) {
			items.push({ id, kind: "missing_in_manifest" });
			continue;
		}
		if (expected.sha256 !== entry.sha256) {
			items.push({ id, kind: "hash_mismatch" });
		}
	}
	for (const id of Object.keys(manifest.agents)) {
		if (!onDiskHashes.has(id)) {
			items.push({ id, kind: "missing_on_disk" });
		}
	}
	return { ok: items.length === 0, items };
}
