import { join } from "node:path";
import {
	canonicalPlanPath,
	getLatestRunContext,
	harnessRunsRoot,
	type PlanPacketLike,
	RESEARCH_BRIEF_BASENAME,
	readPlanPacketFromPath,
	validatePlanPacket,
} from "../harness-run-context.js";
import { readYamlFile } from "../harness-yaml.js";
import type { ApprovePlanParams, PlanResearchBrief } from "./types.js";

function isNonEmptyPacket(
	packet: PlanPacketLike | null | undefined,
): packet is PlanPacketLike {
	return Boolean(
		packet &&
			typeof packet === "object" &&
			Object.keys(packet).length > 0 &&
			packet.plan_id,
	);
}

export async function loadResearchBriefFromRun(
	runId: string,
	projectRoot: string,
): Promise<PlanResearchBrief | undefined> {
	try {
		const path = join(
			harnessRunsRoot(projectRoot),
			runId,
			RESEARCH_BRIEF_BASENAME,
		);
		return (await readYamlFile(
			path,
			RESEARCH_BRIEF_BASENAME,
		)) as PlanResearchBrief;
	} catch {
		return undefined;
	}
}

/** Path-first approve_plan: load packet + research brief from active run dir. */
export async function resolveApprovePlanParamsFromDisk(
	params: ApprovePlanParams,
	entries: unknown[],
	projectRoot: string,
): Promise<
	| {
			ok: true;
			plan_packet: PlanPacketLike;
			research_brief?: PlanResearchBrief;
	  }
	| { ok: false; error: string }
> {
	const inline = params.plan_packet;
	if (isNonEmptyPacket(inline)) {
		const validation = validatePlanPacket(inline);
		if (!validation.valid) {
			return {
				ok: false,
				error: `approve_plan: invalid plan_packet — ${validation.errors.join("; ")}`,
			};
		}
		return {
			ok: true,
			plan_packet: inline,
			research_brief: params.research_brief ?? undefined,
		};
	}

	const runCtx = getLatestRunContext(entries);
	if (!runCtx?.run_id) {
		return {
			ok: false,
			error:
				'approve_plan: no active harness run. Run /harness-plan "<task>" first.',
		};
	}
	const planPath =
		runCtx.plan_packet_path ?? canonicalPlanPath(runCtx.run_id, projectRoot);
	const packet = await readPlanPacketFromPath(planPath);
	if (!isNonEmptyPacket(packet)) {
		return {
			ok: false,
			error:
				"approve_plan: plan_packet missing on disk. Write plan-packet.yaml draft before approve_plan.",
		};
	}
	const validation = validatePlanPacket(packet);
	if (!validation.valid) {
		return {
			ok: false,
			error: `approve_plan: invalid plan_packet on disk — ${validation.errors.join("; ")}`,
		};
	}
	const research_brief =
		params.research_brief ??
		(await loadResearchBriefFromRun(runCtx.run_id, projectRoot));
	return { ok: true, plan_packet: packet, research_brief };
}
