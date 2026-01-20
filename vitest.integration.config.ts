import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["test/integration/**/*.test.ts"],
		testTimeout: 60000, // 60s for network operations
		hookTimeout: 30000,
		retry: 2, // Retry flaky tests
		pool: "forks", // Run tests in separate processes for isolation
		sequence: {
			concurrent: false, // Run integration tests sequentially to avoid rate limiting
		},
		disableConsoleIntercept: true, // Required for @oclif/test to capture stdout/stderr
	},
});
