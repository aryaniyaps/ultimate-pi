import * as nodeFs from "node:fs";

export function tryCorrectIndentationMismatchFromContent(
	oldText: string,
	content: string,
): string | undefined {
	const normalized = oldText.replace(/\r\n/g, "\n");
	if (content.includes(normalized)) return undefined;

	const conversions = [
		(s: string) =>
			s
				.split("\n")
				.map((l) => l.replace(/^\t+/, (m) => "  ".repeat(m.length)))
				.join("\n"),
		(s: string) =>
			s
				.split("\n")
				.map((l) => l.replace(/^\t+/, (m) => "    ".repeat(m.length)))
				.join("\n"),
		(s: string) =>
			s
				.split("\n")
				.map((l) => l.replace(/^( {2})+/, (m) => "\t".repeat(m.length / 2)))
				.join("\n"),
		(s: string) =>
			s
				.split("\n")
				.map((l) => l.replace(/^( {4})+/, (m) => "\t".repeat(m.length / 4)))
				.join("\n"),
	];

	for (const convert of conversions) {
		const candidate = convert(normalized);
		if (candidate !== normalized && content.includes(candidate))
			return candidate;
	}

	return findIndentationInsensitiveCandidate(content, normalized);
}

export function tryCorrectIndentationMismatch(
	oldText: string,
	filePath: string,
): string | undefined {
	try {
		return tryCorrectIndentationMismatchFromContent(
			oldText,
			nodeFs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n"),
		);
	} catch {
		return undefined;
	}
}

function findIndentationInsensitiveCandidate(
	content: string,
	oldText: string,
): string | undefined {
	const contentLines = content.split("\n");
	const oldLines = oldText.split("\n");
	const stripIndent = (line: string) => line.replace(/^[\t ]+/, "").trimEnd();
	const expected = oldLines.map(stripIndent);

	for (
		let start = 0;
		start <= contentLines.length - oldLines.length;
		start += 1
	) {
		let matches = true;
		for (let offset = 0; offset < oldLines.length; offset += 1) {
			if (
				stripIndent(contentLines[start + offset] ?? "") !== expected[offset]
			) {
				matches = false;
				break;
			}
		}
		if (matches) {
			const candidate = contentLines
				.slice(start, start + oldLines.length)
				.join("\n");
			if (candidate !== oldText) return candidate;
		}
	}

	return undefined;
}
