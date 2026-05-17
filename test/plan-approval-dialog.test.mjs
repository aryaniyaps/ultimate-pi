import { test } from "node:test";
import assert from "node:assert/strict";
import {
	computePlanOverlayMaxHeight,
	computePlanViewport,
	PLAN_APPROVAL_BOTTOM_RESERVE_LINES,
	PLAN_APPROVAL_AGENTS_TOP_RESERVE_LINES,
} from "../.pi/extensions/lib/plan-approval/dialog.ts";

test("computePlanViewport uses full available height minus chrome", () => {
	const viewport = computePlanViewport(40, 12);
	assert.equal(viewport, 28);
	assert.ok(viewport > 10, "should exceed old 55% cap (~10 lines on 40-row terminal)");
});

test("computePlanOverlayMaxHeight reserves bottom and agents bands", () => {
	const maxH = computePlanOverlayMaxHeight(40);
	const expected =
		40 - PLAN_APPROVAL_BOTTOM_RESERVE_LINES - PLAN_APPROVAL_AGENTS_TOP_RESERVE_LINES;
	assert.equal(maxH, expected);
});
