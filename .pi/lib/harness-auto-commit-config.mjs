/**
 * Load and merge .pi/auto-commit.json (project overrides package).
 * Format commit subjects and append Co-authored-by trailers.
 */

import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const TEMPLATE_PLACEHOLDERS = new Set(["type", "scope", "subject", "login", "email"]);

const DEFAULT_CO_AUTHOR = {
	login: "pi-mono",
	email: "261679550+pi-mono@users.noreply.github.com",
	required: true,
};

const DEFAULT_MESSAGE = {
	template: "{type}({scope}): {subject}",
	templateNoScope: "{type}: {subject}",
	typeDefault: "chore",
	scopeDefault: "harness",
	bodySeparator: "\n\n",
	coAuthorTrailer: "Co-authored-by: {login} <{email}>",
	maxSubjectLength: 72,
};

/** @param {unknown} value */
function isPlainObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge objects; arrays and scalars from override replace base.
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} override
 */
export function deepMerge(base, override) {
	const out = { ...base };
	for (const [key, val] of Object.entries(override)) {
		if (
			isPlainObject(val) &&
			isPlainObject(out[key]) &&
			!Array.isArray(val)
		) {
			out[key] = deepMerge(
				/** @type {Record<string, unknown>} */ (out[key]),
				/** @type {Record<string, unknown>} */ (val),
			);
		} else {
			out[key] = val;
		}
	}
	return out;
}

async function readJsonIfExists(path) {
	try {
		await access(path, constants.R_OK);
	} catch {
		return null;
	}
	const raw = await readFile(path, "utf-8");
	return JSON.parse(raw);
}

/**
 * @param {string} template
 */
export function assertValidTemplate(template) {
	const re = /\{([a-zA-Z_]+)\}/g;
	let m;
	while ((m = re.exec(template)) !== null) {
		if (!TEMPLATE_PLACEHOLDERS.has(m[1])) {
			throw new Error(
				`auto-commit: unknown placeholder {${m[1]}} in template (allowed: ${[...TEMPLATE_PLACEHOLDERS].join(", ")})`,
			);
		}
	}
}

/**
 * @param {Record<string, unknown>} config
 */
export function validateAutoCommitConfig(config) {
	const coAuthor = /** @type {Record<string, unknown>} */ (
		config.coAuthor ?? {}
	);
	const login = coAuthor.login;
	const email = coAuthor.email;
	if (typeof login !== "string" || !login.trim()) {
		throw new Error("auto-commit: coAuthor.login is required");
	}
	if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
		throw new Error("auto-commit: coAuthor.email must be a valid email");
	}

	const message = /** @type {Record<string, unknown>} */ (
		config.message ?? {}
	);
	const template = message.template;
	if (typeof template !== "string" || !template.trim()) {
		throw new Error("auto-commit: message.template is required");
	}
	assertValidTemplate(template);
	const templateNoScope = message.templateNoScope;
	if (templateNoScope != null) {
		if (typeof templateNoScope !== "string" || !templateNoScope.trim()) {
			throw new Error("auto-commit: message.templateNoScope must be non-empty");
		}
		assertValidTemplate(templateNoScope);
	}
	const trailer = message.coAuthorTrailer;
	if (typeof trailer !== "string" || !trailer.trim()) {
		throw new Error("auto-commit: message.coAuthorTrailer is required");
	}
	assertValidTemplate(trailer);
}

/**
 * @param {string} projectRoot
 * @param {string} upPkg
 */
export async function resolveAutoCommitConfig(projectRoot, upPkg) {
	const pkgPath = join(upPkg, ".pi", "auto-commit.json");
	const projectPath = join(projectRoot, ".pi", "auto-commit.json");

	const pkgRaw = (await readJsonIfExists(pkgPath)) ?? {};
	const projectRaw = (await readJsonIfExists(projectPath)) ?? {};

	const base = {
		dryRun: false,
		coAuthor: { ...DEFAULT_CO_AUTHOR },
		message: { ...DEFAULT_MESSAGE },
		...(isPlainObject(pkgRaw) ? pkgRaw : {}),
	};
	const merged = deepMerge(
		/** @type {Record<string, unknown>} */ (base),
		/** @type {Record<string, unknown>} */ (
			isPlainObject(projectRaw) ? projectRaw : {}
		),
	);

	if (!isPlainObject(merged.message)) {
		merged.message = { ...DEFAULT_MESSAGE };
	} else {
		merged.message = { ...DEFAULT_MESSAGE, ...merged.message };
	}
	if (!isPlainObject(merged.coAuthor)) {
		merged.coAuthor = { ...DEFAULT_CO_AUTHOR };
	} else {
		merged.coAuthor = { ...DEFAULT_CO_AUTHOR, ...merged.coAuthor };
	}

	validateAutoCommitConfig(merged);
	return merged;
}

/**
 * @param {string} template
 * @param {Record<string, string>} vars
 */
function applyTemplate(template, vars) {
	return template.replace(/\{([a-zA-Z_]+)\}/g, (_, key) => vars[key] ?? "");
}

/**
 * @param {Record<string, unknown>} config
 * @param {{ type?: string, scope?: string, subject: string, body?: string }} input
 */
export function formatCommitMessage(config, input) {
	const message = /** @type {Record<string, unknown>} */ (config.message);
	const type =
		(input.type ?? message.typeDefault ?? "chore").toString().trim() ||
		"chore";
	let scope = (input.scope ?? message.scopeDefault ?? "").toString().trim();
	const subject = input.subject.trim();
	if (!subject) {
		throw new Error("auto-commit: subject is required");
	}

	const maxLen =
		typeof message.maxSubjectLength === "number"
			? message.maxSubjectLength
			: 72;
	let subjectLine = subject.split(/\r?\n/)[0] ?? subject;
	if (subjectLine.length > maxLen) {
		subjectLine = `${subjectLine.slice(0, maxLen - 3)}...`;
	}

	const template =
		scope.length > 0
			? String(message.template)
			: String(message.templateNoScope ?? message.template);
	const subjectFormatted = applyTemplate(template, {
		type,
		scope,
		subject: subjectLine,
	});

	const body = (input.body ?? "").trim();
	const bodySep = String(message.bodySeparator ?? "\n\n");
	if (!body) {
		return subjectFormatted;
	}
	return `${subjectFormatted}${bodySep}${body}`;
}

/**
 * Strip trailing co-authored-by lines from commit message body.
 * @param {string} message
 */
export function stripCoAuthorTrailers(message) {
	const lines = message.replace(/\r\n/g, "\n").split("\n");
	while (lines.length > 0) {
		const last = lines[lines.length - 1]?.trim() ?? "";
		if (!last) {
			lines.pop();
			continue;
		}
		if (/^co-authored-by:/i.test(last)) {
			lines.pop();
			continue;
		}
		break;
	}
	return lines.join("\n").trimEnd();
}

/**
 * @param {Record<string, unknown>} coAuthor
 * @param {string} trailerTemplate
 */
export function renderCoAuthorTrailer(coAuthor, trailerTemplate) {
	return applyTemplate(trailerTemplate, {
		login: String(coAuthor.login).trim(),
		email: String(coAuthor.email).trim(),
		type: "",
		scope: "",
		subject: "",
	});
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} coAuthor
 * @param {string} trailerTemplate
 */
export function messageHasCoAuthorTrailer(message, coAuthor, trailerTemplate) {
	const expected = renderCoAuthorTrailer(coAuthor, trailerTemplate)
		.trim()
		.toLowerCase();
	const normalized = message.replace(/\r\n/g, "\n").toLowerCase();
	return normalized.includes(expected);
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} config
 */
export function appendCoAuthorTrailer(message, config) {
	const coAuthor = /** @type {Record<string, unknown>} */ (config.coAuthor);
	const messageCfg = /** @type {Record<string, unknown>} */ (config.message);
	const trailerTemplate = String(
		messageCfg.coAuthorTrailer ?? DEFAULT_MESSAGE.coAuthorTrailer,
	);

	if (coAuthor.required === false) {
		return message;
	}

	const stripped = stripCoAuthorTrailers(message);
	if (messageHasCoAuthorTrailer(stripped, coAuthor, trailerTemplate)) {
		return stripped;
	}

	const trailer = renderCoAuthorTrailer(coAuthor, trailerTemplate);
	if (!stripped) {
		return trailer;
	}
	return `${stripped}\n\n${trailer}`;
}

/**
 * Build final commit message (subject/body + trailer).
 * @param {Record<string, unknown>} config
 * @param {{ type?: string, scope?: string, subject?: string, body?: string, message?: string }} input
 */
export function buildFullCommitMessage(config, input) {
	let core;
	if (input.message != null && String(input.message).trim()) {
		core = String(input.message).trim();
	} else if (input.subject != null && String(input.subject).trim()) {
		core = formatCommitMessage(config, {
			type: input.type,
			scope: input.scope,
			subject: String(input.subject),
			body: input.body,
		});
	} else {
		throw new Error(
			"auto-commit: provide --message or --subject for commit text",
		);
	}
	return appendCoAuthorTrailer(core, config);
}

/** @param {string} message */
export function splitSubjectAndBody(message) {
	const normalized = message.replace(/\r\n/g, "\n");
	const idx = normalized.indexOf("\n\n");
	if (idx === -1) {
		return { subject: normalized.trim(), body: "" };
	}
	return {
		subject: normalized.slice(0, idx).trim(),
		body: normalized.slice(idx + 2).trim(),
	};
}

export { DEFAULT_CO_AUTHOR, DEFAULT_MESSAGE, TEMPLATE_PLACEHOLDERS };
