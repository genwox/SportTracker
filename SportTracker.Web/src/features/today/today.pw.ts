import { expect, test } from '@playwright/test'

test('Today shows cached sessions on return and refreshes through IonRefresher', async ({ page }) => {
  let calls = 0
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  await page.addInitScript(() => {
    localStorage.setItem('st-auth-token', 'mock-token')
    localStorage.setItem('st-draft-owner', 'athlete@example.com')
  })
  await page.route('**/api/workoutsessions', async route => {
    calls++
    if (calls > 1) await blocked
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify([{ id: 1, name: 'Séance du jour', date: new Date().toISOString(), duration: '01:00:00', workoutExercises: [] }]) })
  })
  await page.route('**/api/cardiosessions', route => route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' }, body: '[]' }))

  await page.goto('/tabs/today')
  await expect(page.getByRole('heading', { name: 'Séance du jour' })).toBeVisible()
  await page.getByRole('tab', { name: 'Programmes' }).click()
  await page.getByRole('tab', { name: 'Aujourd’hui' }).click()
  await expect(page.getByRole('heading', { name: 'Séance du jour' })).toBeVisible()
  // Scoped to Today: the hidden Carnets tab keeps its own skeleton (api/programs is not mocked here).
  await expect(page.locator('.today-page .v6-skeleton')).toHaveCount(0)
  await page.locator('ion-content:has(.today-page) ion-refresher').evaluate(element => element.dispatchEvent(new CustomEvent('ionRefresh', { bubbles: true })))
  await expect.poll(() => calls).toBeGreaterThanOrEqual(2)
  await expect(page.getByRole('heading', { name: 'Séance du jour' })).toBeVisible()
  release()
})
