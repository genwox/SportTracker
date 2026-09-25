import { expect, test } from '@playwright/test'

test('protected page redirects to login, then returns after a mocked Identity login', async ({ page }) => {
  await page.route('**/login', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST',
        'access-control-allow-headers': 'content-type',
      } })
      return
    }
    expect(route.request().method()).toBe('POST')
    expect(route.request().postDataJSON()).toEqual({ email: 'athlete@example.com', password: 'secret123' })
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ accessToken: 'mock-token', expiresIn: 2592000, refreshToken: '' }) })
  })

  await page.goto('/tabs/programs')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
  await page.getByLabel('Adresse e-mail').fill('athlete@example.com')
  await page.getByLabel('Mot de passe').fill('secret123')
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page).toHaveURL(/\/tabs\/programs$/)
  await expect(page.getByRole('heading', { name: 'Carnets' }).first()).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('st-auth-token'))).toBe('mock-token')
  expect(await page.evaluate(() => localStorage.getItem('st-draft-owner'))).toBe('athlete@example.com')

  await page.reload()
  await expect(page).toHaveURL(/\/tabs\/programs$/)
  await expect(page.getByRole('heading', { name: 'Carnets' }).first()).toBeVisible()
})
