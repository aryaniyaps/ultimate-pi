import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	normalizeHarnessYamlContent,
	parseStructuredDocument,
} from "../.pi/lib/harness-yaml.mjs";

describe("harness-yaml", () => {
	it("parses fenced JSON into YAML-shaped output", () => {
		const json = '```json\n{"schema_version":"1.0.0","ok":true}\n```';
		const out = normalizeHarnessYamlContent(json);
		assert.match(out, /^schema_version: 1\.0\.0/m);
		assert.match(out, /^ok: true/m);
		assert.doesNotMatch(out, /^\{/m);
	});

	it("parses raw JSON object", () => {
		const doc = parseStructuredDocument('{"a":1,"b":[2,3]}');
		assert.equal(doc.a, 1);
		assert.deepEqual(doc.b, [2, 3]);
	});

	it("parses native YAML", () => {
		const doc = parseStructuredDocument("foo: bar\nitems:\n  - one\n");
		assert.equal(doc.foo, "bar");
		assert.deepEqual(doc.items, ["one"]);
	});
});
