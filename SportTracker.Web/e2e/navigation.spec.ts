import { expect, test } from '@playwright/test'

test('the three main tabs are available', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('st-auth-token', 'test-token'))
  await page.goto('/')
  for (const label of ['Today', 'Programmes', 'Historique/Progrès']) {
    await expect(page.getByRole('tab', { name: label })).toBeVisible()
  }
  await page.getByRole('tab', { name: 'Programmes' }).click()
  await expect(page.getByRole('heading', { name: 'Carnets' })).toBeVisible()
  await page.getByRole('tab', { name: 'Historique/Progrès' }).click()
  await expect(page.getByRole('heading', { name: 'Historique/Progrès' })).toBeVisible()
})
