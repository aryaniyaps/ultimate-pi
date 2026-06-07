import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import harnessProjectControl from "../.pi/extensions/00-harness-project-control.ts";
import harnessLiveWidget from "../.pi/extensions/harness-live-widget.ts";
import { writeHarnessProjectEnabled } from "../.pi/lib/harness-project-config.ts";

type Handler = (...args: any[]) => unknown;

function createPi() {
	const lifecycle = new Map<string, Handler[]>();
	const eventHandlers = new Map<string, Handler[]>();
	const commands = new Map<string, { handler: Handler }>();
	const pi = {
		commands,
		emitted: [] as Array<{ name: string; payload: unknown }>,
		on(name: string, handler: Handler) {
			const handlers = lifecycle.get(name) ?? [];
			handlers.push(handler);
			lifecycle.set(name, handlers);
		},
		async fire(name: string, ...args: unknown[]) {
			for (const handler of lifecycle.get(name) ?? []) {
				await handler(...args);
			}
		},
		notifications: [] as Array<{ message: string; type: string | undefined }>,
		sentMessages: [] as unknown[],
		sendMessage(message: unknown) {
			pi.sentMessages.push(message);
		},
		events: {
			on(name: string, handler: Handler) {
				const handlers = eventHandlers.get(name) ?? [];
				handlers.push(handler);
				eventHandlers.set(name, handlers);
			},
			emit(name: string, payload: unknown) {
				pi.emitted.push({ name, payload });
				for (const handler of eventHandlers.get(name) ?? []) {
					handler(payload);
				}
			},
		},
		registerCommand(name: string, options: { handler: Handler }) {
			commands.set(name, options);
		},
	};
	return pi;
}

function createCtx() {
	const widgets: Array<{ key: string; content: unknown }> = [];
	const statuses: Array<{ key: string; text: string | undefined }> = [];
	return {
		hasUI: true,
		ui: {
			setWidget(key: string, content: unknown) {
				widgets.push({ key, content });
			},
			setStatus(key: string, text: string | undefined) {
				statuses.push({ key, text });
			},
		},
		sessionManager: { getEntries: () => [] },
		widgets,
		statuses,
	};
}

function withTempProject(enabled: boolean) {
	const previous = process.cwd();
	const projectRoot = mkdtempSync(
		join(tmpdir(), "ultimate-pi-harness-toggle-"),
	);
	process.chdir(projectRoot);
	writeHarnessProjectEnabled(projectRoot, enabled);
	return {
		projectRoot,
		cleanup() {
			process.chdir(previous);
			rmSync(projectRoot, { recursive: true, force: true });
		},
	};
}

describe("harness enable/disable TUI refresh", () => {
	let cleanup: (() => void) | undefined;
	afterEach(() => {
		cleanup?.();
		cleanup = undefined;
	});

	test("live widget mounts and clears on project enabled change events", async () => {
		const tmp = withTempProject(false);
		cleanup = tmp.cleanup;
		const pi = createPi();
		const ctx = createCtx();
		harnessLiveWidget(pi as never);

		await pi.fire("session_start", {}, ctx);
		assert.equal(ctx.widgets.length, 0);

		writeHarnessProjectEnabled(tmp.projectRoot, true);
		pi.events.emit("harness-project-enabled:changed", { enabled: true });
		assert.equal(ctx.widgets.at(-1)?.key, "harness-live");
		assert.equal(typeof ctx.widgets.at(-1)?.content, "function");

		let renderRequests = 0;
		const factory = ctx.widgets.at(-1)?.content as Function;
		factory(
			{ requestRender: () => renderRequests++ },
			{
				fg: (_color: string, text: string) => text,
				bold: (text: string) => text,
			},
		);

		writeHarnessProjectEnabled(tmp.projectRoot, false);
		pi.events.emit("harness-project-enabled:changed", { enabled: false });
		assert.deepEqual(ctx.widgets.at(-1), {
			key: "harness-live",
			content: undefined,
		});
		assert.deepEqual(ctx.statuses.at(-1), {
			key: "harness-mode",
			text: undefined,
		});
		assert.equal(renderRequests, 1);
	});

	test("harness-enable and harness-disable emit live TUI change events", async () => {
		const tmp = withTempProject(true);
		cleanup = tmp.cleanup;
		const pi = createPi();
		harnessProjectControl(pi as never);

		const commandCtx = {
			hasUI: true,
			ui: {
				notify(message: string, type?: string) {
					pi.notifications.push({ message, type });
				},
			},
		};

		await pi.commands.get("harness-disable")?.handler("", commandCtx);
		await pi.commands.get("harness-enable")?.handler("", commandCtx);

		assert.deepEqual(
			pi.emitted.map((event) => ({
				name: event.name,
				enabled: (event.payload as { enabled: boolean }).enabled,
			})),
			[
				{ name: "harness-project-enabled:changed", enabled: false },
				{ name: "harness-project-enabled:changed", enabled: true },
			],
		);
	});

	test("harness-project-toggle CLI reports no reload required", () => {
		const repoRoot = process.cwd();
		const tmp = withTempProject(false);
		cleanup = tmp.cleanup;
		const raw = execFileSync(
			process.execPath,
			[
				join(repoRoot, ".pi", "scripts", "harness-project-toggle.mjs"),
				"enable",
				"--project-root",
				tmp.projectRoot,
			],
			{ encoding: "utf8" },
		);
		const result = JSON.parse(raw) as { reload_required?: boolean };
		assert.equal(result.reload_required, false);
	});
});
