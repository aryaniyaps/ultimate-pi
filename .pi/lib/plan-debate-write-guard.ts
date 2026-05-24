/**
 * P0 — only harness_debate_submit_round may write review-round-r*.yaml via write_harness_yaml.
 */

let reviewRoundWriteDepth = 0;

export function isReviewRoundYamlWriteAllowed(): boolean {
	return reviewRoundWriteDepth > 0;
}

export async function withReviewRoundYamlWrite<T>(
	fn: () => Promise<T>,
): Promise<T> {
	reviewRoundWriteDepth += 1;
	try {
		return await fn();
	} finally {
		reviewRoundWriteDepth -= 1;
	}
}
