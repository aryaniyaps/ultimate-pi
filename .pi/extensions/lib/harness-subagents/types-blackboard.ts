/**
 * Blackboard types (ported from subagent-v2 reference; MIT design reference).
 */

export interface PostMetadata {
	summary?: string;
	category?: string;
	supersedes?: string;
}

export interface BlackboardEntry {
	key: string;
	value: unknown;
	agentId: string;
	agentName: string;
	timestamp: number;
	metadata?: PostMetadata;
}

export interface BlackboardQuery {
	keys?: string[];
	pattern?: string | RegExp;
	agentId?: string;
	agentName?: string;
	category?: string;
	after?: number;
}
