export type TriggerMode = "turn_end" | "idle" | "shutdown" | "hybrid";
export type GuardTimeoutPolicy = "block" | "skipGuardsCommit";
export type BranchStrategy = "current" | "auto-feature-branch";

export type AutoCommitConfig = {
	enabled: boolean;
	dryRun: boolean;
	autoPush: boolean;
	fallbackOnShutdown: boolean;
	trigger: {
		mode: TriggerMode;
		idleMs: number;
		cooldownMs: number;
		minChangedFiles: number;
	};
	coAuthor: {
		login: string;
		id: number;
		email: string;
		enforce: boolean;
	};
	guards: {
		required: string[];
		optional: string[];
		timeoutMs: number;
		onTimeout: GuardTimeoutPolicy;
	};
	branch: {
		strategy: BranchStrategy;
		protected: string[];
	};
	push: {
		allowedRemotes: string[];
		timeoutMs: number;
	};
	submodules: {
		ignore: boolean;
	};
	message: {
		template: string;
		typeDefault: string;
		scopeDefault: string;
		maxSummaryPaths: number;
	};
	ai: {
		enabled: boolean;
		timeoutMs: number;
		maxDiffChars: number;
		retries: number;
		retryDelayMs: number;
	};
};

export const DEFAULT_CONFIG: AutoCommitConfig = {
	enabled: false,
	dryRun: true,
	autoPush: false,
	fallbackOnShutdown: false,
	trigger: {
		mode: "turn_end",
		idleMs: 20_000,
		cooldownMs: 2_000,
		minChangedFiles: 1,
	},
	coAuthor: {
		login: "pi-mono",
		id: 261679550,
		email: "",
		enforce: true,
	},
	guards: {
		required: [],
		optional: [],
		timeoutMs: 30_000,
		onTimeout: "block",
	},
	branch: {
		strategy: "auto-feature-branch",
		protected: ["main", "master"],
	},
	push: {
		allowedRemotes: ["origin"],
		timeoutMs: 30_000,
	},
	submodules: {
		ignore: true,
	},
	message: {
		template: "{{type}}({{scope}}): {{summary}}",
		typeDefault: "chore",
		scopeDefault: "harness",
		maxSummaryPaths: 2,
	},
	ai: {
		enabled: true,
		timeoutMs: 20_000,
		maxDiffChars: 12_000,
		retries: 2,
		retryDelayMs: 1_000,
	},
};

export function deepClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value));
}

export function normalizeStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
}

export function mergeConfig(globalCfg: any, projectCfg: any): AutoCommitConfig {
	const merged = deepClone(DEFAULT_CONFIG);
	const g = globalCfg ?? {};
	const p = projectCfg ?? {};

	const applyBasic = (src: any) => {
		if (!src || typeof src !== "object") return;
		if (typeof src.enabled === "boolean") merged.enabled = src.enabled;
		if (typeof src.fallbackOnShutdown === "boolean") merged.fallbackOnShutdown = src.fallbackOnShutdown;

		if (src.trigger && typeof src.trigger === "object") {
			if (["turn_end", "idle", "shutdown", "hybrid"].includes(src.trigger.mode)) merged.trigger.mode = src.trigger.mode;
			if (typeof src.trigger.idleMs === "number") merged.trigger.idleMs = Math.max(1_000, src.trigger.idleMs);
			if (typeof src.trigger.cooldownMs === "number") merged.trigger.cooldownMs = Math.max(0, src.trigger.cooldownMs);
			if (typeof src.trigger.minChangedFiles === "number") merged.trigger.minChangedFiles = Math.max(1, src.trigger.minChangedFiles);
		}

		if (src.coAuthor && typeof src.coAuthor === "object") {
			if (typeof src.coAuthor.login === "string") merged.coAuthor.login = src.coAuthor.login;
			if (typeof src.coAuthor.id === "number") merged.coAuthor.id = src.coAuthor.id;
			if (typeof src.coAuthor.email === "string") merged.coAuthor.email = src.coAuthor.email.trim();
			if (typeof src.coAuthor.enforce === "boolean") merged.coAuthor.enforce = src.coAuthor.enforce;
		}

		if (src.guards && typeof src.guards === "object") {
			if (typeof src.guards.timeoutMs === "number") merged.guards.timeoutMs = Math.max(1_000, src.guards.timeoutMs);
			if (["block", "skipGuardsCommit"].includes(src.guards.onTimeout)) merged.guards.onTimeout = src.guards.onTimeout;
		}

		if (src.branch && typeof src.branch === "object") {
			if (["current", "auto-feature-branch"].includes(src.branch.strategy)) merged.branch.strategy = src.branch.strategy;
		}

		if (src.push && typeof src.push === "object") {
			if (typeof src.push.timeoutMs === "number") merged.push.timeoutMs = Math.max(1_000, src.push.timeoutMs);
		}

		if (src.submodules && typeof src.submodules === "object") {
			if (typeof src.submodules.ignore === "boolean") merged.submodules.ignore = src.submodules.ignore;
		}

		if (src.message && typeof src.message === "object") {
			if (typeof src.message.template === "string" && src.message.template.trim().length > 0) merged.message.template = src.message.template;
			if (typeof src.message.typeDefault === "string" && src.message.typeDefault.trim().length > 0) merged.message.typeDefault = src.message.typeDefault;
			if (typeof src.message.scopeDefault === "string" && src.message.scopeDefault.trim().length > 0) merged.message.scopeDefault = src.message.scopeDefault;
			if (typeof src.message.maxSummaryPaths === "number") merged.message.maxSummaryPaths = Math.max(1, src.message.maxSummaryPaths);
		}

		if (src.ai && typeof src.ai === "object") {
			if (typeof src.ai.enabled === "boolean") merged.ai.enabled = src.ai.enabled;
			if (typeof src.ai.timeoutMs === "number") merged.ai.timeoutMs = Math.max(1_000, src.ai.timeoutMs);
			if (typeof src.ai.maxDiffChars === "number") merged.ai.maxDiffChars = Math.max(1_000, src.ai.maxDiffChars);
			if (typeof src.ai.retries === "number") merged.ai.retries = Math.max(0, Math.min(src.ai.retries, 5));
			if (typeof src.ai.retryDelayMs === "number") merged.ai.retryDelayMs = Math.max(500, src.ai.retryDelayMs);
		}
	};

	applyBasic(g);
	applyBasic(p);

	const globalDryRun = typeof g.dryRun === "boolean" ? g.dryRun : merged.dryRun;
	const projectDryRun = typeof p.dryRun === "boolean" ? p.dryRun : undefined;
	merged.dryRun = globalDryRun === true ? true : (projectDryRun ?? globalDryRun);

	const globalAutoPush = typeof g.autoPush === "boolean" ? g.autoPush : merged.autoPush;
	const projectAutoPush = typeof p.autoPush === "boolean" ? p.autoPush : undefined;
	merged.autoPush = globalAutoPush === false ? false : (projectAutoPush ?? globalAutoPush);

	const globalRequired = normalizeStringArray(g.guards?.required);
	const projectRequired = normalizeStringArray(p.guards?.required);
	const globalOptional = normalizeStringArray(g.guards?.optional);
	const projectOptional = normalizeStringArray(p.guards?.optional);
	merged.guards.required = Array.from(new Set([...globalRequired, ...projectRequired]));
	merged.guards.optional = Array.from(new Set([...globalOptional, ...projectOptional]));

	const globalProtected = normalizeStringArray(g.branch?.protected);
	const projectProtected = normalizeStringArray(p.branch?.protected);
	merged.branch.protected = Array.from(new Set([...globalProtected, ...projectProtected, ...merged.branch.protected]));

	const globalAllowed = normalizeStringArray(g.push?.allowedRemotes);
	const projectAllowed = normalizeStringArray(p.push?.allowedRemotes);
	if (globalAllowed.length > 0 && projectAllowed.length > 0) {
		merged.push.allowedRemotes = globalAllowed.filter((r) => projectAllowed.includes(r));
	} else if (globalAllowed.length > 0) {
		merged.push.allowedRemotes = globalAllowed;
	} else if (projectAllowed.length > 0) {
		merged.push.allowedRemotes = projectAllowed;
	}
	merged.push.allowedRemotes = Array.from(new Set(merged.push.allowedRemotes));

	return merged;
}

export function resolveCoAuthorTrailer(config: AutoCommitConfig): string | undefined {
	const email = config.coAuthor.email || `${config.coAuthor.id}+${config.coAuthor.login}@users.noreply.github.com`;
	const trimmed = email.trim();
	if (!trimmed.includes("@")) return undefined;
	return `Co-authored-by: ${config.coAuthor.login} <${trimmed}>`;
}

export function parseChangedPaths(status: string): string[] {
	const lines = status
		.split("\n")
		.map((l) => l.trimEnd())
		.filter((l) => l.length >= 4);
	const paths: string[] = [];
	for (const line of lines) {
		let path = line.slice(3).trim();
		if (path.includes(" -> ")) path = path.split(" -> ")[1].trim();
		if (path.startsWith('"') && path.endsWith('"')) path = path.slice(1, -1);
		if (path.length > 0) paths.push(path);
	}
	return Array.from(new Set(paths));
}

export function deriveSummary(paths: string[], maxPaths: number): string {
	if (paths.length === 0) return "update workspace";
	const buckets = Array.from(
		new Set(
			paths.map((p) => {
				const parts = p.split("/");
				if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
				return parts[0];
			}),
		),
	);
	const picked = buckets.slice(0, Math.max(1, maxPaths));
	if (buckets.length <= picked.length) return `update ${picked.join(", ")}`;
	return `update ${picked.join(", ")} +${buckets.length - picked.length} more`;
}

export function validateMergedConfig(config: AutoCommitConfig): string[] {
	const issues: string[] = [];
	if (config.autoPush && config.push.allowedRemotes.length === 0) {
		issues.push("autoPush enabled but push.allowedRemotes is empty");
	}
	if (config.coAuthor.enforce && !resolveCoAuthorTrailer(config)) {
		issues.push("coAuthor.enforce is true but co-author trailer cannot be resolved");
	}
	if (config.guards.timeoutMs < 1000) {
		issues.push("guards.timeoutMs should be at least 1000ms");
	}
	if (config.trigger.mode === "idle" || config.trigger.mode === "hybrid") {
		if (config.trigger.idleMs < 1000) issues.push("trigger.idleMs should be at least 1000ms");
	}
	if (config.ai.timeoutMs < 1000) {
		issues.push("ai.timeoutMs should be at least 1000ms");
	}
	if (config.ai.maxDiffChars < 1000) {
		issues.push("ai.maxDiffChars should be at least 1000");
	}
	if (config.ai.retries > 5) {
		issues.push("ai.retries should be at most 5");
	}
	return issues;
}
