import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { parseGlimpseRawResult } from "../contracts/glimpse-parse.js";
import { buildGlimpsePayload } from "../contracts/glimpse-payload-build.js";
import type { DialogResult, ValidatedAskParams } from "../types.js";
import type { PresenterContext } from "./types.js";

function glimpsePackageJson(): string {
	const roots = [process.env.UP_PKG, process.cwd()].filter((r): r is string =>
		Boolean(r),
	);
	for (const root of roots) {
		const pkgJson = join(
			root,
			".pi/npm/node_modules/@alexleekt/pi-ask-user-glimpse/package.json",
		);
		try {
			return createRequire(pkgJson).resolve(
				"@alexleekt/pi-ask-user-glimpse/package.json",
			);
		} catch {
			// try next root
		}
	}
	throw new Error(
		"@alexleekt/pi-ask-user-glimpse not installed — run npm install in .pi/npm",
	);
}

const require = createRequire(glimpsePackageJson());

let warnedUnavailable = false;

function resolveWebviewHtml(): string {
	const pkgRoot = dirname(
		require.resolve("@alexleekt/pi-ask-user-glimpse/package.json"),
	);
	const distPath = join(pkgRoot, "dist", "index.html");
	const html = readFileSync(distPath, "utf-8");
	if (!html.includes("/*ASK_USER_PAYLOAD*/")) {
		throw new Error(
			"@alexleekt/pi-ask-user-glimpse dist/index.html missing ASK_USER_PAYLOAD placeholder",
		);
	}
	return html;
}

export function isGlimpseAvailable(): boolean {
	try {
		resolveWebviewHtml();
		require.resolve("glimpseui");
		return true;
	} catch {
		return false;
	}
}

function summarizeTitle(question: string, maxWords = 3): string {
	const words = question.trim().split(/\s+/).slice(0, maxWords);
	const title = words.join(" ");
	return title.length < question.length ? `${title}…` : title;
}

export async function runGlimpsePresenter(
	validated: ValidatedAskParams,
	ctx: PresenterContext,
): Promise<DialogResult> {
	const payload = buildGlimpsePayload(validated, ctx.sessionName);
	const baseHtml = resolveWebviewHtml();
	const html = baseHtml.replace(
		"/*ASK_USER_PAYLOAD*/",
		JSON.stringify(payload)
			.replace(/</g, "\\u003c")
			.replace(/>/g, "\\u003e")
			.replace(/&/g, "\\u0026"),
	);

	const sessionName = ctx.sessionName;
	const questionTitle = summarizeTitle(validated.question);
	const title = sessionName
		? `Pi · ${sessionName} · ${questionTitle}`
		: `Pi · ${questionTitle}`;

	const windowOptions = {
		width: 1200,
		height: 900,
		title: title.length > 60 ? `${title.slice(0, 57)}…` : title,
	};

	try {
		const { prompt } = await import("glimpseui");
		const raw = (await prompt(html, windowOptions)) as Record<
			string,
			unknown
		> | null;

		const explicitCancel = raw?.__cancelled === true;
		if (raw === null && !explicitCancel) {
			throw new Error(
				"glimpse prompt returned null without user cancel — degrade to TUI",
			);
		}

		const cancelled = raw === null || explicitCancel;
		const response = parseGlimpseRawResult(raw, cancelled);

		return {
			response,
			cancelled,
			ui_backend: "glimpse",
		};
	} catch (err) {
		if (!warnedUnavailable) {
			warnedUnavailable = true;
			console.warn(
				"[harness-ask-user] Glimpse unavailable:",
				err instanceof Error ? err.message : err,
			);
		}
		throw err;
	}
}

/** Probe glimpse without opening a dialog. */
export function glimpseHealthCheck(): { ok: boolean; error?: string } {
	try {
		resolveWebviewHtml();
		require.resolve("glimpseui");
		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : String(e),
		};
	}
}
