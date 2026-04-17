// playwright.config.js
module.exports = {
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'python3 -m http.server 8081',
    port: 8081,
    reuseExistingServer: true,
  },
};
