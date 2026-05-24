import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AuditLogger } from "@microsoft/agent-governance-sdk";

const loggers = new Map<string, AuditLogger>();

export function getAuditLoggerForRun(runDir: string): AuditLogger {
	const key = runDir;
	let logger = loggers.get(key);
	if (!logger) {
		logger = new AuditLogger();
		loggers.set(key, logger);
	}
	return logger;
}

export function appendPolicyAuditEvent(input: {
	runDir: string;
	runId: string;
	toolName: string;
	allowed: boolean;
	reason: string;
	agentDid: string;
	phase: string;
}): void {
	const logger = getAuditLoggerForRun(input.runDir);
	logger.log({
		action: `tool.${input.toolName}:${input.phase}:${input.reason}`,
		agentId: input.agentDid,
		decision: input.allowed ? "allow" : "deny",
	});
	const auditPath = join(input.runDir, "agt-audit.jsonl");
	mkdirSync(input.runDir, { recursive: true });
	appendFileSync(
		auditPath,
		`${JSON.stringify({
			ts: new Date().toISOString(),
			run_id: input.runId,
			tool: input.toolName,
			allowed: input.allowed,
			reason: input.reason,
			agent_did: input.agentDid,
			phase: input.phase,
		})}\n`,
	);
}

export function verifyRunAuditChain(runDir: string): boolean {
	const logger = loggers.get(runDir);
	if (!logger) return true;
	return logger.verify();
}
