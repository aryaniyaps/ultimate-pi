/**
 * P2 — detect material scope drift between task_summary and decomposition.
 */

export interface ScopeGuardResult {
	material_drift: boolean;
	overlap_score: number;
	summary: string;
	suggested_ask_user: boolean;
}

const PRODUCT_OS_MARKERS = [
	"product os",
	"product operating system",
	"knowledge base",
	"multi-source",
	"synthesiz",
	"papers",
	"youtube",
	"transcripts",
	"news",
	"books",
	"decisions",
];

const INFRA_MARKERS = [
	"cron",
	"systemd",
	"graphify add",
	"graphify update",
	"ingest",
	"lockfile",
	"feeds.yaml",
	"polling",
	"timer",
];

function tokenize(text: string): Set<string> {
	const lower = text.toLowerCase();
	const words = lower.match(/[a-z][a-z0-9_-]{2,}/g) ?? [];
	return new Set(words);
}

function markerHits(text: string, markers: string[]): number {
	const lower = text.toLowerCase();
	return markers.filter((m) => lower.includes(m)).length;
}

export function assessPlanScopeDrift(
	taskSummary: string,
	decompositionText: string,
): ScopeGuardResult {
	const taskTokens = tokenize(taskSummary);
	const decompTokens = tokenize(decompositionText);
	let overlap = 0;
	for (const t of taskTokens) {
		if (decompTokens.has(t)) overlap += 1;
	}
	const overlapScore = taskTokens.size === 0 ? 1 : overlap / taskTokens.size;

	const taskProduct = markerHits(taskSummary, PRODUCT_OS_MARKERS);
	const decompProduct = markerHits(decompositionText, PRODUCT_OS_MARKERS);
	const _taskInfra = markerHits(taskSummary, INFRA_MARKERS);
	const decompInfra = markerHits(decompositionText, INFRA_MARKERS);

	const productIntent = taskProduct >= 2;
	const narrowedToInfra =
		productIntent && decompInfra >= 3 && decompProduct < taskProduct;
	const lowOverlap = productIntent && overlapScore < 0.08;

	const material_drift = narrowedToInfra || lowOverlap;
	let summary: string;
	if (narrowedToInfra) {
		summary =
			"Decomposition reads as infrastructure/cron/graphify-ingest while the task asked for a broader product-OS knowledge base — confirm scope with the user.";
	} else if (lowOverlap) {
		summary =
			"Decomposition shares almost no vocabulary with the task summary — verify the plan targets the right problem.";
	} else {
		summary = "Scope alignment looks acceptable.";
	}

	return {
		material_drift,
		overlap_score: overlapScore,
		summary,
		suggested_ask_user: material_drift,
	};
}
