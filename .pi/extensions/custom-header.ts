/**
 * Custom Startup Header Extension for Ultimate Pi
 *
 * Renders .github/banner-v2.png as true-color block ASCII art using Jimp.
 * Uses Unicode lower-half-block characters with per-pixel ANSI 24-bit color,
 * doubling vertical resolution in the same terminal footprint.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import * as JimpModule from "jimp";
import { resolveHarnessAsset } from "./lib/harness-paths.js";

/** Shipped next to this extension in the npm package — not the host project's .pi dir. */
const imagePath = resolveHarnessAsset(
	// @ts-expect-error pi extensions run as ESM
	import.meta.url,
	".pi",
	"extensions",
	"banner.png",
);

// Terminal footprint — keep a safety margin so we never crash on narrow terminals
const SAFETY_MARGIN = 2;
const TERM_WIDTH = 100;
const TERM_HEIGHT = 15;

// Pixel grid: 1 char wide × 2 pixels tall (half-block)
const PIXEL_WIDTH = TERM_WIDTH;
const PIXEL_HEIGHT = TERM_HEIGHT;

const HALF_BLOCK = "\u2584"; // lower half block: fg = bottom, bg = top

let cachedBanner: string[] | null = null;
let loadPromise: Promise<string[]> | null = null;

function getJimpRuntime(): { read(path: string): Promise<any> } {
	const mod = JimpModule as Record<string, unknown>;
	const candidates = [mod.default, mod.Jimp, mod];
	for (const candidate of candidates) {
		if (
			candidate &&
			(typeof candidate === "object" || typeof candidate === "function") &&
			typeof (candidate as { read?: unknown }).read === "function"
		) {
			return candidate as { read(path: string): Promise<any> };
		}
	}
	throw new TypeError("Jimp runtime missing read() export");
}

function intToRgba(pixel: number): {
	r: number;
	g: number;
	b: number;
	a: number;
} {
	return {
		r: (pixel >> 24) & 255,
		g: (pixel >> 16) & 255,
		b: (pixel >> 8) & 255,
		a: pixel & 255,
	};
}

function resizeImageCompat(image: any, w: number, h: number): void {
	try {
		image.resize({ w, h });
	} catch {
		image.resize(w, h);
	}
}

function ansiCell(
	top: { r: number; g: number; b: number; a: number },
	bottom: { r: number; g: number; b: number; a: number },
): string {
	const topTransparent = top.a < 128;
	const bottomTransparent = bottom.a < 128;
	if (topTransparent && bottomTransparent) {
		return " ";
	}
	if (topTransparent) {
		return `\x1b[38;2;${bottom.r};${bottom.g};${bottom.b};48;2;${bottom.r};${bottom.g};${bottom.b}m${HALF_BLOCK}\x1b[0m`;
	}
	if (bottomTransparent) {
		return `\x1b[38;2;${top.r};${top.g};${top.b};48;2;${top.r};${top.g};${top.b}m${HALF_BLOCK}\x1b[0m`;
	}
	return `\x1b[38;2;${bottom.r};${bottom.g};${bottom.b};48;2;${top.r};${top.g};${top.b}m${HALF_BLOCK}\x1b[0m`;
}

async function loadBanner(): Promise<string[]> {
	const Jimp = getJimpRuntime();
	const image = await Jimp.read(imagePath);
	resizeImageCompat(image, PIXEL_WIDTH, PIXEL_HEIGHT);

	const lines: string[] = [];
	for (let row = 0; row < PIXEL_HEIGHT; row += 2) {
		let line = "";
		for (let col = 0; col < PIXEL_WIDTH; col++) {
			const top = intToRgba(image.getPixelColor(col, row));
			const bottom = intToRgba(image.getPixelColor(col, row + 1));
			line += ansiCell(top, bottom);
		}
		lines.push(line);
	}
	return lines;
}

function getBanner(): Promise<string[]> {
	if (cachedBanner) {
		return Promise.resolve(cachedBanner);
	}
	if (loadPromise) {
		return loadPromise;
	}
	loadPromise = loadBanner()
		.then((lines) => {
			cachedBanner = lines;
			return lines;
		})
		.catch((err) => {
			console.error("Failed to render banner:", err);
			cachedBanner = [];
			return [];
		});
	return loadPromise;
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) {
			return;
		}

		await getBanner();

		ctx.ui.setHeader((_tui, _theme) => {
			return {
				render(width: number): string[] {
					if (!cachedBanner || cachedBanner.length === 0) {
						return [];
					}
					const maxW = Math.max(0, width - SAFETY_MARGIN);
					return cachedBanner.map((line) => truncateToWidth(line, maxW));
				},
				invalidate() {
					return false;
				},
			};
		});
	});

	pi.registerCommand("builtin-header", {
		description: "Restore built-in header with keybinding hints",
		handler: async (_args, ctx) => {
			ctx.ui.setHeader(undefined);
			ctx.ui.notify("Built-in header restored", "info");
		},
	});
}
