import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;

/**
 * End-to-end tests: run the real app in a real browser, on desktop and mobile.
 * The OpenWeather API is faked inside the browser (see e2e/mockOpenWeather.ts),
 * so no API key or internet connection is needed.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // Any non-empty key works: every API request is intercepted by the tests.
    env: { VITE_OPENWEATHER_API_KEY: 'e2e-test-key' },
  },
});
