import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: '*.pw.ts',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 390, height: 844 } } }],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
})
