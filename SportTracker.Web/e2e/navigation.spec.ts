import { expect, test } from '@playwright/test'

test('the three main tabs are available', async ({ page }) => {
  await page.goto('/')
  for (const label of ['Today', 'Programmes', 'Historique/Progrès']) {
    await expect(page.getByRole('tab', { name: label })).toBeVisible()
  }
  await page.getByRole('tab', { name: 'Programmes' }).click()
  await expect(page.getByRole('heading', { name: 'Programmes' })).toBeVisible()
  await page.getByRole('tab', { name: 'Historique/Progrès' }).click()
  await expect(page.getByRole('heading', { name: 'Historique/Progrès' })).toBeVisible()
})
