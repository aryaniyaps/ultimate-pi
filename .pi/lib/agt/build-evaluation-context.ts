import {
	classifyHarnessAgent,
	evaluateHarnessSubagentToolCall,
	isHarnessPlanningAgent,
} from "../../extensions/lib/harness-subagent-policy.js";
import { evaluateSubagentToolCall } from "../../extensions/lib/spawn-policy.js";
import {
	evaluateContextModeMutation,
	isMutatingBash,
} from "../harness-context-mode-policy.js";
import {
	extractWritePathFromToolInput,
	getLatestRunContext,
	type HarnessPhase,
	type HarnessRunContext,
	isPlanPhaseAllowedMutation,
} from "../harness-run-context.js";

export interface BuildEvaluationContextInput {
	toolName: string;
	toolInput: Record<string, unknown>;
	packageRoot: string;
	projectRoot: string;
	sessionId: string;
	entries: unknown[];
	policyState: {
		phase: HarnessPhase;
		approvedPlan: boolean;
		planId: string | null;
		aborted: boolean;
		budgetBypass: boolean;
	};
	agentDid?: string;
}

export type HarnessAgtContext = Record<string, unknown>;

const PLANNING_BASH_DENY_PATTERNS = [
	/\bgraphify\s+update\b/i,
	/\bgraphify\s+extract\b/i,
	/\bgraphify\s+install\b/i,
	/\bccc\s+(index|init|reset|daemon)\b/i,
	/\bccc\s+search\b.*--refresh/i,
	/\bpip\s+install\b/i,
	/\buv\s+tool\s+install\b/i,
	/\bnpm\s+install\b/i,
	/\bnpm\s+install\b.*cocoindex/i,
	/\buv\s+tool\s+install\b.*cocoindex/i,
];

const PLANNING_ARTIFACT_JSON_WRITE = /artifacts\/[^\s'"`;]+\.json\b/i;

const WEB_BLOCK_PATTERNS: Array<{ re: RegExp }> = [
	{ re: /\bfirecrawl\b/i },
	{ re: /\b(?:curl|wget)\b[^\n|;&]*\s+https?:\/\//i },
	{ re: /\bscrapling\s+(?:fetch|extract)\b/i },
];

const WEB_ALLOW_PATTERNS = [
	/harness-web\.py\b/i,
	/harness-cli-verify\.sh\b/i,
	/\bgraphify\b/i,
	/\bctx7\b/i,
	/\bcontext7\b/i,
	/\bgit\b/i,
	/harness-searxng-bootstrap/i,
];

function resolveAgentId(): string {
	if (process.env.PI_HARNESS_SUBPROCESS === "1") {
		return process.env.HARNESS_AGENT_ID?.trim() || "harness/unknown";
	}
	return "parent-orchestrator";
}

function bashWebBlocked(command: string): boolean {
	if (!command) return false;
	if (WEB_ALLOW_PATTERNS.some((re) => re.test(command))) return false;
	return WEB_BLOCK_PATTERNS.some(({ re }) => re.test(command));
}

function bashPlanningDenied(command: string, agentType: string): boolean {
	if (!command || !isHarnessPlanningAgent(agentType)) return false;
	return PLANNING_BASH_DENY_PATTERNS.some((p) => p.test(command));
}

function bashPlanningJsonDenied(command: string, agentType: string): boolean {
	if (!command || !isHarnessPlanningAgent(agentType)) return false;
	return PLANNING_ARTIFACT_JSON_WRITE.test(command);
}

export async function buildHarnessAgtEvaluationContext(
	input: BuildEvaluationContextInput,
): Promise<HarnessAgtContext> {
	const agentId = resolveAgentId();
	const isSubprocess = process.env.PI_HARNESS_SUBPROCESS === "1";
	const isParentOrchestrator = agentId === "parent-orchestrator";
	const agentKind = classifyHarnessAgent(agentId);
	const runCtx = getLatestRunContext(input.entries);
	const phase = input.policyState.phase;
	const bashCommand =
		input.toolName === "bash" ? String(input.toolInput.command ?? "") : "";

	const MUTATING_FILE_TOOLS = new Set(["write", "edit"]);
	const planMutation = MUTATING_FILE_TOOLS.has(input.toolName)
		? await isPlanPhaseAllowedMutation(
				input.toolName,
				input.toolInput,
				phase,
				runCtx,
				input.projectRoot,
				{
					aborted: input.policyState.aborted,
					entries: input.entries,
					ownerSessionId: runCtx?.owner_pi_session_id,
					currentSessionId: input.sessionId,
				},
			)
		: { allowed: true };

	const ctxMode = evaluateContextModeMutation(
		input.toolName,
		input.toolInput,
		phase,
		{
			aborted: input.policyState.aborted,
			budgetBypass: input.policyState.budgetBypass,
			readOnlyAgent:
				agentKind === "planner" ||
				agentKind === "evaluator" ||
				agentKind === "adversary" ||
				agentKind === "tie_breaker",
		},
	);

	const subagentDecision = evaluateHarnessSubagentToolCall(
		input.toolName,
		input.toolInput,
		agentId,
	);

	const spawnDecision = evaluateSubagentToolCall(input.toolName, agentId);

	let evalPlanPacketBlock = false;
	if (
		runCtx?.plan_packet_path &&
		(phase === "evaluate" || phase === "adversary") &&
		(input.toolName === "write" || input.toolName === "edit")
	) {
		const target = String(
			input.toolInput.path ?? input.toolInput.filePath ?? "",
		);
		if (target.includes("plan-packet.yaml")) {
			evalPlanPacketBlock = true;
		}
	}

	const writePath =
		input.toolName === "write" || input.toolName === "edit"
			? extractWritePathFromToolInput(input.toolInput)
			: null;

	const mutatingBashPhaseBlock =
		Boolean(bashCommand && isMutatingBash(bashCommand)) &&
		!input.policyState.aborted &&
		phase !== "execute" &&
		phase !== "merge";

	const abortMutatingBlock =
		input.policyState.aborted &&
		((bashCommand && isMutatingBash(bashCommand)) ||
			input.toolName === "write" ||
			input.toolName === "edit");

	return {
		tool_name: input.toolName,
		harness_phase: phase,
		harness_agent_id: agentId,
		harness_agent_kind: agentKind,
		is_subprocess: isSubprocess,
		is_parent_orchestrator: isParentOrchestrator,
		approved_plan: input.policyState.approvedPlan,
		plan_ready: Boolean(runCtx?.plan_ready),
		aborted: input.policyState.aborted,
		budget_bypass: input.policyState.budgetBypass,
		run_id: runCtx?.run_id ?? process.env.HARNESS_RUN_ID ?? "",
		plan_id: input.policyState.planId ?? runCtx?.plan_id ?? "",
		plan_mutation_allowed: planMutation.allowed,
		plan_mutation_block: !planMutation.allowed,
		context_mode_block: ctxMode.blocked,
		subagent_policy_block: subagentDecision.action === "block",
		spawn_policy_block: spawnDecision.action === "block",
		is_mutating_bash: bashCommand ? isMutatingBash(bashCommand) : false,
		is_mutating_write_tool:
			input.toolName === "write" || input.toolName === "edit",
		bash_web_block: bashWebBlocked(bashCommand),
		bash_planning_deny: bashPlanningDenied(bashCommand, agentId),
		bash_planning_json_block: bashPlanningJsonDenied(bashCommand, agentId),
		eval_plan_packet_write_block: evalPlanPacketBlock,
		is_submit_tool: input.toolName.startsWith("submit_"),
		is_planning_agent: isHarnessPlanningAgent(agentId),
		is_read_only_kind:
			agentKind === "planner" ||
			agentKind === "evaluator" ||
			agentKind === "adversary" ||
			agentKind === "tie_breaker" ||
			agentKind === "trace" ||
			agentKind === "incident" ||
			agentKind === "meta",
		is_executor_kind: agentKind === "executor",
		trust_score: Number(process.env.HARNESS_TRUST_SCORE ?? "1"),
		delegation_ceiling: Number(process.env.HARNESS_DELEGATION_CEILING ?? "1"),
		agent_did: input.agentDid ?? process.env.HARNESS_AGENT_DID ?? agentId,
		write_path: writePath ?? "",
		mutating_bash_phase_block: mutatingBashPhaseBlock,
		abort_mutating_block: abortMutatingBlock,
	};
}

export async function buildHarnessAgtEvaluationContextFromRun(
	input: Omit<BuildEvaluationContextInput, "policyState"> & {
		policyState?: BuildEvaluationContextInput["policyState"];
	},
): Promise<HarnessAgtContext> {
	const policyState = input.policyState ?? {
		phase: (process.env.HARNESS_SUBAGENT_PHASE_HINT as HarnessPhase) ?? "plan",
		approvedPlan: true,
		planId: null,
		aborted: false,
		budgetBypass: false,
	};
	return buildHarnessAgtEvaluationContext({ ...input, policyState });
}

export type { HarnessRunContext };
