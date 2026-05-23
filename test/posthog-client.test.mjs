import assert from "node:assert/strict";
import test from "node:test";

test("isPostHogHostUrl matches ingest hosts", async () => {
	const { isPostHogHostUrl } = await import(
		"../.pi/extensions/lib/posthog-client.ts"
	);
	assert.equal(isPostHogHostUrl("https://us.i.posthog.com/batch/"), true);
	assert.equal(isPostHogHostUrl("https://eu.i.posthog.com/batch/"), true);
	assert.equal(isPostHogHostUrl("https://example.com/"), false);
});

test("createPostHogFetch reaches PostHog batch endpoint", async () => {
	const { createPostHogFetch } = await import(
		"../.pi/extensions/lib/posthog-client.ts"
	);
	const fetchPh = createPostHogFetch();
	const res = await fetchPh("https://us.i.posthog.com/batch/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: "{}",
	});
	assert.equal(res.status, 400);
});
