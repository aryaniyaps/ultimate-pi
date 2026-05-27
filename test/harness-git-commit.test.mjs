import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	resolveAutoCommitConfig,
	formatCommitMessage,
	appendCoAuthorTrailer,
	buildFullCommitMessage,
	stripCoAuthorTrailers,
	deepMerge,
	validateAutoCommitConfig,
} from "../.pi/lib/harness-auto-commit-config.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("deepMerge replaces scalars and merges objects", () => {
	const merged = deepMerge(
		{ coAuthor: { login: "a", email: "a@x.com" }, message: { scopeDefault: "pkg" } },
		{ coAuthor: { login: "b" } },
	);
	assert.equal(merged.coAuthor.login, "b");
	assert.equal(merged.coAuthor.email, "a@x.com");
	assert.equal(merged.message.scopeDefault, "pkg");
});

test("resolveAutoCommitConfig merges project over package", async () => {
	const tmp = await mkdtemp(join(tmpdir(), "harness-ac-"));
	await mkdir(join(tmp, ".pi"), { recursive: true });
	await writeFile(
		join(tmp, ".pi", "auto-commit.json"),
		JSON.stringify({
			coAuthor: { login: "custom-bot", email: "bot@users.noreply.github.com" },
			message: { scopeDefault: "my-app" },
		}),
		"utf-8",
	);
	const config = await resolveAutoCommitConfig(tmp, REPO_ROOT);
	assert.equal(config.coAuthor.login, "custom-bot");
	assert.equal(config.message.scopeDefault, "my-app");
	assert.equal(config.message.template, "{type}({scope}): {subject}");
});

test("validateAutoCommitConfig rejects missing coAuthor email", () => {
	assert.throws(
		() =>
			validateAutoCommitConfig({
				coAuthor: { login: "x" },
				message: {
					template: "{type}: {subject}",
					coAuthorTrailer: "Co-authored-by: {login} <{email}>",
				},
			}),
		/coAuthor.email/,
	);
});

test("formatCommitMessage uses templateNoScope when scope empty", async () => {
	const config = await resolveAutoCommitConfig(REPO_ROOT, REPO_ROOT);
	const msg = formatCommitMessage(config, {
		type: "fix",
		scope: "",
		subject: "handle edge case",
	});
	assert.equal(msg, "fix: handle edge case");
});

test("formatCommitMessage with scope uses template", async () => {
	const config = await resolveAutoCommitConfig(REPO_ROOT, REPO_ROOT);
	const msg = formatCommitMessage(config, {
		type: "feat",
		scope: "api",
		subject: "add endpoint",
	});
	assert.equal(msg, "feat(api): add endpoint");
});

test("appendCoAuthorTrailer is idempotent", async () => {
	const config = await resolveAutoCommitConfig(REPO_ROOT, REPO_ROOT);
	const once = appendCoAuthorTrailer("chore: init", config);
	const twice = appendCoAuthorTrailer(once, config);
	assert.equal(once, twice);
	assert.match(once, /Co-authored-by: pi-mono </i);
});

test("stripCoAuthorTrailers removes trailing co-author lines", () => {
	const raw = "feat: x\n\nbody\n\nCo-authored-by: A <a@b.com>";
	assert.equal(stripCoAuthorTrailers(raw), "feat: x\n\nbody");
});

test("buildFullCommitMessage --message wins over subject", async () => {
	const config = await resolveAutoCommitConfig(REPO_ROOT, REPO_ROOT);
	const msg = buildFullCommitMessage(config, {
		message: "custom: full line",
		subject: "ignored",
	});
	assert.match(msg, /^custom: full line/);
	assert.match(msg, /Co-authored-by: pi-mono </i);
});

test("buildFullCommitMessage requires message or subject", async () => {
	const config = await resolveAutoCommitConfig(REPO_ROOT, REPO_ROOT);
	assert.throws(
		() => buildFullCommitMessage(config, {}),
		/--message or --subject/,
	);
});
