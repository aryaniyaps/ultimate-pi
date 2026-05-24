import { safeSpawnAsync } from "../../../safe-spawn.js";

type LazyTool = "golangci-lint" | "rubocop" | "rust-clippy";

const attempted = new Set<string>();

function key(cwd: string, tool: LazyTool): string {
	return `${cwd}:${tool}`;
}

/**
 * Best-effort lazy install for language-specific linters.
 *
 * Installs are attempted once per cwd+tool per session to avoid repeated churn.
 */
export async function tryLazyInstall(tool: LazyTool, cwd: string): Promise<boolean> {
	const k = key(cwd, tool);
	if (attempted.has(k)) return false;
	attempted.add(k);

	try {
		switch (tool) {
			case "golangci-lint": {
				const result = await safeSpawnAsync(
					"go",
					[
						"install",
						"github.com/golangci/golangci-lint/cmd/golangci-lint@latest",
					],
					{ timeout: 180000, cwd },
				);
				return !result.error && result.status === 0;
			}
			case "rubocop": {
				const result = await safeSpawnAsync(
					"gem",
					["install", "rubocop", "--no-document"],
					{ timeout: 180000, cwd },
				);
				return !result.error && result.status === 0;
			}
			case "rust-clippy": {
				const result = await safeSpawnAsync(
					"rustup",
					["component", "add", "clippy"],
					{ timeout: 180000, cwd },
				);
				return !result.error && result.status === 0;
			}
		}
	} catch {
		return false;
	}
}
