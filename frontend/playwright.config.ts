import { defineConfig, devices } from '@playwright/test';

/**
 * Config dos testes E2E (TP2).
 *
 * Os E2E rodam contra o STACK REAL: navegador -> frontend (Vite :5173) -> backend
 * (uvicorn :8000) -> Postgres. O backend precisa do Postgres porque o seu `lifespan`
 * roda as migrações `ADD COLUMN IF NOT EXISTS` (sintaxe específica de Postgres).
 *
 * Pré-requisitos para `npm run test:e2e`:
 *   1. Postgres rodando com o banco do .env do backend.
 *   2. `npx playwright install chromium` (uma vez).
 * O bloco `webServer` sobe backend e frontend automaticamente; com `reuseExistingServer`
 * ele reaproveita servidores que o grupo já tenha subido na mão.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // 1 worker => execução sequencial. Os E2E compartilham o mesmo backend/Postgres;
  // rodar em paralelo deixava os testes instáveis (timeouts sob carga). Sequencial é
  // estável e previsível, o que é o que queremos para a apresentação.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      // Backend via venv do próprio backend (carrega o .env -> Postgres).
      command: 'venv/bin/python -m uvicorn main:app --port 8000',
      cwd: '../backend',
      url: 'http://localhost:8000/',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
