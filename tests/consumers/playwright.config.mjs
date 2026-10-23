import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: '.', testMatch: 'browser.spec.mjs', workers: 1, timeout: 20000,
 use: { baseURL: process.env.STATE_MOTION_TEST_URL, viewport: { width: 960, height: 720 } },
 projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
 reporter: [['list'], ['json', { outputFile: `${process.env.STATE_MOTION_EVIDENCE_DIR}/playwright.json` }]],
 outputDir: `${process.env.STATE_MOTION_EVIDENCE_DIR}/browser-results`,
});
