/**
 * Custom Startup Header Extension for Ultimate Pi
 *
 * Renders .github/banner-v2.png as true-color block ASCII art using Jimp.
 * Uses Unicode lower-half-block characters with per-pixel ANSI 24-bit color,
 * doubling vertical resolution in the same terminal footprint.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import Jimp from "jimp";
import { join } from "node:path";

const imagePath = join(process.cwd(), ".pi", "extensions", "banner.png");

// Terminal footprint — keep a safety margin so we never crash on narrow terminals
const SAFETY_MARGIN = 2;
const TERM_WIDTH = 120;
const TERM_HEIGHT = 24;

// Pixel grid: 1 char wide × 2 pixels tall (half-block)
const PIXEL_WIDTH = TERM_WIDTH;
const PIXEL_HEIGHT = TERM_HEIGHT * 2;

const HALF_BLOCK = "\u2584"; // lower half block: fg = bottom, bg = top

let cachedBanner: string[] | null = null;
let loadPromise: Promise<string[]> | null = null;

function ansiCell(
	top: { r: number; g: number; b: number },
	bottom: { r: number; g: number; b: number }
): string {
	return `\x1b[38;2;${bottom.r};${bottom.g};${bottom.b};48;2;${top.r};${top.g};${top.b}m${HALF_BLOCK}\x1b[0m`;
}

async function loadBanner(): Promise<string[]> {
	const image = await Jimp.read(imagePath);
	image.resize(PIXEL_WIDTH, PIXEL_HEIGHT);

	const lines: string[] = [];
	for (let row = 0; row < PIXEL_HEIGHT; row += 2) {
		let line = "";
		for (let col = 0; col < PIXEL_WIDTH; col++) {
			const top = Jimp.intToRGBA(image.getPixelColor(col, row));
			const bottom = Jimp.intToRGBA(image.getPixelColor(col, row + 1));
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
				invalidate() {},
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
