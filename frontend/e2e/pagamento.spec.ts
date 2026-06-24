import { test, expect } from '@playwright/test';

test.describe('E2E #3 - Fluxo Financeiro (Pagamentos)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
  });

  test('Deve registrar, conferir e editar o valor de um pagamento', async ({ page, request }) => {
    const nome = `Luis (Pagamento E2E) ${Date.now()}`;
    const cpf = String(Date.now()).slice(-11).padStart(11, '0');

    // Cria o paciente via API e valida a resposta
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

    // Abre a tela Financeiro do paciente
    const itemPaciente = page.locator('li').filter({ hasText: nome }).first();
    await itemPaciente.getByRole('button', { name: /Financeiro/i }).click();

    // Preenche o formulário de pagamento
    await page.getByPlaceholder('00,00').fill('100');
    await page.getByPlaceholder('DD/MM/AAAA').fill('20/06/2026');
    await page.getByPlaceholder('Limpeza, Manutenção, Tratamento...').fill('Profilaxia');
    await page.getByRole('combobox').selectOption('PIX');

    // Registra o pagamento
    await page.getByRole('button', { name: /Registrar Pagamento/i }).click();

    // Confere o valor formatado no histórico
    await expect(page.getByText('R$ 100,00')).toBeVisible();

    // Edita o pagamento: troca o valor para 150
    await page.getByRole('button', { name: /^Editar$/ }).click();
    await page.getByPlaceholder('00,00').fill('150');
    await page.getByRole('button', { name: /Salvar Alterações/i }).click();

    // Confere o novo valor formatado
    await expect(page.getByText('R$ 150,00')).toBeVisible();
    await expect(page.getByText('R$ 100,00')).toHaveCount(0);
  });
});
