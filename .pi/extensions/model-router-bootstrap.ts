/**
 * Ensures .pi/model-router.json exists before pi-model-router reads config at
 * extension init (which otherwise falls back to openai/gpt-5.4-pro).
 *
 * Runs synchronously in the extension factory so dotenv-loader can run first
 * (alphabetically: dotenv-loader < model-router-bootstrap < sentrux / router pkg).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const ROUTER_PATH = ".pi/model-router.json";

function model(prefix: string, name: string): string {
	return `${prefix}/${name}`;
}

function buildRouterConfig(): Record<string, unknown> | null {
	const hasOpenCode = process.env.OPENAI_API_BASE?.includes("opencode.ai");
	const hasOpenAI = !!process.env.OPENAI_API_KEY;
	const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
	const hasGoogle = !!process.env.GOOGLE_API_KEY;

	if (!hasOpenCode && !hasOpenAI && !hasAnthropic && !hasGoogle) {
		return null;
	}

	const highModel = hasOpenCode
		? model("opencode-go", "deepseek-v4-pro")
		: hasAnthropic
			? "anthropic/claude-sonnet-4-20250514"
			: hasGoogle
				? "google/gemini-2.5-flash-001"
				: hasOpenAI
					? model("openai", "gpt-4o")
					: null;

	const mediumModel = hasOpenCode
		? model("opencode-go", "qwen3.6-plus")
		: hasAnthropic
			? "anthropic/claude-sonnet-4-20250514"
			: hasGoogle
				? "google/gemini-flash-latest"
				: hasOpenAI
					? model("openai", "gpt-4o-mini")
					: null;

	const lowModel = hasOpenCode
		? model("opencode-go", "deepseek-v4-flash")
		: hasAnthropic
			? "anthropic/claude-3-5-haiku-20241022"
			: hasGoogle
				? "google/gemini-flash-lite-latest"
				: hasOpenAI
					? model("openai", "gpt-4o-mini")
					: null;

	if (!highModel || !mediumModel || !lowModel) {
		return null;
	}

	const fallbacks: string[] = [];
	if (hasAnthropic && !highModel.startsWith("anthropic/")) {
		fallbacks.push("anthropic/claude-sonnet-4-20250514");
	}
	if (hasGoogle && !highModel.startsWith("google/")) {
		fallbacks.push("google/gemini-flash-latest");
	}

	return {
		defaultProfile: "auto",
		debug: false,
		classifierModel: mediumModel,
		phaseBias: 0.5,
		maxSessionBudget: 1.0,
		largeContextThreshold: 100000,
		rules: [
			{
				matches: ["deploy", "production", "release"],
				tier: "high",
				reason: "Safety check for production tasks",
			},
			{ matches: "changelog", tier: "low" },
		],
		profiles: {
			auto: {
				high: { model: highModel, thinking: "high", fallbacks },
				medium: { model: mediumModel, thinking: "medium" },
				low: { model: lowModel, thinking: "low" },
			},
			cheap: {
				high: { model: mediumModel, thinking: "low" },
				medium: { model: lowModel, thinking: "off" },
				low: { model: lowModel, thinking: "off" },
			},
			deep: {
				high: { model: highModel, thinking: "xhigh", fallbacks },
				medium: { model: mediumModel, thinking: "medium" },
				low: { model: lowModel, thinking: "low" },
			},
		},
	};
}

function ensureModelRouterConfig(cwd: string): boolean {
	const projectPath = join(cwd, ROUTER_PATH);
	// #region agent log
	fetch("http://127.0.0.1:7928/ingest/a5d40896-34cb-4f12-97db-df7ada0b22f0", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Debug-Session-Id": "7737a8",
		},
		body: JSON.stringify({
			sessionId: "7737a8",
			hypothesisId: "A",
			location: "model-router-bootstrap.ts:ensure",
			message: "router bootstrap check",
			data: {
				projectPath,
				exists: existsSync(projectPath),
				hasOpenCode: !!process.env.OPENAI_API_BASE?.includes("opencode.ai"),
				hasOpenAI: !!process.env.OPENAI_API_KEY,
			},
			timestamp: Date.now(),
		}),
	}).catch(() => {});
	// #endregion

	if (existsSync(projectPath)) {
		return false;
	}

	const config = buildRouterConfig();
	if (!config) {
		return false;
	}

	mkdirSync(join(cwd, ".pi"), { recursive: true });
	writeFileSync(projectPath, `${JSON.stringify(config, null, 2)}\n`);

	// #region agent log
	fetch("http://127.0.0.1:7928/ingest/a5d40896-34cb-4f12-97db-df7ada0b22f0", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Debug-Session-Id": "7737a8",
		},
		body: JSON.stringify({
			sessionId: "7737a8",
			hypothesisId: "A",
			location: "model-router-bootstrap.ts:write",
			message: "wrote model-router.json",
			data: {
				high: (config.profiles as { auto: { high: { model: string } } }).auto
					.high.model,
			},
			timestamp: Date.now(),
		}),
	}).catch(() => {});
	// #endregion

	return true;
}

export default function modelRouterBootstrap(_pi: ExtensionAPI) {
	const wrote = ensureModelRouterConfig(process.cwd());
	if (wrote) {
		console.warn(
			"[ultimate-pi] Created .pi/model-router.json from detected providers (avoids gpt-5.4-pro fallback). Run /reload if router was already loaded.",
		);
	}
}
