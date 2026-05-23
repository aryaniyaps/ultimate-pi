/**
 * Load before other extensions: IPv4-first fetch for *.posthog.com (@posthog/pi uses global fetch).
 */

import { installPostHogFetchPatch } from "./lib/posthog-client.js";

installPostHogFetchPatch();

export default function posthogNetworkBootstrap() {
	// Side effects run at module load; no hooks required.
}
