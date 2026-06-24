import { test, expect } from '@playwright/test';

/**
 * E2E #4 — Edição e exclusão de paciente.
 *
 * Fluxo: cadastrar paciente (CPF único) -> clicar "Editar" no card dele ->
 * alterar o Nome Completo -> "Salvar Alterações" -> conferir que o novo nome
 * aparece na lista -> clicar "Excluir" (aceitar o confirm) -> conferir que o
 * nome sumiu da lista.
 *
 * Observações da UI (App.tsx):
 *  - Inputs não têm id/label associável -> usamos placeholders e textos.
 *  - Ao clicar "Editar", o formulário do topo é preenchido e o botão de submit
 *    vira "💾 Salvar Alterações".
 *  - A exclusão usa window.confirm -> aceitamos qualquer diálogo automaticamente.
 */
test('edita o nome de um paciente e depois o exclui da lista', async ({ page }) => {
  // Aceita automaticamente o confirm da exclusão.
  page.on('dialog', (dialog) => dialog.accept());

  const sufixo = String(Date.now());
  const nome = `Paciente E2E ${sufixo}`;
  const novoNome = `Paciente Editado ${sufixo}`;
  const cpf = sufixo.slice(-11); // 11 dígitos

  await page.goto('/');

  // --- Cadastro do paciente ---
  await page.getByPlaceholder('Nome Completo').fill(nome);
  await page.getByPlaceholder('000.000.000-00').fill(cpf);
  await page.getByPlaceholder('DD/MM/AAAA').fill('01/01/1990');
  await page.getByPlaceholder('(DD) 00000-0000').fill('31999998888');
  await page.getByPlaceholder('Rua, Número, Bairro').first().fill('Rua das Flores, 123');
  await page.getByRole('button', { name: /Cadastrar Paciente/ }).click();

  // Paciente aparece na lista.
  const cartao = page.locator('li').filter({ hasText: nome });
  await expect(cartao).toBeVisible();

  // --- Edição: clicar "Editar" no card e trocar o nome ---
  await cartao.getByRole('button', { name: /^Editar$/ }).click();
  // O formulário do topo já vem preenchido; substituímos só o nome.
  await page.getByPlaceholder('Nome Completo').fill(novoNome);
  await page.getByRole('button', { name: /Salvar Alterações/ }).click();

  // O novo nome aparece na lista e o antigo some.
  await expect(page.locator('li').filter({ hasText: novoNome })).toBeVisible();
  await expect(page.getByText(nome, { exact: true })).toHaveCount(0);

  // --- Exclusão: remover o paciente e conferir que sumiu ---
  await page.locator('li').filter({ hasText: novoNome }).getByRole('button', { name: /^Excluir$/ }).click();

  await expect(page.getByText(novoNome)).toHaveCount(0);
});
