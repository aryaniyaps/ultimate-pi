export function runHarnessSteerHygiene(opts: {
	runDir: string;
	projectRoot?: string | null;
}): Promise<{
	ok: boolean;
	log?: { outcome?: string };
}>;
