// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Configurações do navegador
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Aumenta os timeouts para sites mais lentos
    navigationTimeout: 60000,
  },
  // Configurações do servidor
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
