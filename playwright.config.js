// playwright.config.js
module.exports = {
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx serve . -p 8080 -L',
    port: 8080,
    reuseExistingServer: true,
    timeout: 10000,
  },
};
