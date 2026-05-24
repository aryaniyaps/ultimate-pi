import type { DefectClass, Diagnostic } from "./types.js";

const SILENT_ERROR_HINTS = [
	"empty-catch",
	"no-discarded-error",
	"unchecked-throwing-call",
	"bare-except",
	"empty-rescue",
	"swallow",
	"silent",
];

const INJECTION_HINTS = [
	"sql-injection",
	"command-injection",
	"template-injection",
	"xss",
	"eval",
	"exec",
	"inner-html",
	"javascript-url",
];
const SECRET_HINTS = [
	"secret",
	"token",
	"password",
	"api-key",
	"hardcoded-secrets",
];
const ASYNC_HINTS = [
	"await-in-loop",
	"promise",
	"concurrency",
	"async",
	"then-catch",
];

function hasAny(haystack: string, hints: string[]): boolean {
	return hints.some((h) => haystack.includes(h));
}

export function classifyDefect(
	rule: string | undefined,
	tool: string | undefined,
	message: string | undefined,
): DefectClass {
	const text = `${rule ?? ""} ${tool ?? ""} ${message ?? ""}`.toLowerCase();

	if (hasAny(text, SILENT_ERROR_HINTS)) return "silent-error";
	if (hasAny(text, INJECTION_HINTS)) return "injection";
	if (hasAny(text, SECRET_HINTS)) return "secrets";
	if (hasAny(text, ASYNC_HINTS)) return "async-misuse";

	if (
		text.includes("no-") ||
		text.includes("return") ||
		text.includes("constructor")
	) {
		return "correctness";
	}

	if (
		text.includes("unsafe") ||
		text.includes("security") ||
		text.includes("ssrf") ||
		text.includes("path-traversal") ||
		text.includes("deserial") ||
		text.includes("auth-bypass") ||
		text.includes("crypto")
	)
		return "safety";
	if (text.includes("style") || text.includes("format")) return "style";

	return "unknown";
}

export function classifyDiagnostic(
	d: Pick<Diagnostic, "rule" | "tool" | "message">,
): DefectClass {
	return classifyDefect(d.rule, d.tool, d.message);
}
