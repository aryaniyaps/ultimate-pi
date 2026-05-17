#!/usr/bin/env node
/**
 * Generate `.pi/model-router.json` from Pi's authenticated providers (auth.json + env),
 * not from raw env-var heuristics alone.
 *
 * Uses @earendil-works/pi-coding-agent ModelRegistry.getAvailable() — same source as /login.
 *
 * Usage: node harness-generate-model-router.mjs [--force] [--dry-run]
 *   --force    overwrite existing .pi/model-router.json
 *   --dry-run  print JSON to stdout, do not write
 *
 * Requires @earendil-works/pi-coding-agent (peer of ultimate-pi; bundled with pi).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const UP_PKG = join(SCRIPT_DIR, "..", "..");
const OUT_PATH = join(process.cwd(), ".pi", "model-router.json");

const PROVIDER_PRIORITY = [
	"opencode-go",
	"anthropic",
	"openai",
	"google",
	"openrouter",
	"groq",
	"mistral",
	"amazon",
];

/** Substring hints per tier (first match in available ids wins). */
const TIER_HINTS = {
	high: [
		"deepseek-v4-pro",
		"gpt-5.4-pro",
		"claude-opus",
		"sonnet-4",
		"gemini-2.5-pro",
		"pro",
	],
	medium: [
		"qwen3.6-plus",
		"kimi-k2.6",
		"gpt-5.4",
		"claude-sonnet",
		"gemini-flash",
		"plus",
	],
	low: [
		"deepseek-v4-flash",
		"gpt-5.4-nano",
		"haiku",
		"flash-lite",
		"flash",
		"mini",
	],
};

function fail(msg) {
	console.error(`harness-generate-model-router: ${msg}`);
	process.exit(1);
}

async function loadPiCodingAgent() {
	const scopes = ["@earendil-works", "@mariozechner"];
	const agentRoots = scopes.flatMap((scope) => [
		join(UP_PKG, "node_modules", scope, "pi-coding-agent"),
		join(UP_PKG, ".pi", "npm", "node_modules", scope, "pi-coding-agent"),
	]);
	for (const root of agentRoots) {
		const entry = join(root, "dist", "index.js");
		if (existsSync(entry)) {
			return import(pathToFileURL(entry).href);
		}
	}
	for (const spec of ["@earendil-works/pi-coding-agent", "@mariozechner/pi-coding-agent"]) {
		for (const base of [UP_PKG, process.cwd()]) {
			try {
				const req = createRequire(join(base, "package.json"));
				return req(spec);
			} catch {
				/* try next */
			}
		}
	}
	fail(
		"@earendil-works/pi-coding-agent not found (install pi or npm i in ultimate-pi). Peer: @earendil-works/pi-coding-agent",
	);
}

function canonicalRef(provider, modelId) {
	return `${provider}/${modelId}`;
}

function pickTierModel(models, tier) {
	const hints = TIER_HINTS[tier];
	const ids = models.map((m) => m.id);
	for (const hint of hints) {
		const match = models.find((m) => m.id.includes(hint));
		if (match) return canonicalRef(match.provider, match.id);
	}
	if (models.length === 0) return null;
	if (tier === "high") {
		const reasoning = models.find((m) => m.reasoning);
		if (reasoning) return canonicalRef(reasoning.provider, reasoning.id);
	}
	if (tier === "low") {
		return canonicalRef(models[models.length - 1].provider, models[models.length - 1].id);
	}
	return canonicalRef(models[0].provider, models[0].id);
}

function choosePrimaryProvider(available) {
	const byProvider = new Map();
	for (const m of available) {
		if (!byProvider.has(m.provider)) byProvider.set(m.provider, []);
		byProvider.get(m.provider).push(m);
	}
	for (const p of PROVIDER_PRIORITY) {
		if (byProvider.has(p)) return { provider: p, models: byProvider.get(p) };
	}
	const first = [...byProvider.keys()].sort()[0];
	return { provider: first, models: byProvider.get(first) ?? [] };
}

function buildFallbacks(available, primaryProvider, highModel) {
	const fallbacks = [];
	for (const p of ["anthropic", "google", "openai"]) {
		if (p === primaryProvider) continue;
		const alt = available.filter((m) => m.provider === p);
		if (alt.length === 0) continue;
		const ref = pickTierModel(alt, "medium");
		if (ref && ref !== highModel) fallbacks.push(ref);
	}
	return fallbacks.slice(0, 3);
}

async function main() {
	const force = process.argv.includes("--force");
	const dryRun = process.argv.includes("--dry-run");

	if (existsSync(OUT_PATH) && !force) {
		console.log(
			"✓ .pi/model-router.json already exists — preserving (use --force to regenerate)",
		);
		process.exit(0);
	}

	const { AuthStorage, ModelRegistry } = await loadPiCodingAgent();
	const authStorage = AuthStorage.create();
	const modelRegistry = ModelRegistry.create(authStorage);
	const available = await modelRegistry.getAvailable();

	if (available.length === 0) {
		console.log(
			"✗ No authenticated Pi providers — skip model-router.json",
		);
		console.log(
			"  Log in inside pi: /login (or set API keys in ~/.pi/agent/auth.json)",
		);
		const providers = authStorage.list();
		if (providers.length > 0) {
			console.log(
				`  Stored providers in auth.json (may need refresh): ${providers.join(", ")}`,
			);
		}
		process.exit(0);
	}

	const { provider: primaryProvider, models: primaryModels } =
		choosePrimaryProvider(available);

	const highModel = pickTierModel(primaryModels, "high");
	const mediumModel = pickTierModel(primaryModels, "medium");
	const lowModel = pickTierModel(primaryModels, "low");

	if (!highModel || !mediumModel || !lowModel) {
		fail("could not assign tier models from available registry");
	}

	const fallbacks = buildFallbacks(available, primaryProvider, highModel);

	const config = {
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

	const json = `${JSON.stringify(config, null, 2)}\n`;
	const providerSet = [...new Set(available.map((m) => m.provider))].sort();

	if (dryRun) {
		process.stdout.write(json);
		process.exit(0);
	}

	mkdirSync(dirname(OUT_PATH), { recursive: true });
	writeFileSync(OUT_PATH, json, "utf8");

	console.log("✓ Generated .pi/model-router.json from Pi authenticated providers:");
	console.log(`  Primary provider: ${primaryProvider}`);
	console.log(`  Authenticated providers: ${providerSet.join(", ")}`);
	console.log(`  Available models: ${available.length}`);
	console.log(`  High tier: ${highModel}`);
	console.log(`  Medium tier: ${mediumModel}`);
	console.log(`  Low tier: ${lowModel}`);
	if (fallbacks.length) console.log(`  Fallbacks: ${fallbacks.join(", ")}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
