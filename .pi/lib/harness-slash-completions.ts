/**
 * Shared slash-command argument completions for harness extension commands.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import {
	harnessRunsRoot,
	RUN_CONTEXT_BASENAME,
} from "./harness-run-context.js";

const MAX_RUN_SUGGESTIONS = 20;

export function filterPrefix(
	items: AutocompleteItem[],
	prefix: string,
): AutocompleteItem[] | null {
	const p = prefix.trim();
	if (!p) return items.length > 0 ? items : null;
	const filtered = items.filter(
		(item) =>
			item.value.startsWith(p) ||
			(item.label !== undefined && item.label.startsWith(p)),
	);
	return filtered.length > 0 ? filtered : null;
}

export function completeFlags(
	prefix: string,
	flags: string[],
): AutocompleteItem[] | null {
	const items = flags.map((flag) => ({ value: flag, label: flag }));
	return filterPrefix(items, prefix);
}

export function completeEnum(
	prefix: string,
	values: string[],
): AutocompleteItem[] | null {
	return completeFlags(prefix, values);
}

export async function completeRunIds(
	prefix: string,
	projectRoot: string,
): Promise<AutocompleteItem[] | null> {
	const runsDir = harnessRunsRoot(projectRoot);
	let names: string[];
	try {
		names = await readdir(runsDir);
	} catch {
		return null;
	}

	const entries: { id: string; mtime: number; phase?: string }[] = [];
	for (const name of names) {
		if (name.startsWith(".")) continue;
		const dir = join(runsDir, name);
		try {
			const st = await stat(dir);
			if (!st.isDirectory()) continue;
			let phase: string | undefined;
			try {
				const raw = await readFile(join(dir, RUN_CONTEXT_BASENAME), "utf-8");
				const match = raw.match(/^phase:\s*(\S+)/m);
				if (match) phase = match[1];
			} catch {
				/* optional */
			}
			entries.push({ id: name, mtime: st.mtimeMs, phase });
		} catch {}
	}

	entries.sort((a, b) => b.mtime - a.mtime);
	const items: AutocompleteItem[] = entries
		.slice(0, MAX_RUN_SUGGESTIONS)
		.map((entry) => ({
			value: entry.id,
			label: entry.id,
			description: entry.phase ? `phase ${entry.phase}` : undefined,
		}));

	return filterPrefix(items, prefix);
}

export async function completeHarnessUseRun(
	prefix: string,
	projectRoot: string,
): Promise<AutocompleteItem[] | null> {
	const p = prefix.trim();
	if (p.startsWith("-")) {
		return completeFlags(p, ["--claim", "--readonly"]);
	}
	return completeRunIds(p, projectRoot);
}

export function completeStrictFlag(prefix: string): AutocompleteItem[] | null {
	return completeFlags(prefix, ["--strict"]);
}

export async function completeDebateOpen(
	prefix: string,
	projectRoot: string,
): Promise<AutocompleteItem[] | null> {
	const runs = await completeRunIds("", projectRoot);
	if (!runs?.length) {
		return filterPrefix([{ value: "plan-", label: "plan-<run-id>" }], prefix);
	}
	const items = runs.map((run) => ({
		value: `plan-${run.value}`,
		label: `plan-${run.value}`,
		description: run.description,
	}));
	return filterPrefix(items, prefix);
}
