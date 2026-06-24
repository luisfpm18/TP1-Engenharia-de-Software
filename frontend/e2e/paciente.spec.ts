import { test, expect } from '@playwright/test';

/**
 * E2E #1 — Cadastro de paciente + Anamnese (Ficha Clínica).
 *
 * Fluxo: cadastrar paciente -> abrir a Ficha Clínica -> marcar campos críticos
 * (Diabético e Grávida) -> salvar. Asserção reforçada no fim: depois de salvar a
 * ficha, o paciente recém-criado continua visível na lista pelo nome.
 *
 * Observações da UI (App.tsx):
 *  - Inputs não têm id/label associável -> usamos placeholders e textos.
 *  - Salvar ficha dispara um window.alert; exclusões usam window.confirm.
 *    Por isso aceitamos qualquer diálogo automaticamente.
 */
test('cadastra paciente e preenche anamnese marcando diabético e grávida', async ({ page }) => {
  // Aceita automaticamente alert (ficha salva) e confirm (exclusões).
  page.on('dialog', (dialog) => dialog.accept());

  // Nome e CPF únicos para o teste ser independente de execuções anteriores.
  const sufixo = String(Date.now());
  const nome = `Paciente E2E ${sufixo}`;
  const cpf = sufixo.slice(-11); // 11 dígitos

  await page.goto('/');

  // --- Cadastro do paciente ---
  await page.getByPlaceholder('Nome Completo').fill(nome);
  await page.getByPlaceholder('000.000.000-00').fill(cpf);
  await page.getByPlaceholder('DD/MM/AAAA').fill('01/01/1990');
  await page.getByPlaceholder('(DD) 00000-0000').fill('31999998888');
  // "Rua, Número, Bairro" aparece 2x (residencial e comercial) -> usa o primeiro.
  await page.getByPlaceholder('Rua, Número, Bairro').first().fill('Rua das Flores, 123');
  await page.getByRole('button', { name: /Cadastrar Paciente/ }).click();

  // Paciente aparece na lista.
  const cartao = page.locator('li').filter({ hasText: nome });
  await expect(cartao).toBeVisible();

  // --- Abre a Ficha Clínica (Anamnese) do paciente ---
  await cartao.getByRole('button', { name: /Ficha Clínica/ }).click();
  await expect(page.getByRole('heading', { name: /Anamnese Clínica/ })).toBeVisible();

  // --- Marca os campos críticos (checkboxes dentro de <label> com o texto) ---
  await page.getByText('Diabético(a)?').click();
  await page.getByText('Está Grávida?').click();

  // --- Salva a ficha (dispara o alert, já aceito acima) ---
  await page.getByRole('button', { name: /Salvar Ficha Clínica Completa/ }).click();

  // Após salvar, a tela volta para a lista (a Ficha fecha).
  await expect(page.getByRole('heading', { name: 'Pacientes cadastrados' })).toBeVisible();

  // Asserção reforçada: o paciente criado continua visível na lista pelo nome.
  await expect(page.locator('li').filter({ hasText: nome })).toBeVisible();

  // Confirma que os checkboxes foram realmente persistidos: reabre a ficha e
  // verifica que Diabético e Grávida vieram marcados do backend.
  await page.locator('li').filter({ hasText: nome }).getByRole('button', { name: /Ficha Clínica/ }).click();
  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes.nth(0)).toBeChecked(); // Diabético(a)?
  await expect(checkboxes.nth(1)).toBeChecked(); // Está Grávida?
});
