export const SMOKE_FILE_REL: ".pi/harness/evals/smoke/E2E-LAST-RUN.txt";

export function smokeFileHasIsoLine(projectRoot: string): Promise<boolean>;

export function isHarnessGitQaCommitComplete(
	projectRoot: string,
): Promise<boolean>;
