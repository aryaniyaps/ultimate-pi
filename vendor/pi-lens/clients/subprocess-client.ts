import type { spawnSync } from "node:child_process";
import * as path from "node:path";
import { safeSpawn } from "./safe-spawn.js";

export interface Diagnostic {
	line: number;
	column: number;
	endLine: number;
	endColumn: number;
	severity: "error" | "warning" | "info" | "hint";
	message: string;
	rule?: string;
	file: string;
	fixable?: boolean;
}

export abstract class SubprocessClient<T extends Diagnostic> {
	protected available: boolean | null = null;
	protected log: (msg: string) => void;
	private toolName: string;

	constructor(verbose = false) {
		this.toolName = this.getToolName();
		this.log = verbose
			? (msg: string) => console.error(`[${this.toolName}] ${msg}`)
			: () => {};
	}

	protected abstract getToolName(): string;
	protected abstract getCheckCommand(): string[];
	protected abstract getSupportedExtensions(): string[];
	protected abstract parseOutput(output: string, filePath: string): T[];

	isAvailable(): boolean {
		if (this.available !== null) return this.available;

		const cmd = this.getCheckCommand();
		try {
			const result = safeSpawn(cmd[0], cmd.slice(1), {
				timeout: 10000,
			});

			this.available = !result.error && result.status === 0;
			if (this.available) {
				this.log(`${this.toolName} found`);
			} else {
				this.log(`${this.toolName} not available`);
			}
		} catch (err) {
			void err;
			this.available = false;
		}

		return this.available;
	}

	isSupportedFile(filePath: string): boolean {
		const ext = path.extname(filePath).toLowerCase();
		return this.getSupportedExtensions().includes(ext);
	}

	abstract checkFile(filePath: string): T[];

	protected runCommand(
		cmd: string[],
		options: {
			cwd?: string;
			timeout?: number;
			input?: string;
		} = {},
	): ReturnType<typeof spawnSync> {
		const { cwd, timeout = 15000 } = options;

		try {
			const result = safeSpawn(cmd[0], cmd.slice(1), {
				timeout,
				cwd,
			});

			if (result.error) {
				this.log(`Command error: ${result.error.message}`);
			}

			// Return in a shape compatible with spawnSync return type
			return {
				status: result.status,
				stdout: result.stdout,
				stderr: result.stderr,
				error: result.error,
			} as unknown as ReturnType<typeof spawnSync>;
		} catch (err: any) {
			this.log(`Command failed: ${err.message}`);
			return {
				error: err,
				status: 1,
				stdout: "",
				stderr: err.message,
			} as unknown as ReturnType<typeof spawnSync>;
		}
	}
}
