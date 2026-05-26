#!/usr/bin/env node
/**
 * harness-verify — deterministic harness contract checks (no LLM).
 */

import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SPECS = join(ROOT, ".pi", "harness", "specs");
const SMOKE = join(ROOT, ".pi", "harness", "evals", "smoke");
const ADRS = join(ROOT, ".pi", "harness", "docs", "adrs");

const REQUIRED_SCHEMAS = [
	"harness-run-record.schema.json",
	"harness-run-context.schema.json",
	"harness-posthog-event.schema.json",
	"observation.schema.json",
	"run-trace.schema.json",
	"eval-verdict.schema.json",
	"harness-spawn-context.schema.json",
	"harness-turn.schema.json",
	"sentrux-manifest-proposal.schema.json",
	"sentrux-signal.schema.json",
];

const REQUIRED_ADRS = [
	"0001-harness-constitution.md",
	"0002-harness-run-record.md",
	"0003-eval-promotion-gates.md",
	"0004-defer-ci-agent-smoke.md",
	"0005-defer-posthog-analyst.md",
	"0006-sentrux-dual-layer.md",
	"0007-interactive-drift-monitor.md",
	"0008-harness-posthog-telemetry.md",
	"0009-sentrux-rules-lifecycle.md",
	"0031-harness-run-context.md",
	"0032-harness-command-orchestration.md",
	"0037-subagent-submit-tools.md",
	"0038-budget-telemetry-only.md",
	"0040-practice-grounded-orchestration.md",
	"0045-harness-lens-minimal-contract.md",
	"0046-agt-policy-engine.md",
	"0047-agt-layered-security.md",
	"0048-tool-call-hook-order.md",
];

const REQUIRED_EXTENSIONS = [
	"harness-telemetry.ts",
	"harness-run-context.ts",
	"trace-recorder.ts",
	"observation-bus.ts",
	"drift-monitor.ts",
	"sentrux-rules-sync.ts",
	"harness-subagents.ts",
];

const AGENTS_MANIFEST = join(ROOT, ".pi", "harness", "agents.manifest.json");

const SENTRUX_MANIFEST = join(
	ROOT,
	".pi",
	"harness",
	"sentrux",
	"architecture.manifest.json",
);
const SENTRUX_RULES = join(ROOT, ".sentrux", "rules.toml");

function fail(msg) {
	console.error(`harness:verify FAIL: ${msg}`);
	process.exit(1);
}

function ok(msg) {
	console.log(`  ✓ ${msg}`);
}

async function fileExists(path) {
	try {
		await access(path, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

function validateRunRecordFixture(data) {
	const required = [
		"schema_version",
		"run_id",
		"plan_id",
		"started_at",
		"ended_at",
		"duration_ms",
		"cost",
	];
	for (const key of required) {
		if (!(key in data)) fail(`run-record fixture missing ${key}`);
	}
	if (data.schema_version !== "1.0.0") {
		fail("run-record fixture schema_version must be 1.0.0");
	}
}

function validateTestDiffGolden(data) {
	if (!Array.isArray(data.cases)) fail("test-diff-golden missing cases array");
	for (const c of data.cases) {
		if (!c.id || !c.file_path) fail(`test-diff case missing id or file_path`);
	}
}

async function runNodeScript(scriptPath, args = []) {
	return new Promise((resolve) => {
		const child = spawn(process.execPath, [scriptPath, ...args], {
			cwd: ROOT,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let out = "";
		child.stdout?.on("data", (d) => {
			out += d.toString();
		});
		child.stderr?.on("data", (d) => {
			out += d.toString();
		});
		child.on("close", (code) => resolve({ code: code ?? 1, out }));
	});
}

async function checkSentruxRules() {
	if (!(await fileExists(SENTRUX_MANIFEST))) {
		fail("missing .pi/harness/sentrux/architecture.manifest.json");
	}
	ok("sentrux architecture.manifest.json");

	const syncScript = join(ROOT, ".pi", "scripts", "sentrux-rules-sync.mjs");
	const { code: checkCode, out: checkOut } = await runNodeScript(syncScript, [
		"--check",
	]);
	if (checkCode !== 0) {
		fail(checkOut.trim() || "sentrux rules.toml out of date — run node \"$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs\" --force (see .pi/scripts/README.md for UP_PKG)");
	}
	ok("sentrux rules.toml in sync with manifest");

	if (!(await fileExists(SENTRUX_RULES))) {
		fail(
			"missing .sentrux/rules.toml — run node \"$UP_PKG/.pi/scripts/sentrux-rules-sync.mjs\" --force (resolve UP_PKG via .pi/scripts/README.md)",
		);
	}
	ok(".sentrux/rules.toml present");
}

async function checkHarnessLens(pkgJson) {
	if (!pkgJson.files?.includes(".pi/lib/harness-lens")) {
		fail(
			'package.json "files" must include .pi/lib/harness-lens (npm publish ships harness lens extension)',
		);
	}
	ok('package.json files includes .pi/lib/harness-lens');

	const piExtensions = pkgJson.pi?.extensions ?? [];
	if (!piExtensions.includes("./.pi/extensions")) {
		fail('package.json pi.extensions must include ./.pi/extensions');
	}
	if (piExtensions.includes("./vendor/pi-lens/index.ts")) {
		fail('package.json pi.extensions must not load vendor/pi-lens directly');
	}
	ok("package.json loads harness extension directory");

	const harnessLens = join(ROOT, ".pi", "extensions", "harness-lens.ts");
	if (!(await fileExists(harnessLens))) fail("missing .pi/extensions/harness-lens.ts");
	ok("harness lens extension wrapper");

	const lensIndex = join(ROOT, ".pi", "lib", "harness-lens", "index.ts");
	if (!(await fileExists(lensIndex))) {
		fail("missing .pi/lib/harness-lens/index.ts");
	}
	ok(".pi/lib/harness-lens/index.ts");

	const legacyExtLib = join(ROOT, ".pi", "extensions", "lib");
	if (await fileExists(legacyExtLib)) {
		fail(".pi/extensions/lib must not exist (shared code lives in .pi/lib/)");
	}
	ok("no legacy .pi/extensions/lib directory");

	const lensIndexSource = await readFile(lensIndex, "utf8");
	if (lensIndexSource.includes("ast_grep_search")) {
		fail("harness-lens index must not register ast_grep_search");
	}
	if (lensIndexSource.includes("lib/lens")) {
		fail("harness-lens index must not import lib/lens");
	}
	ok("harness-lens index contract (no ast_grep, no lib/lens imports)");

	const rulesDir = join(ROOT, ".pi", "lib", "harness-lens", "rules");
	if (await fileExists(rulesDir)) {
		fail("harness-lens bundled rules/ directory must not exist");
	}
	ok("no bundled harness-lens rules/ directory");

	const upstreamPin = join(ROOT, ".pi", "lib", "harness-lens", "UPSTREAM_PIN.md");
	if (await fileExists(upstreamPin)) {
		fail("harness-lens UPSTREAM_PIN.md must not exist (harness-native, no upstream sync)");
	}
	ok("no harness-lens UPSTREAM_PIN.md");
}

async function checkSentruxGate() {
	await checkSentruxRules();

	if (process.env.HARNESS_SENTRUX_REQUIRED !== "true") {
		ok("Sentrux MCP stub gate skipped (HARNESS_SENTRUX_REQUIRED not set)");
		return;
	}
	const runDir = process.env.HARNESS_RUN_DIR?.trim();
	const runSignalPath = runDir
		? join(runDir, "artifacts", "sentrux-signal.yaml")
		: null;
	if (runSignalPath && (await fileExists(runSignalPath))) {
		ok(`Sentrux run signal present (${runSignalPath})`);
	} else {
		const stubPath = join(ROOT, ".pi", "harness", "evals", "smoke", "sentrux-stub.json");
		if (!(await fileExists(stubPath))) {
			fail(
				"HARNESS_SENTRUX_REQUIRED=true but no artifacts/sentrux-signal.yaml (set HARNESS_RUN_DIR) and .pi/harness/evals/smoke/sentrux-stub.json missing",
			);
		}
		ok("Sentrux stub present (run signal absent — prefer artifacts/sentrux-signal.yaml from /harness-run)");
	}

	const { code, out } = await runNodeScript(
		join(ROOT, ".pi", "scripts", "sentrux-rules-sync.mjs"),
		["--force", "--strict"],
	);
	if (code === 127 || (out && out.includes("not installed"))) {
		ok("sentrux CLI check skipped (not installed)");
		return;
	}
	if (code !== 0) {
		fail(out.trim() || "sentrux check failed — fix violations or update manifest");
	}
	ok("sentrux check passed");
}

async function main() {
	console.log("harness:verify\n");

	for (const name of REQUIRED_SCHEMAS) {
		const path = join(SPECS, name);
		if (!(await fileExists(path))) fail(`missing schema ${name}`);
		JSON.parse(await readFile(path, "utf-8"));
		ok(`schema ${name}`);
	}

	for (const name of REQUIRED_ADRS) {
		const path = join(ADRS, name);
		if (!(await fileExists(path))) fail(`missing ADR ${name}`);
		ok(`ADR ${name}`);
	}

	for (const name of REQUIRED_EXTENSIONS) {
		const path = join(ROOT, ".pi", "extensions", name);
		if (!(await fileExists(path))) fail(`missing extension ${name}`);
		ok(`extension ${name}`);
	}

	const libPath = join(ROOT, ".pi", "lib", "harness-posthog.ts");
	if (!(await fileExists(libPath))) fail("missing lib/harness-posthog.ts");
	ok("lib/harness-posthog.ts");

	const runCtxLib = join(ROOT, ".pi", "lib", "harness-run-context.ts");
	if (!(await fileExists(runCtxLib))) fail("missing lib/harness-run-context.ts");
	ok("lib/harness-run-context.ts");

	const pkgJson = JSON.parse(
		await readFile(join(ROOT, "package.json"), "utf-8"),
	);
	await checkHarnessLens(pkgJson);

	if (!pkgJson.files?.includes("vendor/pi-subagents")) {
		fail(
			'package.json "files" must include vendor/pi-subagents (npm publish ships subagents vendor)',
		);
	}
	ok('package.json files includes vendor/pi-subagents');

	const subagentsVendor = join(
		ROOT,
		"vendor",
		"pi-subagents",
		"src",
		"subagents.ts",
	);
	if (!(await fileExists(subagentsVendor))) {
		fail("missing vendor/pi-subagents/src/subagents.ts");
	}
	const bridgePath = join(ROOT, ".pi", "lib", "harness-subagents-bridge.ts");
	if (!(await fileExists(bridgePath))) {
		fail("missing harness-subagents-bridge.ts");
	}
	const bridgeSrc = await readFile(bridgePath, "utf-8");
	if (!bridgeSrc.includes("precheckHarnessSubagentSpawn")) {
		fail("harness-subagents-bridge must run precheckHarnessSubagentSpawn");
	}
	if (!bridgeSrc.includes("packageRoot")) {
		fail("harness-subagents-bridge must pass packageRoot for agent discovery");
	}
	if (
		!bridgeSrc.includes("subprocessGovernanceExtensionPath") &&
		!bridgeSrc.includes("subagentGovernanceExtensionPath")
	) {
		fail(
			"harness-subagents-bridge must set subprocessGovernanceExtensionPath for all subagents",
		);
	}
	const subagentsSrc = await readFile(subagentsVendor, "utf-8");
	if (!subagentsSrc.includes("discoverAgents")) {
		fail("vendor subagents.ts must implement discoverAgents");
	}
	if (!subagentsSrc.includes("packageRoot")) {
		fail("vendor subagents.ts must pass packageRoot into discovery");
	}
	ok("vendor pi-subagents + harness bridge");

	const policyGateSrc = await readFile(
		join(ROOT, ".pi", "extensions", "policy-gate.ts"),
		"utf-8",
	);
	if (!policyGateSrc.includes("isPlanPhaseAllowedMutation")) {
		fail(
			"policy-gate.ts must use isPlanPhaseAllowedMutation (plan-phase scoped writes)",
		);
	}
	if (!policyGateSrc.includes('pi.on("tool_call", async (event, ctx)')) {
		fail("policy-gate tool_call must receive ctx for run context");
	}
	if (!policyGateSrc.includes("evaluateAgtHarnessToolCall")) {
		fail("policy-gate.ts must delegate tool_call to AGT evaluateAgtHarnessToolCall");
	}
	const govPath = join(ROOT, ".pi", "extensions", "subagent-governance.ts");
	const govAlias = join(
		ROOT,
		".pi",
		"extensions",
		"harness-subagent-governance.ts",
	);
	if (!(await fileExists(govPath))) {
		fail("missing subagent-governance.ts subprocess bundle");
	}
	if (!(await fileExists(govAlias))) {
		fail("missing harness-subagent-governance.ts re-export alias");
	}
	ok("policy-gate + subprocess governance");

	const agtDoctorPath = join(ROOT, ".pi", "scripts", "harness-agt-doctor.ts");
	const { code: agtDoctorCode, out: agtDoctorOut } = await new Promise(
		(resolve) => {
			const child = spawn(
				"npx",
				["-y", "tsx", agtDoctorPath],
				{ cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], shell: true },
			);
			let out = "";
			child.stdout?.on("data", (d) => {
				out += d.toString();
			});
			child.stderr?.on("data", (d) => {
				out += d.toString();
			});
			child.on("close", (code) => resolve({ code: code ?? 1, out }));
		},
	);
	if (agtDoctorCode !== 0) {
		fail(agtDoctorOut.trim() || "AGT policy doctor failed");
	}
	ok("AGT policy doctor");

	const runCtxFixture = join(SMOKE, "run-context.fixture.json");
	if (!(await fileExists(runCtxFixture))) {
		fail("missing run-context.fixture.json");
	}
	const runCtxData = JSON.parse(await readFile(runCtxFixture, "utf-8"));
	if (runCtxData.schema_version !== "1.0.0") {
		fail("run-context fixture schema_version must be 1.0.0");
	}
	if (!runCtxData.run_id) fail("run-context fixture missing run_id");
	ok("run-context.fixture.json");

	const fixture = JSON.parse(
		await readFile(join(SMOKE, "run-record.fixture.json"), "utf-8"),
	);
	validateRunRecordFixture(fixture);
	ok("run-record.fixture.json");

	const golden = JSON.parse(
		await readFile(join(SMOKE, "test-diff-golden.json"), "utf-8"),
	);
	validateTestDiffGolden(golden);
	ok("test-diff-golden.json");

	await checkSentruxGate();

	const AGENTS_POLICY = join(ROOT, ".pi", "harness", "agents.policy.yaml");
	if (!(await fileExists(AGENTS_POLICY))) {
		fail("missing .pi/harness/agents.policy.yaml");
	}
	ok("agents.policy.yaml present");

	if (!(await fileExists(AGENTS_MANIFEST))) {
		fail(
			"missing .pi/harness/agents.manifest.json — run node \"$UP_PKG/.pi/scripts/harness-agents-manifest.mjs\" --write",
		);
	}
	ok("agents.manifest.json present");

	const { code: manifestCode, out: manifestOut } = await runNodeScript(
		join(ROOT, ".pi", "scripts", "harness-agents-manifest.mjs"),
		["--check"],
	);
	if (manifestCode !== 0) {
		fail(manifestOut.trim() || "agents.manifest.json drift — regenerate with --write");
	}
	ok("agents.manifest.json in sync");

	await checkWrsContracts();

	console.log("\nharness:verify PASS");
}

async function checkWrsContracts() {
	const systemMd = join(ROOT, ".pi", "SYSTEM.md");
	const toolsTs = join(ROOT, ".pi", "extensions", "harness-web-tools.ts");
	const runCli = join(ROOT, ".pi", "lib", "harness-web", "run-cli.ts");
	const webRetrievalSkill = join(ROOT, ".agents", "skills", "web-retrieval", "SKILL.md");
	const adr = join(
		ROOT,
		".pi",
		"harness",
		"docs",
		"adrs",
		"0050-agentic-web-retrieval-stack.md",
	);

	for (const p of [systemMd, toolsTs, runCli, webRetrievalSkill, adr]) {
		if (!(await fileExists(p))) fail(`WRS contract missing file: ${p}`);
	}

	const sys = await readFile(systemMd, "utf-8");
	if (!sys.includes("tier=deep") && !sys.includes('tier: "deep"')) {
		fail("SYSTEM.md must document deep tier default for WRS");
	}
	if (!sys.includes("web-retrieval")) {
		fail("SYSTEM.md must reference web-retrieval skill");
	}
	if (!sys.includes(".web/cache") && !sys.includes("HARNESS_WEB_CACHE")) {
		fail("SYSTEM.md must document pooled WRS cache under .web/cache/");
	}

	const tools = await readFile(toolsTs, "utf-8");
	if (!tools.includes('Literal("deep")')) {
		fail("harness-web-tools.ts must define tier enum including deep");
	}
	if (!tools.includes("anglesFile")) {
		fail("harness-web-tools.ts must expose anglesFile on web_search");
	}

	const cli = await readFile(runCli, "utf-8");
	if (!cli.includes("tier=deep")) {
		fail("run-cli.ts harnessWebContextLine must mention tier=deep");
	}

	const artifactsTs = join(ROOT, ".pi", "lib", "harness-web", "artifacts.ts");
	if (!(await fileExists(artifactsTs))) {
		fail("missing harness-web/artifacts.ts for scoped .web paths");
	}
	const cacheTs = join(ROOT, ".pi", "lib", "harness-web", "cache.ts");
	if (!(await fileExists(cacheTs))) {
		fail("missing harness-web/cache.ts for pooled .web/cache/");
	}
	if (!tools.includes("refreshCache") || !tools.includes("lookupSearchCache")) {
		fail("harness-web-tools.ts must implement pooled cache (refreshCache, lookupSearchCache)");
	}
	const heuristicYaml = join(ROOT, ".pi", "harness", "web-heuristic-angles.yaml");
	if (!(await fileExists(heuristicYaml))) {
		fail("missing .pi/harness/web-heuristic-angles.yaml");
	}
	const heuristicPy = join(ROOT, ".pi", "scripts", "harness_web", "heuristic_config.py");
	if (!(await fileExists(heuristicPy))) {
		fail("missing harness_web/heuristic_config.py");
	}

	const rankPy = join(ROOT, ".pi", "scripts", "harness_web", "rank.py");
	const anglesPy = join(ROOT, ".pi", "scripts", "harness_web", "deep_search.py");
	for (const p of [rankPy, anglesPy]) {
		if (!(await fileExists(p))) fail(`WRS python module missing: ${p}`);
	}

	const expander = join(ROOT, ".pi", "agents", "harness", "web-retrieval", "web-query-expander.md");
	if (!(await fileExists(expander))) {
		fail("missing web-query-expander agent");
	}

	ok("WRS contracts (SYSTEM.md, tools, modules, web-retrieval skill, ADR)");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
