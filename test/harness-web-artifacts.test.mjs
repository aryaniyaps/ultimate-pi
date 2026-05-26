import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isScopedWebArtifactPath,
	resolveWebArtifactScope,
	resolveWebOutputPath,
	scopedWebArtifactPath,
} from "../.pi/lib/harness-web/artifacts.ts";

describe("harness-web artifacts", () => {
	it("uses shared workspace by default", () => {
		const prevIsolate = process.env.HARNESS_WEB_ISOLATE;
		delete process.env.HARNESS_WEB_ISOLATE;
		delete process.env.HARNESS_WEB_LEGACY_SCOPE;
		delete process.env.HARNESS_RUN_ID;
		try {
			const scope = resolveWebArtifactScope({
				projectRoot: "/tmp/proj",
				piSessionId: "sess-abc",
			});
			assert.equal(scope.artifactDir, ".web");
			assert.equal(scope.source, "workspace");
		} finally {
			if (prevIsolate === undefined) delete process.env.HARNESS_WEB_ISOLATE;
			else process.env.HARNESS_WEB_ISOLATE = prevIsolate;
		}
	});

	it("scopes by session when HARNESS_WEB_ISOLATE=1", () => {
		const prev = process.env.HARNESS_WEB_ISOLATE;
		process.env.HARNESS_WEB_ISOLATE = "1";
		delete process.env.HARNESS_RUN_ID;
		try {
			const scope = resolveWebArtifactScope({
				projectRoot: "/tmp/proj",
				piSessionId: "sess-abc",
			});
			assert.equal(scope.artifactDir, ".web/sessions/sess-abc");
			assert.equal(scope.source, "session");
		} finally {
			if (prev === undefined) delete process.env.HARNESS_WEB_ISOLATE;
			else process.env.HARNESS_WEB_ISOLATE = prev;
		}
	});

	it("scopes by harness run id when isolated", () => {
		const prevIsolate = process.env.HARNESS_WEB_ISOLATE;
		const prevRun = process.env.HARNESS_RUN_ID;
		process.env.HARNESS_WEB_ISOLATE = "1";
		process.env.HARNESS_RUN_ID = "run-xyz";
		try {
			const scope = resolveWebArtifactScope({
				projectRoot: "/tmp/proj",
				piSessionId: "sess-abc",
			});
			assert.equal(scope.artifactDir, ".web/runs/run-xyz");
			assert.equal(scope.source, "run");
		} finally {
			if (prevIsolate === undefined) delete process.env.HARNESS_WEB_ISOLATE;
			else process.env.HARNESS_WEB_ISOLATE = prevIsolate;
			if (prevRun === undefined) delete process.env.HARNESS_RUN_ID;
			else process.env.HARNESS_RUN_ID = prevRun;
		}
	});

	it("uses flat .web/answer.md in shared workspace", () => {
		delete process.env.HARNESS_WEB_ISOLATE;
		delete process.env.HARNESS_RUN_ID;
		const resolved = resolveWebOutputPath({
			projectRoot: "/tmp/proj",
			piSessionId: "sess-1",
			basename: "answer.md",
			explicitOutput: ".web/answer.md",
		});
		assert.equal(resolved.path, ".web/answer.md");
		assert.equal(resolved.artifactDir, ".web");
	});

	it("detects scoped paths", () => {
		assert.ok(isScopedWebArtifactPath(".web/runs/foo/answer.md"));
		assert.ok(!isScopedWebArtifactPath(".web/answer.md"));
	});

	it("scopedWebArtifactPath joins basename", () => {
		assert.equal(
			scopedWebArtifactPath(".web/sessions/x", "search-deep.json"),
			".web/sessions/x/search-deep.json",
		);
	});
});
