type ToolLike = { name: string };
type ContextLike = { tools?: ToolLike[] };

export function parseCursorTranscriptToolCalls(
	text: string,
	context: ContextLike,
): Array<{ name: string; arguments: Record<string, unknown> }> {
	const tools = context.tools;
	if (!tools || tools.length === 0) {
		return [];
	}

	const normalizeToolName = (raw: string): string | undefined => {
		const trimmed = raw.trim().toLowerCase();
		const aliases: Record<string, string[]> = {
			read: ["ReadFile", "Read", "readfile", "read"],
			write: ["Write", "write"],
			edit: ["Edit", "edit", "ApplyPatch", "applypatch"],
			glob: ["Glob", "glob"],
			grep: ["rg", "RG", "Grep", "grep"],
			shell: ["Shell", "shell", "bash", "Bash"],
			bash: ["Shell", "shell", "bash", "Bash"],
		};
		const candidates = aliases[trimmed] ?? [raw];
		for (const candidate of candidates) {
			const exact = tools.find((tool) => tool.name === candidate);
			if (exact) return exact.name;
			const insensitive = tools.find((tool) => tool.name.toLowerCase() === candidate.toLowerCase());
			if (insensitive) return insensitive.name;
		}
		return undefined;
	};

	const blockRegex = /⏺\s*([a-zA-Z0-9._-]+)[\s\S]*?```json\s*([\s\S]*?)```/g;
	let match: RegExpExecArray | null = null;
	const parsedCalls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
	while ((match = blockRegex.exec(text)) !== null) {
		const rawToolName = match[1] ?? "";
		const mappedName = normalizeToolName(rawToolName);
		if (!mappedName) continue;
		const rawArgs = (match[2] ?? "").trim();
		if (!rawArgs) {
			parsedCalls.push({ name: mappedName, arguments: {} });
			continue;
		}
		try {
			const parsed = JSON.parse(rawArgs);
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				parsedCalls.push({ name: mappedName, arguments: {} });
				continue;
			}
			parsedCalls.push({ name: mappedName, arguments: parsed as Record<string, unknown> });
		} catch {
			parsedCalls.push({ name: mappedName, arguments: {} });
		}
	}

	return parsedCalls;
}
