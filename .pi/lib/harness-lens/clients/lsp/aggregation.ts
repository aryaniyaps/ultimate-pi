/**
 * Diagnostic Aggregation Utilities for pi-lens LSP
 *
 * Provides result-aware racing for multi-client diagnostic collection.
 * Replaces the simple Promise.race + grace window pattern with one that
 * only fires the grace window when a client actually returned diagnostics.
 */

/**
 * Race a set of promises to completion, resolving as soon as the
 * `shouldComplete` predicate is satisfied by the accumulated results.
 *
 * Key difference from Promise.race: Promise.race resolves when ANY promise
 * settles (even with an empty/useless result). raceToCompletion only resolves
 * early when results meet a quality threshold, optionally with a grace window
 * to let more results accumulate.
 *
 * @param promises - Array of promises producing results
 * @param shouldComplete - Called after each settled promise with all results
 *   accumulated so far. Return true to trigger early completion.
 * @param options.timeoutMs - Hard deadline; after this, resolve with whatever is ready
 * @param options.graceMs - After shouldComplete returns true, wait this many ms
 *   for additional results before finalizing. 0 = finalize immediately.
 */
export async function raceToCompletion<T>(
	promises: Promise<T>[],
	shouldComplete: (results: T[]) => boolean,
	options: { timeoutMs: number; graceMs?: number } = { timeoutMs: 1500 },
): Promise<T[]> {
	const results: (T | undefined)[] = new Array(promises.length).fill(undefined);
	let graceTimer: ReturnType<typeof setTimeout> | undefined;
	let completed = false;
	let remaining = promises.length;

	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			completed = true;
			if (graceTimer) clearTimeout(graceTimer);
			resolve(results.filter((r): r is T => r !== undefined));
		}, options.timeoutMs);

		const finalize = () => {
			if (completed) return;
			completed = true;
			clearTimeout(timeout);
			if (graceTimer) clearTimeout(graceTimer);
			resolve(results.filter((r): r is T => r !== undefined));
		};

		const check = () => {
			if (completed) return;

			if (remaining === 0) {
				finalize();
				return;
			}

			const collected = results.filter((r): r is T => r !== undefined);
			if (shouldComplete(collected)) {
				if (
					options.graceMs !== undefined &&
					options.graceMs > 0 &&
					!graceTimer
				) {
					// Start grace window — more results may arrive
					graceTimer = setTimeout(() => finalize(), options.graceMs);
				} else {
					finalize();
				}
			}
		};

		for (let i = 0; i < promises.length; i++) {
			const index = i;
			promises[i]
				.then((result) => {
					if (!completed) {
						results[index] = result;
						remaining--;
						check();
					}
				})
				.catch(() => {
					if (!completed) {
						remaining--;
						check();
					}
				});
		}
	});
}
