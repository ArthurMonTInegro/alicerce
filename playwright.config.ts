import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  // O servidor real (API + páginas pré-renderizadas), com banco descartável.
  webServer: {
    command: 'node --disable-warning=ExperimentalWarning apps/api/src/main.ts',
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    // Pagamento simulado e e-mails num arquivo (e2e/contas.spec.ts); AUTH_RATE_LIMIT dá folga ao limite
    // de cadastros e entradas por IP, porque todos os testes saem de 127.0.0.1 (só vale fora de produção).
    env: { PORT: String(PORT), HOST: '127.0.0.1', DATABASE_PATH: 'test-results/e2e.db', ANTHROPIC_API_KEY: '', PAGAMENTO_PROVEDOR: 'teste', EMAIL_LOG_PATH: 'test-results/emails.log', AUTH_RATE_LIMIT: '50' },
  },
});
