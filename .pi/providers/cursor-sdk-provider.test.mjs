import assert from "node:assert/strict";
import test from "node:test";
import cursorSdkProvider, { __setCursorAgentFactoryForTests } from "../../.tmp-test/cursor-sdk-provider.mjs";

function makeFakeAgent(events, runResult = { status: "finished" }, capture = undefined) {
	let cancelled = false;
	return {
		async send(promptText) {
			if (capture) capture.promptText = promptText;
			return {
				stream: async function* () {
					for (const event of events) {
						if (cancelled) break;
						yield event;
					}
				},
				wait: async () => (cancelled ? { status: "cancelled" } : runResult),
				cancel: async () => {
					cancelled = true;
				},
			};
		},
		close() {},
	};
}

function makeModelAndContext() {
	const model = {
		id: "gpt-5.3-codex",
		api: "cursor-sdk",
		provider: "cursor",
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	};
	const context = {
		systemPrompt: "You are a test assistant.",
		messages: [{ role: "user", content: "hello", timestamp: Date.now() }],
		tools: [{ name: "Shell", description: "Run shell", parameters: { type: "object" } }],
	};
	return { model, context };
}

function getStreamSimple() {
	let streamSimple;
	const pi = {
		registerProvider: (_name, cfg) => {
			streamSimple = cfg.streamSimple;
		},
	};
	cursorSdkProvider(pi);
	assert.ok(streamSimple, "provider should register streamSimple");
	return streamSimple;
}

async function collectEvents(stream) {
	const events = [];
	for await (const event of stream) {
		events.push(event);
	}
	return events;
}

test("streams text deltas into one text block", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Hello " }] } },
			{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "world" }] } },
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));

	assert.equal(events.filter((e) => e.type === "text_start").length, 1);
	assert.equal(events.filter((e) => e.type === "text_end").length, 1);
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "stop");
	if (done?.type === "done") {
		const text = done.message.content.filter((c) => c.type === "text").map((c) => c.text).join("");
		assert.equal(text, "Hello world");
		assert.ok(done.message.usage.input > 0, "input token estimate should be set");
		assert.ok(done.message.usage.output > 0, "output token estimate should be set");
		assert.equal(
			done.message.usage.totalTokens,
			done.message.usage.input + done.message.usage.output,
			"total token estimate should match input + output",
		);
	}
});

test("context overflow safety: very large context still streams", async () => {
	const capture = {};
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent(
			[{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } }],
			{ status: "finished" },
			capture,
		),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	context.messages = [
		{
			role: "user",
			content: "x".repeat(400_000),
			timestamp: Date.now(),
		},
	];

	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "stop");
	assert.ok(capture.promptText.length > 300_000, "serialized prompt should include full large context");
});

test("image limits: user image input is serialized into prompt", async () => {
	const capture = {};
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent(
			[{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "saw image" }] } }],
			{ status: "finished" },
			capture,
		),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	context.messages = [
		{
			role: "user",
			content: [
				{ type: "text", text: "analyze" },
				{
					type: "image",
					mimeType: "image/png",
					data: "aGVsbG8=",
				},
			],
			timestamp: Date.now(),
		},
	];

	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "stop");
	assert.match(capture.promptText, /\[Image: image\/png, ~6 bytes\]/);
});

test("image tool result is serialized into prompt", async () => {
	const capture = {};
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent(
			[{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "processed" }] } }],
			{ status: "finished" },
			capture,
		),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	context.messages = [
		{
			role: "toolResult",
			toolCallId: "tc1",
			toolName: "ReadImage",
			isError: false,
			content: [
				{ type: "text", text: "result text" },
				{ type: "image", mimeType: "image/jpeg", data: "YWJjZA==" },
			],
			timestamp: Date.now(),
		},
	];

	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "stop");
	assert.match(capture.promptText, /\[Tool result: ReadImage\]/);
	assert.match(capture.promptText, /\[Image: image\/jpeg, ~6 bytes\]/);
});

test("cross-provider handoff: assistant thinking/toolCall history does not break serialization", async () => {
	const capture = {};
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent(
			[{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "handoff ok" }] } }],
			{ status: "finished" },
			capture,
		),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	context.messages = [
		{
			role: "assistant",
			content: [
				{ type: "thinking", thinking: "internal notes from previous provider" },
				{ type: "toolCall", id: "old1", name: "Shell", arguments: { command: "ls" } },
				{ type: "text", text: "visible answer from previous provider" },
			],
			api: "openai-completions",
			provider: "openai",
			model: "gpt-4o",
			usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
			stopReason: "stop",
			timestamp: Date.now(),
		},
		{
			role: "user",
			content: "continue",
			timestamp: Date.now(),
		},
	];

	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "stop");
	assert.match(capture.promptText, /\[Assistant\]\nvisible answer from previous provider/);
	assert.doesNotMatch(capture.promptText, /internal notes from previous provider/);
});

test("streams model thinking blocks", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{ type: "thinking", text: "plan " },
			{ type: "thinking", text: "more" },
			{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "done" }] } },
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));

	assert.equal(events.filter((e) => e.type === "thinking_start").length, 1);
	assert.equal(events.filter((e) => e.type === "thinking_end").length, 1);
	const thinkingDelta = events.filter((e) => e.type === "thinking_delta");
	assert.equal(thinkingDelta.length, 2);
});

test("maps assistant thinking block content to thinking events", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{ type: "assistant", message: { role: "assistant", content: [{ type: "thinking", thinking: "plan from block" }] } },
			{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "done" }] } },
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));

	assert.equal(events.filter((e) => e.type === "thinking_start").length, 1);
	assert.equal(events.filter((e) => e.type === "thinking_end").length, 1);
});

test("keeps thinking segments split around assistant tool_use blocks", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{
				type: "assistant",
				message: {
					role: "assistant",
					content: [
						{ type: "thinking", thinking: "first-thought" },
						{ type: "tool_use", id: "tu_1", name: "shell", input: { command: "pwd" } },
					],
				},
			},
			{
				type: "assistant",
				message: {
					role: "assistant",
					content: [{ type: "thinking", thinking: "second-thought" }],
				},
			},
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));

	assert.equal(events.filter((e) => e.type === "toolcall_start").length, 1);
	assert.equal(events.filter((e) => e.type === "thinking_start").length, 2);
	assert.equal(events.filter((e) => e.type === "thinking_end").length, 2);

	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "toolUse");
	if (done?.type === "done") {
		const thinkingBlocks = done.message.content.filter((c) => c.type === "thinking").map((c) => c.thinking);
		assert.deepEqual(thinkingBlocks, ["first-thought", "second-thought"]);
	}
});

test("parses multiple transcript tool calls from assistant text", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{
				type: "assistant",
				message: {
					role: "assistant",
					content: [
						{
							type: "text",
							text:
								"⏺ Shell\n```json\n{\"command\":\"echo one\"}\n```\n\n⏺ Shell\n```json\n{\"command\":\"echo two\"}\n```",
						},
					],
				},
			},
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));

	assert.equal(events.filter((e) => e.type === "toolcall_start").length, 2);
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "toolUse");
});

test("does not parse mirrored transcript output blocks as new tool calls", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{
				type: "assistant",
				message: {
					role: "assistant",
					content: [
						{
							type: "text",
							text:
								"⏺ Shell\n\n```json\n{\"command\":\"echo hi\"}\n```\n\n```\n{\"stdout\":\"hi\\n\"}\n```",
						},
					],
				},
			},
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));

	assert.equal(events.filter((e) => e.type === "toolcall_start").length, 0);
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "stop");
});

test("keeps normal lines starting with Thinking", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{
				type: "assistant",
				message: { role: "assistant", content: [{ type: "text", text: "Thinking clearly matters for this skill read flow." }] },
			},
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done?.type === "done");
	if (done?.type === "done") {
		const text = done.message.content.filter((c) => c.type === "text").map((c) => c.text).join("");
		assert.match(text, /Thinking clearly matters/);
	}
});

test("emits tool call without redundant transcript text", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{ type: "tool_call", call_id: "c1", name: "shell", status: "running", args: { command: "echo hi" } },
			{
				type: "tool_call",
				call_id: "c1",
				name: "shell",
				status: "completed",
				args: { command: "echo hi" },
				result: { stdout: "hi\n", exitCode: 0 },
			},
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));

	assert.equal(events.filter((e) => e.type === "toolcall_start").length, 1);
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "toolUse");
	if (done?.type === "done") {
		const text = done.message.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
		assert.equal(text.trim(), "");
	}
});

test("remaps cursor edit path-only tool call to read tool", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{
				type: "tool_call",
				call_id: "edit_1",
				name: "edit",
				status: "running",
				args: { path: "/home/aryaniyaps/ai-projects/ultimate-pi/vault/wiki/index.md" },
			},
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	context.tools = [
		{ name: "edit", description: "Edit file", parameters: { type: "object" } },
		{ name: "ReadFile", description: "Read file", parameters: { type: "object" } },
	];
	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "toolUse");
	if (done?.type === "done") {
		const call = done.message.content.find((c) => c.type === "toolCall");
		assert.ok(call && call.type === "toolCall");
		if (call && call.type === "toolCall") {
			assert.equal(call.name, "ReadFile");
			assert.equal(call.arguments.path, "/home/aryaniyaps/ai-projects/ultimate-pi/vault/wiki/index.md");
		}
	}
});

test("handles abort signal and returns aborted error", async () => {
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "x" }] } }]),
	);
	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const controller = new AbortController();
	const stream = streamSimple(model, context, { signal: controller.signal });
	controller.abort();
	const events = await collectEvents(stream);
	const errorEvent = events.find((e) => e.type === "error");
	assert.ok(errorEvent && errorEvent.reason === "aborted");
});

test("handles empty assistant output gracefully", async () => {
	__setCursorAgentFactoryForTests(async () => makeFakeAgent([], { status: "finished", result: "" }));
	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done && done.reason === "stop");
});

test("preserves unicode surrogate pairs in text stream", async () => {
	const emoji = "🙂";
	__setCursorAgentFactoryForTests(async () =>
		makeFakeAgent([
			{ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: `ok ${emoji}` }] } },
		]),
	);

	const streamSimple = getStreamSimple();
	const { model, context } = makeModelAndContext();
	const events = await collectEvents(streamSimple(model, context));
	const done = events.find((e) => e.type === "done");
	assert.ok(done?.type === "done");
	if (done?.type === "done") {
		const text = done.message.content.filter((c) => c.type === "text").map((c) => c.text).join("");
		assert.equal(text, `ok ${emoji}`);
	}
});

