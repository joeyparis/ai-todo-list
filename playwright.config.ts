import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  use: { baseURL: 'http://localhost:3001' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /responsive/,
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        hasTouch: true,
      },
      testMatch: /responsive/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
  },
})
