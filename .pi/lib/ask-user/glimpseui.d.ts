declare module "glimpseui" {
	export function prompt(
		html: string,
		windowOptions?: {
			width?: number;
			height?: number;
			title?: string;
		},
	): Promise<Record<string, unknown> | null>;
}
