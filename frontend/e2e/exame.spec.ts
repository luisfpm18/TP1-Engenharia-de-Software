import { test, expect } from '@playwright/test';

test.describe('E2E #2 - Fluxo de Exames', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
  });

  test('Deve enviar um exame, exibi-lo na lista e validar a visualização', async ({ page, request }) => {
    const nome = `Leonardo (Exame E2E) ${Date.now()}`;
    const cpf = String(Date.now()).slice(-11).padStart(11, '0');

    // Cria o paciente e valida se a API respondeu certo
    const response = await request.post('http://localhost:8000/pacientes/', {
      data: {
        nome,
        cpf,
        telefone: '31999998888',
        endereco: 'Rua de Teste',
      },
    });

    expect(response.ok()).toBeTruthy();

    // Abre a aplicação
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Espera o paciente aparecer na lista
    await expect(page.getByText(nome)).toBeVisible();

    // Busca o card/linha do paciente pelo NOME, que costuma ser mais confiável que o CPF
    const itemPaciente = page.locator('li').filter({ hasText: nome }).first();
    await expect(itemPaciente).toBeVisible();

    // Botão sem depender do emoji no texto
    await itemPaciente.getByRole('button', { name: /Exames/i }).click();

    // Preenche o formulário
    await page.getByPlaceholder('Ex.: Radiografia panorâmica').fill('Tomografia do siso');
    await page.getByPlaceholder('DD/MM/AAAA').fill('15/06/2026');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'exame_endodontico.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 arquivo de teste Playwright'),
    });

    // Envia o exame
    await page.getByRole('button', { name: /Enviar exame/i }).click();

    // Verifica se apareceu na lista/tabela
    await expect(page.getByText('Tomografia do siso')).toBeVisible();
    await expect(page.getByText('exame_endodontico.pdf')).toBeVisible();

    // Visualiza o arquivo em nova aba
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: /Ver/i }).click(),
    ]);

    await expect(popup).toHaveURL(/\/arquivo/);
  });
});
