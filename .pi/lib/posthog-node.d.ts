declare module "posthog-node" {
	export class PostHog {
		constructor(apiKey: string, options?: { host?: string });
		capture(args: {
			distinctId: string;
			event: string;
			properties?: Record<string, unknown>;
		}): void;
		shutdown(): Promise<void>;
	}
}
