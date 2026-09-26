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

// IonRouterOutlet keeps the LAST matching route: a static path declared before its :param twin was swallowed by it.
test('creation pages are not swallowed by their :id detail routes', async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem('st-auth-token', 'test-token'))
  await context.route('http://localhost:5294/**', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    body: JSON.stringify(route.request().url().endsWith('/api/programs/3') ? { id: 3, name: 'Push Pull Legs', sessions: [] } : []) }))
  for (const [path, heading] of [['/tabs/programs/new', 'Nouveau carnet'], ['/tabs/programs/3/sessions/new', 'Nouvelle séance'], ['/tabs/history/cardio/new', 'Nouvelle sortie']] as const) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading }).last()).toBeVisible()
  }
})
