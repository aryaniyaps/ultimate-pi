/**
 * In-house VCC compaction for ultimate-pi.
 *
 * Vendored compaction core from [pi-vcc](https://github.com/sting8k/pi-vcc),
 * inspired by [VCC](https://github.com/lllyasviel/VCC).
 *
 * Configuration is **env-only** (no JSON config files):
 * - `HARNESS_VCC_COMPACTION` — default on; set `false` for Pi LLM compaction on /compact + auto-compact
 * - `HARNESS_VCC_DEBUG` — set `true` to write `/tmp/pi-vcc-debug.json` on compaction
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import registerVcc from "../../vendor/pi-vcc/index.js";

export default function ultimatePiVcc(pi: ExtensionAPI): void {
	registerVcc(pi);
}
