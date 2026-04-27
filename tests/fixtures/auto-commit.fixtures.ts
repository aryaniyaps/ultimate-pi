export const FIXTURE_CONFIG = {
	globalRestrictive: {
		dryRun: true,
		autoPush: false,
		push: { allowedRemotes: ["origin", "upstream"] },
	},
	projectAggressive: {
		dryRun: false,
		autoPush: true,
		push: { allowedRemotes: ["origin"] },
	},
	projectSafe: {
		dryRun: true,
		autoPush: false,
		push: { allowedRemotes: ["origin"] },
	},
};

export const FIXTURE_STATUS = {
	mixed: `
 M lib/auto-commit-core.ts
 R old_path.ts -> new_path.ts
?? "spaced path/file.ts"
`,
	duplicates: `
 M src/index.ts
 M src/index.ts
 R src/old.ts -> src/new.ts
 R src/old.ts -> src/new.ts
`,
};
