import * as fs from "node:fs";
import * as path from "node:path";
import {
	detectFileKind,
	type FileKind,
} from "./file-kinds.js";
import { isPathIgnoredByProject } from "./file-utils.js";

export interface ProjectProfile {
	present: Partial<Record<FileKind, boolean>>;
	counts: Partial<Record<FileKind, number>>;
	detectedKinds: FileKind[];
}

const MARKERS: Partial<Record<FileKind, string[]>> = {
	go: ["go.mod"],
	python: ["pyproject.toml", "requirements.txt", "setup.py"],
	rust: ["Cargo.toml"],
	jsts: ["package.json", "tsconfig.json"],
	java: ["pom.xml", "build.gradle", "build.gradle.kts"],
	ruby: ["Gemfile"],
	php: ["composer.json"],
};

const LSP_DEFAULTS: Partial<Record<FileKind, string>> = {
	jsts: "typescript-language-server",
	python: "pyright",
	rust: "rust-analyzer",
	java: "jdtls",
	ruby: "solargraph",
	php: "intelephense",
};

const MAX_WALK_FILES = 4000;
const MAX_LSP_PREINSTALL = 3;

function countKind(kind: FileKind, counts: Partial<Record<FileKind, number>>): void {
	counts[kind] = (counts[kind] ?? 0) + 1;
}

function walkProject(root: string): Partial<Record<FileKind, number>> {
	const counts: Partial<Record<FileKind, number>> = {};
	let scanned = 0;
	const queue = [root];

	while (queue.length > 0 && scanned < MAX_WALK_FILES) {
		const dir = queue.pop();
		if (!dir) break;
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (scanned >= MAX_WALK_FILES) break;
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === "node_modules" || entry.name === ".git") continue;
				if (isPathIgnoredByProject(full, root, true)) continue;
				queue.push(full);
				continue;
			}
			if (!entry.isFile()) continue;
			if (isPathIgnoredByProject(full, root, false)) continue;
			scanned += 1;
			const kind = detectFileKind(full);
			if (kind) countKind(kind, counts);
		}
	}

	return counts;
}

function markerPresent(root: string, kind: FileKind): boolean {
	for (const marker of MARKERS[kind] ?? []) {
		if (fs.existsSync(path.join(root, marker))) return true;
	}
	return false;
}

export function detectProjectProfile(root: string): ProjectProfile {
	const resolved = path.resolve(root);
	const counts = walkProject(resolved);
	const present: Partial<Record<FileKind, boolean>> = {};

	for (const [kind, count] of Object.entries(counts)) {
		if ((count ?? 0) > 0) present[kind as FileKind] = true;
	}

	for (const kind of Object.keys(MARKERS) as FileKind[]) {
		if (markerPresent(resolved, kind)) present[kind] = true;
	}

	const detectedKinds = (Object.keys(present) as FileKind[])
		.filter((kind) => present[kind])
		.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));

	return { present, counts, detectedKinds };
}

export function lspPreinstallTools(profile: ProjectProfile): string[] {
	const tools: string[] = [];
	for (const kind of profile.detectedKinds) {
		const tool = LSP_DEFAULTS[kind];
		if (tool && !tools.includes(tool)) tools.push(tool);
		if (tools.length >= MAX_LSP_PREINSTALL) break;
	}
	return tools;
}

export function resolveProjectRootForFile(
	filePath: string,
	fallbackRoot: string,
): string {
	return path.resolve(fallbackRoot);
}
