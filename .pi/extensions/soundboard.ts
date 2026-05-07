/**
 * pi-sounds — per-project sound notifications.
 *
 * Reads `.pi/sounds/project-sounds.json` from project root.
 * Plays category sounds on agent events (success, error, alert).
 * No global fallback — silent when no project config found.
 *
 * Manifest format (`.pi/sounds/project-sounds.json`):
 * {
 *   "randomizeSounds": true,
 *   "sounds": {
 *     "success": ["success/tada.mp3", "success/boom.mp3"],
 *     "error":   ["error/buzzer.mp3"],
 *     "alert":   ["alert/kaching.mp3"],
 *     "notification": ["notification/soft.mp3"],
 *     "reminder":     ["reminder/soft.mp3"]
 *   }
 * }
 */

import { spawn } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
import {
	basename,
	dirname,
	extname,
	isAbsolute,
	join,
	resolve,
} from "node:path";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";

// ── Constants ──────────────────────────────────────────────────────

const SOUND_CATEGORIES = [
	"success",
	"error",
	"alert",
	"notification",
	"reminder",
] as const;
type SoundCategory = (typeof SOUND_CATEGORIES)[number];

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac"]);

const PROJECT_MARKERS = [
	".git",
	"package.json",
	"pyproject.toml",
	"go.mod",
	"Cargo.toml",
	"composer.json",
	"pom.xml",
	"build.gradle",
	".pi",
] as const;

const QUESTION_HINTS = [
	"question",
	"need your input",
	"please answer",
	"requires your input",
];

const MIN_INTERVAL_MS = 1500;

interface SoundManifest {
	themeName?: string;
	randomizeSounds?: boolean;
	sounds?: Partial<Record<SoundCategory, string | string[]>>;
}

interface ProjectSoundContext {
	projectRoot: string;
	soundsDirectory: string;
	soundsByCategory: Record<SoundCategory, string[]>;
	randomizeSounds: boolean;
}

interface AudioPlayer {
	cmd: string;
	args: (path: string) => string[];
}

// ── Module-level cache ────────────────────────────────────────────

let cachedContext: ProjectSoundContext | null = null;
let cachedProjectRoot: string | null = null;
let playerPromise: Promise<AudioPlayer | null> | null = null;

async function getPlayer(): Promise<AudioPlayer | null> {
	if (!playerPromise) playerPromise = findPlayer();
	return playerPromise;
}

// ── Utility ───────────────────────────────────────────────────────

function pickRandom<T>(items: T[]): T | null {
	if (items.length === 0) return null;
	return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function isDirectory(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

async function isReadableAudioFile(path: string): Promise<boolean> {
	if (!AUDIO_EXTENSIONS.has(extname(path).toLowerCase())) return false;
	try {
		const s = await stat(path);
		if (!s.isFile()) return false;
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function listAudioFiles(directory: string): Promise<string[]> {
	if (!(await isDirectory(directory))) return [];
	const entries = await readdir(directory, { withFileTypes: true });
	const files: string[] = [];
	for (const e of entries) {
		if (!e.isFile()) continue;
		const f = join(directory, e.name);
		if (
			AUDIO_EXTENSIONS.has(extname(f).toLowerCase()) &&
			(await isReadableAudioFile(f))
		) {
			files.push(resolve(f));
		}
	}
	return files.sort((a, b) => a.localeCompare(b));
}

async function resolveReference(
	ref: string,
	soundsDir: string,
): Promise<string | null> {
	const trimmed = ref.trim();
	if (!trimmed) return null;
	const abs = isAbsolute(trimmed) ? trimmed : join(soundsDir, trimmed);
	return (await isReadableAudioFile(abs)) ? resolve(abs) : null;
}

async function resolveCategoryFiles(
	manifest: SoundManifest | null,
	soundsDir: string,
	category: SoundCategory,
): Promise<string[]> {
	const resolved: string[] = [];
	const entry = manifest?.sounds?.[category];

	if (typeof entry === "string") {
		const r = await resolveReference(entry, soundsDir);
		if (r) resolved.push(r);
	} else if (Array.isArray(entry)) {
		for (const e of entry) {
			if (typeof e === "string") {
				const r = await resolveReference(e, soundsDir);
				if (r) resolved.push(r);
			}
		}
	}

	resolved.push(...(await listAudioFiles(join(soundsDir, category))));
	return [...new Set(resolved)];
}

async function detectProjectRoot(cwd = process.cwd()): Promise<string | null> {
	let dir = resolve(cwd);
	while (true) {
		for (const marker of PROJECT_MARKERS) {
			if (await pathExists(join(dir, marker))) return dir;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

async function buildProjectSoundContext(
	projectRoot: string,
): Promise<ProjectSoundContext | null> {
	const soundsDir = join(projectRoot, ".pi", "sounds");
	if (!(await isDirectory(soundsDir))) return null;

	let manifest: SoundManifest | null = null;
	for (const name of [
		"project-sounds.json",
		"sound-theme.json",
		"theme.json",
	]) {
		const p = join(soundsDir, name);
		if (await pathExists(p)) {
			try {
				manifest = JSON.parse(await readFile(p, "utf-8")) as SoundManifest;
				break;
			} catch {
				/* skip */
			}
		}
	}

	const soundsByCategory: Record<SoundCategory, string[]> = {
		success: [],
		error: [],
		alert: [],
		notification: [],
		reminder: [],
	};

	for (const cat of SOUND_CATEGORIES) {
		soundsByCategory[cat] = await resolveCategoryFiles(
			manifest,
			soundsDir,
			cat,
		);
	}

	const hasAny = SOUND_CATEGORIES.some((c) => soundsByCategory[c].length > 0);
	if (!hasAny) return null;

	return {
		projectRoot,
		soundsDirectory: soundsDir,
		soundsByCategory,
		randomizeSounds: manifest?.randomizeSounds ?? true,
	};
}

async function getSoundContext(
	cwd = process.cwd(),
): Promise<ProjectSoundContext | null> {
	const projectRoot = await detectProjectRoot(cwd);
	if (projectRoot === cachedProjectRoot) return cachedContext;

	cachedProjectRoot = projectRoot;
	if (!projectRoot) {
		cachedContext = null;
		return null;
	}

	cachedContext = await buildProjectSoundContext(projectRoot);
	return cachedContext;
}

// ── Audio Playback (spawn via child_process) ──────────────────────

function runCommand(
	cmd: string,
	args: string[],
	timeoutMs = 15000,
): Promise<{ code: number }> {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { timeout: timeoutMs, stdio: "ignore" });
		child.on("close", (code) => resolve({ code: code ?? 1 }));
		child.on("error", () => resolve({ code: 1 }));
	});
}

async function hasCommand(cmd: string): Promise<boolean> {
	try {
		const { code } = await runCommand("which", [cmd], 3000);
		return code === 0;
	} catch {
		return false;
	}
}

async function findPlayer(): Promise<AudioPlayer | null> {
	if (process.platform === "darwin") {
		if (await hasCommand("afplay")) return { cmd: "afplay", args: (p) => [p] };
		return null;
	}
	if (process.platform === "win32") {
		return {
			cmd: "powershell.exe",
			args: (p) => [
				"-NoProfile",
				"-NonInteractive",
				"-Command",
				`(New-Object Media.SoundPlayer '${p}').PlaySync()`,
			],
		};
	}
	// Linux
	if (await hasCommand("paplay")) return { cmd: "paplay", args: (p) => [p] };
	if (await hasCommand("ffplay"))
		return {
			cmd: "ffplay",
			args: (p) => ["-nodisp", "-autoexit", "-loglevel", "quiet", p],
		};
	if (await hasCommand("mpv"))
		return { cmd: "mpv", args: (p) => ["--no-video", "--really-quiet", p] };
	if (await hasCommand("aplay"))
		return { cmd: "aplay", args: (p) => ["-q", p] };
	return null;
}

async function playSound(filePath: string): Promise<boolean> {
	const player = await getPlayer();
	if (!player) return false;
	const { code } = await runCommand(player.cmd, player.args(filePath), 15000);
	return code === 0;
}

function clearCache(): void {
	cachedContext = null;
	cachedProjectRoot = null;
	playerPromise = null;
}

// ── Event Classification ──────────────────────────────────────────

function extractTextContent(content: unknown): string {
	if (!Array.isArray(content)) return "";
	const parts: string[] = [];
	for (const item of content) {
		if (
			item &&
			typeof item === "object" &&
			(item as Record<string, unknown>).type === "text" &&
			typeof (item as Record<string, unknown>).text === "string"
		) {
			parts.push((item as Record<string, unknown>).text as string);
		}
	}
	return parts.join("\n");
}

function classifyToolResult(
	toolName: string,
	isError: boolean,
	textContent: string,
): SoundCategory | null {
	const tool = toolName.toLowerCase();
	const text = textContent.toLowerCase().slice(0, 800);
	if (tool.includes("question")) return "alert";
	if (QUESTION_HINTS.some((h) => text.includes(h))) return "alert";
	if (isError) return "error";
	return null;
}

function readAgentEndOutcome(event: unknown): {
	status: "completed" | "error" | "aborted";
	reason?: string;
} {
	const msgs = (event as Record<string, unknown>)?.messages;
	if (!Array.isArray(msgs)) return { status: "completed" };
	for (let i = msgs.length - 1; i >= 0; i--) {
		const msg = msgs[i] as Record<string, unknown>;
		if (msg.role !== "assistant") continue;
		const stopReason =
			typeof msg.stopReason === "string" ? msg.stopReason.trim() : undefined;
		const errorMsg =
			typeof msg.errorMessage === "string"
				? msg.errorMessage.trim()
				: undefined;
		if (stopReason === "error")
			return {
				status: "error",
				reason: errorMsg || extractTextContent(msg.content),
			};
		if (stopReason === "aborted")
			return { status: "aborted", reason: errorMsg };
		if (errorMsg) return { status: "error", reason: errorMsg };
		return { status: "completed" };
	}
	return { status: "completed" };
}

// ── Extension ─────────────────────────────────────────────────────

export default function piSoundsExtension(pi: ExtensionAPI): void {
	let hadErrorInTurn = false;
	const suppressIdleAfterError = true;
	const notifiedToolCalls = new Set<string>();
	const lastPlayedAt = new Map<SoundCategory, number>();

	function shouldThrottle(category: SoundCategory): boolean {
		const now = Date.now();
		const last = lastPlayedAt.get(category) ?? 0;
		if (now - last < MIN_INTERVAL_MS) return true;
		lastPlayedAt.set(category, now);
		return false;
	}

	function queue(fn: () => Promise<void>): void {
		void fn().catch(() => {});
	}

	pi.on("session_start", async () => {
		hadErrorInTurn = false;
		notifiedToolCalls.clear();
		clearCache();
	});

	pi.on("session_shutdown", async () => {
		clearCache();
	});

	pi.on("resources_discover", (event) => {
		if (event.reason === "reload") clearCache();
	});

	pi.on("agent_start", async () => {
		hadErrorInTurn = false;
		notifiedToolCalls.clear();
	});

	pi.on("tool_execution_start", async (event) => {
		notifiedToolCalls.delete(event.toolCallId);
	});

	pi.on("tool_result", async (event) => {
		if (notifiedToolCalls.has(event.toolCallId)) return;
		notifiedToolCalls.add(event.toolCallId);

		const toolName = typeof event.toolName === "string" ? event.toolName : "";
		const text = extractTextContent(event.content);
		const category = classifyToolResult(toolName, event.isError, text);
		if (!category) return;
		if (event.isError) hadErrorInTurn = true;

		queue(async () => {
			const ctx = await getSoundContext();
			if (!ctx) return;
			const files = ctx.soundsByCategory[category];
			if (files.length === 0) return;
			const picked = ctx.randomizeSounds ? pickRandom(files) : files[0];
			if (!picked) return;
			if (!shouldThrottle(category)) await playSound(picked);
		});
	});

	pi.on("agent_end", async (event) => {
		const outcome = readAgentEndOutcome(event);
		if (outcome.status === "error" || outcome.status === "aborted") {
			hadErrorInTurn = true;
			queue(async () => {
				const ctx = await getSoundContext();
				if (!ctx) return;
				const files = ctx.soundsByCategory.error;
				if (files.length === 0) return;
				const picked = ctx.randomizeSounds ? pickRandom(files) : files[0];
				if (!picked) return;
				if (!shouldThrottle("error")) await playSound(picked);
			});
			return;
		}
		if (suppressIdleAfterError && hadErrorInTurn) {
			hadErrorInTurn = false;
			return;
		}
		queue(async () => {
			const ctx = await getSoundContext();
			if (!ctx) return;
			const files = ctx.soundsByCategory.success;
			if (files.length === 0) return;
			const picked = ctx.randomizeSounds ? pickRandom(files) : files[0];
			if (!picked) return;
			if (!shouldThrottle("success")) await playSound(picked);
		});
		hadErrorInTurn = false;
	});

	// ── Command ────────────────────────────────────────────────────

	pi.registerCommand("sounds", {
		description: "Show pi-sounds status: loaded sounds, player",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			const soundCtx = await getSoundContext();
			if (!soundCtx) {
				const msg = "pi-sounds: no .pi/sounds/project-sounds.json found";
				if (ctx.hasUI) ctx.ui.notify(msg, "warning");
				else
					pi.sendMessage({
						customType: "pi-sounds",
						content: msg,
						display: true,
					});
				return;
			}

			const player = await getPlayer();
			const playerName = player ? player.cmd : "none";
			const total = SOUND_CATEGORIES.reduce(
				(sum, c) => sum + soundCtx.soundsByCategory[c].length,
				0,
			);

			const lines = [
				`pi-sounds status:`,
				`  player: ${playerName}`,
				`  sounds: ${total} files in ${soundCtx.soundsDirectory}`,
				`  randomize: ${soundCtx.randomizeSounds ? "yes" : "no"}`,
				`  categories:`,
			];
			for (const cat of SOUND_CATEGORIES) {
				const files = soundCtx.soundsByCategory[cat];
				lines.push(
					`    ${cat}: ${files.length > 0 ? files.map((f) => basename(f)).join(", ") : "(none)"}`,
				);
			}

			if (ctx.hasUI) ctx.ui.notify(lines.join("\n"), "info");
			else
				pi.sendMessage({
					customType: "pi-sounds",
					content: lines.join("\n"),
					display: true,
				});
		},
	});
}
