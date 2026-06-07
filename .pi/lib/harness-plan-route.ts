/**
 * Plan synthesis routing — sequential vs plan-synthesizer path.
 */

import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export type PlanSynthesisRoute = "sequential" | "synthesizer";

export const PLAN_SYNTHESIS_ROUTE_ARTIFACT =
	"artifacts/plan-synthesis-route.yaml";

const SYNTHESIZER_ARTIFACTS = [
	"artifacts/decomposition.yaml",
	"artifacts/hypothesis.yaml",
	"artifacts/execution-plan-draft.yaml",
] as const;

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

export async function synthesizerArtifactsComplete(
	runDir: string,
): Promise<boolean> {
	for (const rel of SYNTHESIZER_ARTIFACTS) {
		if (!(await fileExists(join(runDir, rel)))) return false;
	}
	return true;
}

export async function synthesizerAllowsRespawn(
	runDir: string,
): Promise<boolean> {
	if (!(await synthesizerArtifactsComplete(runDir))) return true;
	for (const rel of SYNTHESIZER_ARTIFACTS) {
		try {
			const raw = await readFile(join(runDir, rel), "utf-8");
			const doc = parseYaml(raw) as Record<string, unknown>;
			const status = String(doc?.status ?? "ok").toLowerCase();
			if (status === "partial" || status === "failed" || status === "error") {
				return true;
			}
		} catch {
			return true;
		}
	}
	return false;
}

export interface PlanRouteInput {
	risk_level?: string;
	material_fork?: boolean;
}

export function defaultSynthesisRoute(
	input: PlanRouteInput,
): PlanSynthesisRoute {
	const risk = String(input.risk_level ?? "med").toLowerCase();
	if (input.material_fork || risk === "high") return "sequential";
	if (risk === "low" || risk === "med") return "synthesizer";
	return "sequential";
}

export async function planSynthesisPath(
	runDir: string,
	input?: PlanRouteInput,
): Promise<PlanSynthesisRoute> {
	const routePath = join(runDir, PLAN_SYNTHESIS_ROUTE_ARTIFACT);
	if (await fileExists(routePath)) {
		try {
			const raw = await readFile(routePath, "utf-8");
			const doc = parseYaml(raw) as Record<string, unknown>;
			const route = String(doc.route ?? "").toLowerCase();
			if (route === "synthesizer" || route === "sequential") return route;
		} catch {
			// fall through
		}
	}
	if (await synthesizerArtifactsComplete(runDir)) return "synthesizer";
	return defaultSynthesisRoute(input ?? {});
}

export interface PlanRouteNextSpawn {
	agents: string[];
	route: PlanSynthesisRoute;
	rationale: string[];
}

export async function derivePlanRouteSpawns(
	runDir: string,
	input?: PlanRouteInput,
): Promise<PlanRouteNextSpawn> {
	const route = await planSynthesisPath(runDir, input);
	const rationale: string[] = [`synthesis route: ${route}`];
	if (route === "synthesizer") {
		if (await synthesizerArtifactsComplete(runDir)) {
			return {
				route,
				agents: ["harness/planning/execution-plan-author"],
				rationale: [
					...rationale,
					"synthesizer artifacts complete — advance to execution-plan-author",
				],
			};
		}
		return {
			route,
			agents: ["harness/planning/plan-synthesizer"],
			rationale: [
				...rationale,
				"single spawn for decomposition + hypothesis + draft",
			],
		};
	}
	const agents: string[] = [];
	if (!(await fileExists(join(runDir, "artifacts/decomposition.yaml")))) {
		agents.push("harness/planning/decompose");
	} else if (!(await fileExists(join(runDir, "artifacts/hypothesis.yaml")))) {
		agents.push("harness/planning/hypothesis");
	} else if (
		!(await fileExists(join(runDir, "artifacts/execution-plan-draft.yaml")))
	) {
		agents.push("harness/planning/execution-plan-author");
	}
	return { route, agents, rationale };
}
