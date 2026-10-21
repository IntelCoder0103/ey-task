import { expect, test } from '@playwright/test';

test('sign in, add, reorder, open detail, finish and sign out', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /sign in to your edit/i })).toBeVisible();

  await page.getByRole('button', { name: /use demo/i }).click();
  await page.getByRole('button', { name: /enter the studio/i }).click();
  const list = page.getByRole('list', { name: 'Tasks' });
  await expect(list).toBeVisible();

  const description = `Collect the cashmere ${Date.now()}`;
  await page.getByLabel('New task').fill(description);
  await page.getByRole('button', { name: /add to the edit/i }).click();
  await expect(list.getByRole('link', { name: description })).toBeVisible();

  await page.getByRole('button', { name: `Move “${description}” up` }).click();
  const titles = await list.getByRole('link').allTextContents();
  expect(titles.at(-2)).toBe(description);

  await list.getByRole('link', { name: description }).click();
  await expect(page.getByRole('heading', { level: 1, name: description })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as finished' }).click();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible();

  await page.getByRole('link', { name: /back to the edit/i }).click();
  await expect(list.getByRole('checkbox', { name: `Finished: ${description}` })).toBeChecked();

  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page.getByRole('heading', { name: /sign in to your edit/i })).toBeVisible();
});
