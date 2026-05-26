import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as diff from "diff";

interface TrackedDocument {
	hashes: Uint32Array;
	anchors: string[];
	usedWords: Set<string>;
	availablePool?: string[];
}

export class AnchorStateManager {
	private static storage = new Map<string, Map<string, TrackedDocument>>();
	private static dictionary: string[] = [];
	private static readonly MAX_TRACKED_LINES = 50000;
	private static readonly MAX_TRACKED_FILES = 1024;
	private static readonly MAX_TRACKED_TASKS = 50;

	private static computeHashes(lines: string[]): Uint32Array {
		const hashes = new Uint32Array(lines.length);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			let h = 2166136261;
			for (let j = 0; j < line.length; j++) {
				h = Math.imul(h ^ line.charCodeAt(j), 16777619);
			}
			hashes[i] = h >>> 0;
		}
		return hashes;
	}

	private static getDictionary(): string[] {
		if (AnchorStateManager.dictionary.length === 0) {
			const dictionaryPath = path.join(
				path.dirname(fileURLToPath(import.meta.url)),
				".hash_anchors",
			);
			// do not catch errors here, we should fail loudly
			AnchorStateManager.dictionary = fs
				.readFileSync(dictionaryPath, "utf8")
				.split(/\r?\n/)
				.filter(Boolean);
		}
		return AnchorStateManager.dictionary;
	}

	private static refill(usedWords: Set<string>, pool: string[]) {
		const dict = AnchorStateManager.getDictionary();
		const dictLen = dict.length;
		const newWords: string[] = [];

		// Try to find 10,000 unique two-word combinations
		let attempts = 0;
		while (newWords.length < 10000 && attempts < 50000) {
			const w1 = dict[Math.floor(Math.random() * dictLen)];
			const w2 = dict[Math.floor(Math.random() * dictLen)];
			const word = `${w1}${w2}`;
			if (!usedWords.has(word)) {
				newWords.push(word);
			}
			attempts++;
		}

		// Extreme fallback: three-word combinations if we are struggling
		if (newWords.length < 100) {
			for (let i = 0; i < 100; i++) {
				const w1 = dict[Math.floor(Math.random() * dictLen)];
				const w2 = dict[Math.floor(Math.random() * dictLen)];
				const w3 = dict[Math.floor(Math.random() * dictLen)];
				const word = `${w1}${w2}${w3}`;
				if (!usedWords.has(word)) {
					newWords.push(word);
				}
			}
		}

		// Shuffle the new batch and add to pool
		for (let i = newWords.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[newWords[i], newWords[j]] = [newWords[j], newWords[i]];
		}
		pool.push(...newWords);
	}

	private static getUniqueWord(usedWords: Set<string>, pool: string[]): string {
		while (true) {
			if (pool.length === 0) {
				AnchorStateManager.refill(usedWords, pool);
			}

			const word = pool.pop()!;
			if (!usedWords.has(word)) {
				return word;
			}
			// If we hit a collision (word was in usedWords but not in pool),
			// just pop the next one.
		}
	}

	private static getTaskState(
		taskId = "default",
	): Map<string, TrackedDocument> {
		let state = AnchorStateManager.storage.get(taskId);
		if (!state) {
			state = new Map<string, TrackedDocument>();
			AnchorStateManager.storage.set(taskId, state);

			// Implement LRU for tasks
			if (
				AnchorStateManager.storage.size > AnchorStateManager.MAX_TRACKED_TASKS
			) {
				const oldestTaskId = AnchorStateManager.storage.keys().next().value;
				if (oldestTaskId !== undefined) {
					AnchorStateManager.storage.delete(oldestTaskId);
				}
			}
		} else {
			// Refresh LRU position for existing task
			AnchorStateManager.storage.delete(taskId);
			AnchorStateManager.storage.set(taskId, state);
		}
		return state;
	}

	/**
	 * Reconciles the current file content with our saved state using Myers Diff.
	 * Unchanged lines keep their exact word anchors. New lines get new words.
	 */
	public static reconcile(
		absolutePath: string,
		currentLines: string[],
		taskId?: string,
	): string[] {
		// Safeguard for massive files
		if (currentLines.length > AnchorStateManager.MAX_TRACKED_LINES) {
			return currentLines.map((_, i) => `L${i + 1}`);
		}

		const state = AnchorStateManager.getTaskState(taskId);
		const currentHashes = AnchorStateManager.computeHashes(currentLines);
		let tracked = state.get(absolutePath);

		// Fast path: if hashes are identical, nothing changed
		if (tracked && tracked.hashes.length === currentHashes.length) {
			let identical = true;
			for (let i = 0; i < currentHashes.length; i++) {
				if (tracked.hashes[i] !== currentHashes[i]) {
					identical = false;
					break;
				}
			}
			if (identical) {
				// Refresh LRU position
				AnchorStateManager.updateState(absolutePath, tracked, taskId);
				return tracked.anchors;
			}
		}

		// First time seeing this file? Assign unique random words to every line.
		if (!tracked) {
			const usedWords = new Set<string>();
			const pool = [...AnchorStateManager.getDictionary()];
			// Initial shuffle of dictionary
			for (let i = pool.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}

			const anchors = currentLines.map(() => {
				const w = AnchorStateManager.getUniqueWord(usedWords, pool);
				usedWords.add(w);
				return w;
			});

			tracked = {
				hashes: currentHashes,
				anchors,
				usedWords,
				availablePool: pool,
			};
			AnchorStateManager.updateState(absolutePath, tracked, taskId);
			return anchors;
		}

		// We have history! Run Myers Diff on hashes (integers) instead of strings.
		// Note: diffArrays accepts any array-like, but we convert Uint32Array to regular Array
		// because jsdiff's internal comparisons are more reliable with standard Arrays.
		const changes = diff.diffArrays(
			Array.from(tracked.hashes),
			Array.from(currentHashes),
		);

		const newAnchors: string[] = [];
		const newUsedWords = new Set<string>(tracked.usedWords);
		const pool = tracked.availablePool || [];
		// If pool was lost (e.g. from an older version of state), initialize it
		if (
			pool.length === 0 &&
			newUsedWords.size < AnchorStateManager.getDictionary().length
		) {
			const dict = AnchorStateManager.getDictionary();
			for (const word of dict) {
				if (!newUsedWords.has(word)) {
					pool.push(word);
				}
			}
			// Shuffle initial single-word pool
			for (let i = pool.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[pool[i], pool[j]] = [pool[j], pool[i]];
			}
		}

		let oldIdx = 0;

		for (const change of changes) {
			if (change.added) {
				// New lines (typed by user or added by LLM) get NEW words
				for (let i = 0; i < change.count!; i++) {
					const word = AnchorStateManager.getUniqueWord(newUsedWords, pool);
					newAnchors.push(word);
					newUsedWords.add(word);
				}
			} else if (change.removed) {
				// Deleted lines: We just advance the old index.
				oldIdx += change.count!;
			} else {
				// Unchanged lines: CARRY OVER THE EXACT SAME WORD ANCHOR
				for (let i = 0; i < change.count!; i++) {
					const preservedWord = tracked.anchors[oldIdx];
					newAnchors.push(preservedWord);
					newUsedWords.add(preservedWord);
					oldIdx++;
				}
			}
		}

		// Update the state cache
		tracked = {
			hashes: currentHashes,
			anchors: newAnchors,
			usedWords: newUsedWords,
			availablePool: pool,
		};
		AnchorStateManager.updateState(absolutePath, tracked, taskId);
		return newAnchors;
	}

	private static updateState(
		absolutePath: string,
		document: TrackedDocument,
		taskId?: string,
	) {
		const state = AnchorStateManager.getTaskState(taskId);
		// Implement LRU by deleting and re-inserting
		state.delete(absolutePath);
		state.set(absolutePath, document);

		// Evict oldest if limit exceeded
		if (state.size > AnchorStateManager.MAX_TRACKED_FILES) {
			const oldestKey = state.keys().next().value;
			if (oldestKey !== undefined) {
				state.delete(oldestKey);
			}
		}
	}

	/**
	 * Returns true if the file is currently being tracked.
	 */
	public static isTracking(absolutePath: string, taskId?: string): boolean {
		return AnchorStateManager.getTaskState(taskId).has(absolutePath);
	}

	/**
	 * Gets current anchors for a file if it's being tracked, otherwise returns null.
	 */
	public static getAnchors(
		absolutePath: string,
		taskId?: string,
	): string[] | null {
		return (
			AnchorStateManager.getTaskState(taskId).get(absolutePath)?.anchors || null
		);
	}

	/**
	 * Clear state for a file (useful if needed for cleanup)
	 */
	public static clearState(absolutePath: string, taskId?: string) {
		AnchorStateManager.getTaskState(taskId).delete(absolutePath);
	}

	/**
	 * Resets all anchors for a specific task or all tasks.
	 */
	public static reset(taskId?: string) {
		if (taskId) {
			AnchorStateManager.storage.delete(taskId);
		} else {
			AnchorStateManager.storage.clear();
		}
	}
}

import { formatLineWithHash } from "./line-protocol.js";

export function hashLinesStateful(
	absolutePath: string,
	content: string,
	taskId?: string,
): string {
	if (!content) return "";
	const lines = content.split(/\r?\n/);
	const anchors = AnchorStateManager.reconcile(absolutePath, lines, taskId);
	return lines
		.map((line, index) => formatLineWithHash(line, anchors[index]!))
		.join("\n");
}
