import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	canonicalPlanPath,
	type HarnessRunContext,
	hasPlanUserApproval,
	type PlanPacketLike,
	saveProjectActiveRun,
	saveRunContextToDisk,
	validatePlanPacket,
} from "../../../lib/harness-run-context.js";
import { writePlanReviewMarkdown } from "./plan-review.js";

export const CREATE_PLAN_SNIPPET =
	"create_plan({ plan_packet: { ...approved PlanPacket } })";

export const CREATE_PLAN_GUIDELINES = [
	"Call create_plan only after the user approves via approve_plan (Approve selection).",
	"Pass the same plan_packet you showed in approve_plan — path is resolved automatically.",
	"Never use write or edit for plan-packet.json; create_plan is the only allowed plan write.",
];

export interface CreatePlanDeps {
	projectRoot: string;
	getParentEntries: () => unknown[];
	getSubagentEntries: () => unknown[];
	getParentRunContext: () => HarnessRunContext | null;
	/** Persist parent harness-run-context + plan-packet summary entries. */
	onCommitted: (
		runCtx: HarnessRunContext,
		packet: PlanPacketLike,
		planPath: string,
	) => void;
}

export type CreatePlanResult =
	| { ok: true; planPath: string; planId: string }
	| { ok: false; error: string };

export async function executeCreatePlan(
	planPacket: PlanPacketLike,
	deps: CreatePlanDeps,
): Promise<CreatePlanResult> {
	const validation = validatePlanPacket(planPacket);
	if (!validation.valid) {
		return {
			ok: false,
			error: `create_plan: invalid plan_packet — ${validation.errors.join("; ")}`,
		};
	}

	const runCtx = deps.getParentRunContext();
	if (!runCtx?.run_id || !runCtx.plan_packet_path) {
		return {
			ok: false,
			error:
				"create_plan: no active harness run on parent session (missing plan_packet_path).",
		};
	}

	const planPath = resolve(deps.projectRoot, runCtx.plan_packet_path);
	const canonical = canonicalPlanPath(runCtx.run_id, deps.projectRoot);
	if (resolve(planPath) !== resolve(canonical)) {
		return {
			ok: false,
			error: `create_plan: plan_packet_path must be ${canonical}`,
		};
	}

	const planId = String(planPacket.plan_id ?? "");
	const parentEntries = deps.getParentEntries();
	const subEntries = deps.getSubagentEntries();
	const approved =
		hasPlanUserApproval(parentEntries, {
			sincePlanCommand: true,
			planId: planId || runCtx.plan_id,
		}) ||
		hasPlanUserApproval(subEntries, {
			sincePlanCommand: false,
			planId: planId || runCtx.plan_id,
		});
	if (!approved) {
		return {
			ok: false,
			error:
				"create_plan: blocked until user approves via approve_plan (Approve) in this session.",
		};
	}

	try {
		await mkdir(dirname(planPath), { recursive: true });
		await writeFile(
			planPath,
			`${JSON.stringify(planPacket, null, 2)}\n`,
			"utf-8",
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { ok: false, error: `create_plan: write failed — ${msg}` };
	}

	const updated: HarnessRunContext = {
		...runCtx,
		plan_id: planId || runCtx.plan_id,
		plan_ready: true,
		phase: "plan",
		last_completed_step: "plan",
		last_outcome: "ready",
		next_recommended_command: "/harness-run",
		updated_at: new Date().toISOString(),
	};

	try {
		await saveRunContextToDisk(updated);
		await saveProjectActiveRun(updated);
	} catch {
		/* disk mirror best-effort */
	}

	await writePlanReviewMarkdown(deps.projectRoot, updated, planPacket, {
		status: "committed",
	});

	deps.onCommitted(updated, planPacket, planPath);

	return {
		ok: true,
		planPath,
		planId: planId || updated.plan_id || "unknown",
	};
}

export function formatCreatePlanResultText(result: CreatePlanResult): string {
	if (!result.ok) return result.error;
	return `Plan written to ${result.planPath} (plan_id=${result.planId}).`;
}
