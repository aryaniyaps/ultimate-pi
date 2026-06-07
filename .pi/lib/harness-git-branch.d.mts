export type HarnessGitBranchResult = {
	ok: boolean;
	skipped: boolean;
	reason: string;
	current_branch: string | null;
	target_branch: string | null;
	action: string;
	new_branch?: string | null;
};

export function isProtectedBranch(
	branch: string,
	protectedPatterns?: string[],
): boolean;

export function harnessFeatureBranchName(runId: string): string;

export function readCurrentBranch(projectRoot: string): string | null;

export function ensureHarnessGitBranch(opts: {
	projectRoot: string;
	runId: string;
	upPkg?: string;
	dryRun?: boolean;
}): Promise<HarnessGitBranchResult>;

export function writeGitWorkflowArtifact(opts: {
	runDir: string;
	result: HarnessGitBranchResult;
}): Promise<string>;
