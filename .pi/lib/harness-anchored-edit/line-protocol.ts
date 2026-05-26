/** Hash-anchored line protocol (from Dirac, Apache-2.0). */

export const ANCHOR_DELIMITER = "§";

export function getDelimiter(): string {
	return ANCHOR_DELIMITER;
}

export function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripHashes(content: string): string {
	if (!content) return "";
	const delimiterRegex = new RegExp(
		`\\b[A-Z][a-zA-Z]*?${escapeRegExp(ANCHOR_DELIMITER)}`,
		"g",
	);
	return content.replace(delimiterRegex, "");
}

export function splitAnchor(rawAnchor: string): {
	anchor: string;
	content: string;
} {
	const delimiterIndex = rawAnchor.indexOf(ANCHOR_DELIMITER);
	if (delimiterIndex === -1) {
		return { anchor: rawAnchor.trim(), content: "" };
	}
	return {
		anchor: rawAnchor.substring(0, delimiterIndex).trim(),
		content: rawAnchor.substring(delimiterIndex + ANCHOR_DELIMITER.length),
	};
}

export function formatLineWithHash(content: string, anchor: string): string {
	return `${anchor}${ANCHOR_DELIMITER}${content}`;
}
