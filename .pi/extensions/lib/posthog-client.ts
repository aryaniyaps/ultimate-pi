/**
 * PostHog client helpers — IPv4-first fetch for WSL2 / broken dual-stack DNS.
 *
 * Node's default fetch can ETIMEDOUT against *.posthog.com while curl succeeds.
 * Use createPostHogFetch() (undici, family 4) for all posthog-node clients.
 */

import { Agent, fetch as undiciFetch } from "undici";

const POSTHOG_HOST_RE = /(^https?:\/\/)?([^.]+\.)*posthog\.com(\/|$)/i;

const ipv4Agent = new Agent({ connect: { family: 4 } });

let fetchPatchInstalled = false;

export function isPostHogHostUrl(url: string): boolean {
	return POSTHOG_HOST_RE.test(url);
}

export function resolvePostHogHost(): string {
	return process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
}

/** Fetch that prefers IPv4 — fixes WSL2 ETIMEDOUT on us.i.posthog.com. */
export function createPostHogFetch(): typeof fetch {
	return ((input: Parameters<typeof fetch>[0], init?: RequestInit) =>
		undiciFetch(
			input as Parameters<typeof undiciFetch>[0],
			{
				...init,
				dispatcher: ipv4Agent,
			} as Parameters<typeof undiciFetch>[1],
		)) as typeof fetch;
}

export function getPostHogClientOptions(): {
	host: string;
	fetch: typeof fetch;
	requestTimeout: number;
} {
	return {
		host: resolvePostHogHost(),
		fetch: createPostHogFetch(),
		requestTimeout: 30_000,
	};
}

/**
 * Patch global fetch so @posthog/pi (which uses default fetch) reaches PostHog on WSL2.
 * Only PostHog hostnames are routed through the IPv4 agent.
 */
export function installPostHogFetchPatch(): void {
	if (fetchPatchInstalled) return;
	fetchPatchInstalled = true;

	const nativeFetch = globalThis.fetch.bind(globalThis);
	const posthogFetch = createPostHogFetch();

	globalThis.fetch = ((
		input: Parameters<typeof fetch>[0],
		init?: RequestInit,
	) => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: typeof input === "object" && input !== null && "url" in input
						? String((input as { url: string }).url)
						: "";
		if (url && isPostHogHostUrl(url)) {
			return posthogFetch(input, init);
		}
		return nativeFetch(input, init);
	}) as typeof fetch;
}
