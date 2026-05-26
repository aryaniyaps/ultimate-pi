import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
	cacheEnabled,
	defaultCacheTtlSeconds,
	fingerprintFile,
	formatCacheAge,
	lookupSearchCache,
	publishWorkspaceAlias,
	searchCacheKey,
	writeSearchCacheEntry,
} from "../.pi/lib/harness-web/cache.ts";

describe("harness-web cache", () => {
	const dirs = [];

	afterEach(() => {
		for (const d of dirs) rmSync(d, { recursive: true, force: true });
		delete process.env.HARNESS_WEB_CACHE;
	});

	function tempProject() {
		const root = mkdtempSync(join(tmpdir(), "wrs-cache-"));
		dirs.push(root);
		return root;
	}

	it("builds stable search cache keys", () => {
		const a = searchCacheKey({
			query: "Foo",
			tier: "deep",
			engine: "ddg_html",
			limit: 10,
			anglesFingerprint: "abc",
		});
		const b = searchCacheKey({
			query: "foo",
			tier: "deep",
			engine: "ddg_html",
			limit: 10,
			anglesFingerprint: "abc",
		});
		assert.equal(a, b);
		assert.notEqual(
			a,
			searchCacheKey({
				query: "foo",
				tier: "standard",
				engine: "ddg_html",
				limit: 10,
			}),
		);
	});

	it("misses when cache entry missing", () => {
		const root = tempProject();
		const lookup = lookupSearchCache(root, {
			query: "test",
			tier: "deep",
			engine: "ddg_html",
			limit: 10,
		});
		assert.equal(lookup.hit, false);
	});

	it("hits after write and publishes workspace alias", () => {
		const root = tempProject();
		mkdirSync(join(root, ".web"), { recursive: true });
		const src = join(root, ".web", "search-deep.json");
		writeFileSync(src, '{"results":[]}\n', "utf-8");
		const ctx = {
			query: "rust async",
			tier: "deep",
			engine: "ddg_html",
			limit: 10,
		};
		writeSearchCacheEntry(root, ctx, ".web/search-deep.json");
		const lookup = lookupSearchCache(root, ctx);
		assert.equal(lookup.hit, true);
		assert.equal(lookup.stale, false);
		assert.ok(lookup.meta?.context?.query);
		const workspace = publishWorkspaceAlias(
			root,
			lookup.artifactPath,
			"search-deep.json",
		);
		assert.equal(workspace, ".web/search-deep.json");
	});

	it("respects cache disable env", () => {
		process.env.HARNESS_WEB_CACHE = "0";
		assert.equal(cacheEnabled(), false);
	});

	it("formats cache age", () => {
		assert.equal(formatCacheAge(45_000), "45s");
		assert.equal(formatCacheAge(120_000), "2m");
	});

	it("fingerprints angle files", () => {
		const root = tempProject();
		mkdirSync(join(root, ".web"), { recursive: true });
		writeFileSync(join(root, ".web", "angles.yaml"), "angles:\n", "utf-8");
		const fp = fingerprintFile(root, ".web/angles.yaml");
		assert.ok(fp && fp.length >= 8);
	});

	it("default ttl is 24h", () => {
		delete process.env.HARNESS_WEB_CACHE_TTL_SEC;
		assert.equal(defaultCacheTtlSeconds(), 86_400);
	});
});
