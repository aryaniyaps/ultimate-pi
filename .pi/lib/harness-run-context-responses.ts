export function blockRunContextMessage(content: string) {
	return {
		message: {
			customType: "harness-run-context-block",
			display: true,
			content,
		},
	};
}
