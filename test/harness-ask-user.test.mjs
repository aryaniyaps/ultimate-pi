import assert from "node:assert/strict";
import { test } from "node:test";

const {
	normalizeOption,
	validateAskParams,
	formatResultText,
	toToolDetails,
	isPlanApprovalAskUser,
	buildGlimpsePayload,
	resolvePresenterChoice,
	applyAskUserToTaskClarification,
} = await import(
	new URL("../.pi/lib/ask-user/validate-core.mjs", import.meta.url).href
);

test("normalizeOption accepts string and object", () => {
	assert.deepEqual(normalizeOption("  cloud  "), { title: "cloud" });
	assert.deepEqual(
		normalizeOption({ title: " self ", description: " d ", recommended: true }),
		{
			title: "self",
			description: "d",
			recommended: true,
		},
	);
});

test("validateAskParams rejects empty question", () => {
	const err = validateAskParams({ question: "  " });
	assert.equal(typeof err, "string");
	assert.match(err, /question is required/);
});

test("validateAskParams requires min 2 options when provided", () => {
	const err = validateAskParams({
		question: "Pick one?",
		options: ["only"],
	});
	assert.match(err, /at least 2 options/);
});

test("validateAskParams rejects options and questions together", () => {
	const err = validateAskParams({
		question: "Batch?",
		options: ["a", "b"],
		questions: [{ title: "Risk" }],
	});
	assert.match(err, /not both/);
});

test("validateAskParams accepts questionnaire mode", () => {
	const v = validateAskParams({
		question: "Project scoping",
		questions: [
			{
				title: "Done",
				description: "What does done look like?",
				options: ["Harness only", "Full stack"],
			},
			{
				title: "Risk",
				options: ["Low", "Med", "High"],
			},
		],
	});
	assert.equal(typeof v, "object");
	assert.equal(v.mode, "questionnaire");
	assert.equal(v.questions.length, 2);
});

test("formatResultText covers questionnaire", () => {
	const text = formatResultText(
		{
			kind: "questionnaire",
			questionnaireDetails: [
				{ question: "Risk", answer: "Med", kind: "selection" },
			],
		},
		false,
	);
	assert.match(text, /questionnaire/i);
	assert.match(text, /Risk/);
});

test("isPlanApprovalAskUser detects plan approval via questions", () => {
	assert.equal(
		isPlanApprovalAskUser({
			question: "Approve this plan?",
			questions: [{ title: "Proceed", options: ["Approve plan", "Cancel"] }],
		}),
		true,
	);
});

test("resolvePresenterChoice forces tui for inline displayMode", () => {
	const v = validateAskParams({
		question: "Inline?",
		options: ["a", "b"],
		displayMode: "inline",
	});
	assert.equal(typeof v, "object");
	const prev = process.env.HARNESS_ASK_USER_UI;
	process.env.HARNESS_ASK_USER_UI = "glimpse";
	try {
		assert.equal(resolvePresenterChoice(v, true), "tui");
	} finally {
		if (prev === undefined) delete process.env.HARNESS_ASK_USER_UI;
		else process.env.HARNESS_ASK_USER_UI = prev;
	}
});

test("resolvePresenterChoice prefers tui in CURSOR_AGENT sessions", () => {
	const v = validateAskParams({
		question: "Scope?",
		questions: [{ title: "Risk", options: ["Low", "Med", "High"] }],
	});
	assert.equal(typeof v, "object");
	const prevUi = process.env.HARNESS_ASK_USER_UI;
	const prevCursor = process.env.CURSOR_AGENT;
	delete process.env.HARNESS_ASK_USER_UI;
	process.env.CURSOR_AGENT = "1";
	try {
		assert.equal(resolvePresenterChoice(v, true), "tui");
	} finally {
		if (prevUi === undefined) delete process.env.HARNESS_ASK_USER_UI;
		else process.env.HARNESS_ASK_USER_UI = prevUi;
		if (prevCursor === undefined) delete process.env.CURSOR_AGENT;
		else process.env.CURSOR_AGENT = prevCursor;
	}
});

test("buildGlimpsePayload questionnaire type", () => {
	const v = validateAskParams({
		question: "Scope",
		questions: [{ title: "Surface", options: ["API", "UI"] }],
	});
	assert.equal(typeof v, "object");
	const payload = buildGlimpsePayload(v, "test-session");
	assert.equal(payload.type, "questionnaire");
	assert.equal(payload.questions?.length, 1);
});

test("applyAskUserToTaskClarification maps risk and success", () => {
	const doc = {
		assumptions: [],
		unresolved_questions: ["risk"],
		status: "draft",
	};
	const validated = validateAskParams({
		question: "Clarify",
		questions: [
			{
				title: "Risk level",
				options: ["Low", "Med", "High"],
			},
			{
				title: "What does done look like",
				options: ["Harness contract", "E2E feature"],
			},
		],
	});
	const details = toToolDetails(
		validated,
		{
			kind: "questionnaire",
			questionnaireDetails: [
				{ question: "Risk level", answer: "High", kind: "selection" },
				{
					question: "What does done look like",
					answer: "Harness contract",
					kind: "selection",
				},
			],
		},
		false,
		"tui",
	);
	const next = applyAskUserToTaskClarification(doc, details);
	assert.equal(next.risk_level, "high");
	assert.equal(next.success_definition, "Harness contract");
	assert.deepEqual(next.unresolved_questions, []);
});

test("isHarnessNonInteractive is true for print mode argv", async () => {
	const { isHarnessNonInteractive } = await import(
		new URL("../.pi/lib/ask-user/policy.ts", import.meta.url).href
	);
	const prevArgv = process.argv;
	const prevTTY = process.stdin.isTTY;
	try {
		process.argv = [...prevArgv, "-p"];
		Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
		assert.equal(isHarnessNonInteractive(), true);
	} finally {
		process.argv = prevArgv;
		Object.defineProperty(process.stdin, "isTTY", {
			value: prevTTY,
			configurable: true,
		});
	}
});
