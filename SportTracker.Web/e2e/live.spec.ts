import { expect, test } from '@playwright/test'
import { addExerciseFromCatalog, closeRestTimerSheet, swipeLeft } from './helpers'

test('séance libre : trois séries, record, minuteur et fin', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('st-auth-token', 'test-token'); localStorage.setItem('st-draft-owner', 'athlete@example.com') })
  const snapshots: { sets: unknown[] }[] = []
  await page.route('http://localhost:5294/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return }
    let body: unknown = null
    if (request.method() === 'DELETE') { await route.fulfill({ status: 204, headers }); return }
    if (url.pathname === '/api/exercises') body = [{ id: 7, name: 'Développé couché', type: 0, muscleGroups: [0], equipment: 'Barre', gifUrl: null, instructionsFr: null }]
    else if (url.pathname === '/api/exercises/7') body = { id: 7, name: 'Développé couché', type: 0, muscleGroups: [0], equipment: 'Barre', gifUrl: null, instructionsFr: null }
    else if (url.pathname === '/api/exercises/7/history') body = []
    else if (url.pathname.includes('/api/workoutsessions/live/') && request.method() === 'PUT') {
      const snapshot = request.postDataJSON() as { sets: unknown[] }
      snapshots.push(snapshot)
      body = { workoutSessionId: 11, sets: snapshot.sets.map((_, index) => ({ id: index + 100 })) }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) })
  })

  await page.goto('/live')
  await expect(page.getByRole('heading', { name: 'Séance libre' }).last()).toBeVisible()
  await addExerciseFromCatalog(page, /Développé couché/)
  await expect(page.getByRole('heading', { name: 'Développé couché' }).first()).toBeVisible()
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: `Valider la série ${index + 1}` }).first().click()
    await closeRestTimerSheet(page)
  }
  await expect(page.getByText('Nouveau record personnel !')).toBeVisible()
  // Validated sets are removed by swiping them to the left (V6SetRow).
  await swipeLeft(page, page.locator('.v6-set-row.is-done').nth(2))
  await expect(page.getByRole('button', { name: 'Supprimer la série 3' })).toBeVisible()
  await page.getByRole('button', { name: 'Supprimer la série 3' }).click()
  await expect(page.locator('.v6-set-row.is-done')).toHaveCount(2)
  await page.getByRole('button', { name: 'Valider la série 3' }).first().click()
  await closeRestTimerSheet(page)
  await page.getByRole('link', { name: 'Séance', exact: true }).click()
  await expect(page.locator('.live-summary')).toContainText('3 séries')
  await page.getByRole('button', { name: 'Terminer' }).first().click()
  await expect(page).toHaveURL(/\/tabs\/today$/)
  expect(snapshots.at(-1)?.sets).toHaveLength(3)
})
