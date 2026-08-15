import { defineConfig } from '@playwright/test';

export default defineConfig({
	retries: process.env.CI ? 2 : 0,
	webServer: [
		{
			command: 'pnpm run dev:e2e',
			port: 8787,
			cwd: '../api',
			reuseExistingServer: true,
		},
		{
			command: 'pnpm dev',
			port: 5173,
			reuseExistingServer: true,
		},
	],
	use: { baseURL: 'http://localhost:5173' },
	testMatch: '**/*.e2e.{ts,js}'
});
