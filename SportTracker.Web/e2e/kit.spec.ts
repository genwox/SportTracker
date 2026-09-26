import { expect, test, type Page } from '@playwright/test'

// V6 kit gestures (lot 1). Ionic gestures accept mouse drags, so these run in WebKit and Chromium alike.
test.beforeEach(async ({ page, context }) => {
  await page.addInitScript(() => { localStorage.setItem('st-auth-token', 'test-token'); localStorage.setItem('st-install-hint-dismissed', '1') })
  await context.route('http://localhost:5294/**', route => route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '[]' }))
  await page.goto('/tabs/profile/kit')
  await expect(page.getByRole('heading', { name: 'Kit V6' })).toBeVisible()
})

async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let step = 1; step <= 12; step++) await page.mouse.move(from.x + dx * step / 12, from.y + dy * step / 12)
  await page.mouse.up()
}

// iOS Safari broke Ionic's JS gestures when the whole page was set to 'pan-x pan-y'.
test('the page keeps Ionic’s touch-action so its gestures work on iPhone', async ({ page }) => {
  expect(await page.evaluate(() => [document.documentElement, document.body].map(el => getComputedStyle(el).touchAction))).toEqual(['manipulation', 'manipulation'])
})

test('sliding a session reveals Supprimer on the left swipe and Dupliquer on the right swipe', async ({ page }) => {
  const row = page.locator('ion-item-sliding').first()
  await row.scrollIntoViewIfNeeded()
  const box = (await row.boundingBox())!
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

  await drag(page, middle, -110, 0)
  await expect.poll(() => row.evaluate(el => (el as HTMLIonItemSlidingElement).getOpenAmount())).toBeGreaterThan(0)
  await row.getByText('Supprimer').click()
  await expect(page.getByRole('button', { name: 'Supprimer la séance' })).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()

  await expect.poll(() => row.evaluate(el => (el as HTMLIonItemSlidingElement).getOpenAmount())).toBe(0)
  await page.waitForTimeout(700) // Ionic re-enables the gesture 600 ms after closing.
  await drag(page, middle, 140, 0)
  await expect.poll(() => row.evaluate(el => (el as HTMLIonItemSlidingElement).getOpenAmount())).toBeLessThan(0)
  await expect(row.getByText('Dupliquer')).toBeVisible()
})

test('tapping the sheet handle moves to the next detent', async ({ page }) => {
  await page.getByRole('button', { name: 'Feuille 50 %' }).click()
  const sheet = page.locator('ion-modal.v6-sheet')
  await expect.poll(() => sheet.evaluate(el => (el as HTMLIonModalElement).getCurrentBreakpoint())).toBe(0.5)
  await sheet.locator('.modal-handle').click()
  await expect.poll(() => sheet.evaluate(el => (el as HTMLIonModalElement).getCurrentBreakpoint())).toBe(1)
})

test('the confirmation banner (toast) appears at the top', async ({ page }) => {
  await page.getByRole('button', { name: 'Bandeau succès' }).click()
  await expect(page.locator('ion-toast.v6-toast')).toBeVisible()
})
