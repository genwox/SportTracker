import { expect, test, type Page } from '@playwright/test'
import { addExerciseFromCatalog, closeRestTimerSheet, swipeLeft } from './helpers'

// V6 lot 2 — live workout controls: steppers, keypad, set rows, rest timer sheet, library, mini-bar.
const exercise = (id: number, name: string, muscleGroups: number[], equipment: string) => ({ id, name, type: 0, muscleGroups, equipment, gifUrl: null, instructionsFr: null })
const catalog = [exercise(7, 'Développé couché', [0], 'Barre'), exercise(10, 'Rowing haltère', [1], 'Haltères'), { ...exercise(11, 'Squat', [5], 'Barre'), gifUrl: '/icons/010-Dumbell.svg', instructionsFr: 'Descends hanches en arrière.' }, exercise(12, 'Tirage poitrine', [1], 'Poulie')]
const draftId = '22222222-2222-4222-8222-222222222222'

async function mockApi(page: Page) {
  const puts: { sets: { weight: number; repetitions: number }[] }[] = []
  await page.addInitScript(() => { localStorage.setItem('st-auth-token', 'test-token'); localStorage.setItem('st-draft-owner', 'athlete@example.com'); localStorage.setItem('st-install-hint-dismissed', '1') })
  await page.route('http://localhost:5294/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }
    if (request.method() === 'OPTIONS' || request.method() === 'DELETE') { await route.fulfill({ status: 204, headers }); return }
    let body: unknown = []
    if (url.pathname === '/api/exercises') body = catalog
    else if (/^\/api\/exercises\/\d+$/.test(url.pathname)) body = catalog.find(item => item.id === Number(url.pathname.split('/').pop()))
    else if (url.pathname.includes('/api/workoutsessions/live/') && request.method() === 'PUT') {
      const snapshot = request.postDataJSON() as { sets: { weight: number; repetitions: number }[] }
      puts.push(snapshot)
      body = { workoutSessionId: 11, sets: snapshot.sets.map((_, index) => ({ id: index + 100 })) }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) })
  })
  return puts
}

async function openBenchPress(page: Page) {
  await page.goto(`/live/${draftId}`)
  await expect(page.getByRole('heading', { name: 'Séance libre' }).last()).toBeVisible()
  await addExerciseFromCatalog(page, /Développé couché/)
  await expect(page.getByRole('heading', { name: 'Développé couché' }).first()).toBeVisible()
}

test('steppers: a tap is one step, a long press repeats', async ({ page }) => {
  await mockApi(page)
  await openBenchPress(page)
  await page.getByRole('button', { name: 'Augmenter le poids de 2,5 kg' }).click()
  await expect(page.getByRole('button', { name: 'Poids 22,5 kg, saisie précise' })).toBeVisible()

  const plus = page.getByRole('button', { name: 'Ajouter une répétition' })
  const box = (await plus.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1000) // 400 ms, then one step every 80 ms
  await page.mouse.up()
  const reps = Number((await page.getByRole('button', { name: /répétitions, saisie précise/ }).getAttribute('aria-label'))!.split(' ')[0])
  expect(reps).toBeGreaterThanOrEqual(15)
  await page.waitForTimeout(300)
  await expect(page.getByRole('button', { name: `${reps} répétitions, saisie précise` })).toBeVisible()
})

test('keypad sheet, set validated at the circle, rest timer, swipe to delete', async ({ page }) => {
  const puts = await mockApi(page)
  await openBenchPress(page)

  // 22 · Saisie précise: home-made keypad, never the system keyboard.
  await page.getByRole('button', { name: /Poids .* saisie précise/ }).click()
  const sheet = page.locator('ion-modal.live-pad-sheet:not(.overlay-hidden)')
  await expect(sheet.getByRole('heading', { name: 'Saisie précise' })).toBeVisible()
  await expect.poll(() => sheet.evaluate(el => (el as HTMLIonModalElement).getCurrentBreakpoint())).toBe(0.5)
  const weight = sheet.getByLabel('Poids (kg)')
  await expect(weight).toHaveAttribute('inputmode', 'none')
  await expect(weight).toHaveAttribute('readonly', '')
  const keypad = sheet.getByRole('group', { name: 'Pavé numérique' })
  for (const key of ['6', '2', 'Virgule', '5']) await keypad.getByRole('button', { name: key, exact: true }).click()
  await expect(weight).toHaveValue('62,5')
  await sheet.getByLabel('Répétitions').click()
  await keypad.getByRole('button', { name: '8', exact: true }).click()
  await expect(sheet.getByLabel('Répétitions')).toHaveValue('8')
  await keypad.getByRole('button', { name: 'Effacer' }).click()
  await keypad.getByRole('button', { name: '9', exact: true }).click()
  await sheet.getByRole('button', { name: 'Valider la série' }).click()

  // 23 · Minuteur: opens at the 25 % detent, based on its end time.
  const timer = page.locator('ion-modal.live-timer-sheet:not(.overlay-hidden)')
  await expect(timer.getByRole('heading', { name: 'Minuteur de repos' })).toBeVisible()
  await expect.poll(() => timer.evaluate(el => (el as HTMLIonModalElement).getCurrentBreakpoint())).toBe(0.25)
  await expect(page.locator('.v6-set-row.is-done')).toHaveCount(1)
  await expect(page.locator('.v6-set-row.is-done')).toContainText('62,5 kg × 9')
  await expect.poll(() => puts.at(-1)?.sets).toEqual([expect.objectContaining({ weight: 62.5, repetitions: 9 })])
  await timer.getByRole('button', { name: '+ 30 s' }).click()
  await expect(timer.getByRole('timer')).toHaveText(/^(2:00|1:5\d)$/)
  await timer.getByRole('button', { name: 'Passer le repos' }).click()
  await expect(timer).toHaveCount(0)

  // Next set validated with its circle; the rest timer starts again.
  await page.getByRole('button', { name: 'Valider la série 2' }).first().click()
  await closeRestTimerSheet(page)
  await expect(page.locator('.v6-set-row.is-done')).toHaveCount(2)

  await swipeLeft(page, page.locator('.v6-set-row.is-done').first())
  await page.getByRole('button', { name: 'Supprimer la série 1' }).click()
  await expect(page.locator('.v6-set-row.is-done')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Valider la série 2' }).first()).toBeVisible()
})

test('the rest planned in the timer sheet is kept (presets)', async ({ page }) => {
  await mockApi(page)
  await openBenchPress(page)
  await page.getByRole('button', { name: /Minuteur de repos/ }).click()
  const timer = page.locator('ion-modal.live-timer-sheet:not(.overlay-hidden)')
  await expect.poll(() => timer.evaluate(el => (el as HTMLIonModalElement).getCurrentBreakpoint())).toBe(0.5)
  await timer.locator('ion-segment-button', { hasText: '2 min' }).click()
  await expect(timer.getByText('repos prévu 2:00')).toBeVisible()
  await expect(timer.getByRole('listbox', { name: 'Minutes' }).getByRole('option', { selected: true })).toHaveText('2')
  // The wheel reads its value once it stops: one row down on the seconds → 2:15.
  await timer.getByRole('listbox', { name: 'Secondes' }).evaluate(element => { element.scrollTop = 36 })
  await expect(timer.getByText('repos prévu 2:15')).toBeVisible()
  await expect(timer.getByRole('tab', { name: '2 min' })).toHaveAttribute('aria-selected', 'false')
  await timer.locator('ion-segment-button', { hasText: '2 min' }).click()
  await timer.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByRole('button', { name: /^Minuteur de repos .* 2:00$/ })).toBeVisible()
})

test('library: filters, search and several exercises added at once', async ({ page }) => {
  await mockApi(page)
  await page.goto(`/live/${draftId}`)
  await page.getByRole('button', { name: 'Ajouter un exercice' }).last().click()
  const library = page.locator('ion-modal.live-catalog-sheet:not(.overlay-hidden)')
  await library.getByRole('group', { name: 'Groupe musculaire' }).getByRole('button', { name: 'Dos', exact: true }).click()
  await expect(library.getByRole('status')).toHaveText('2 exercices · Dos')
  await library.getByRole('button', { name: /Rowing haltère/ }).click()
  await library.getByRole('button', { name: /Tirage poitrine/ }).click()
  await library.getByRole('button', { name: 'Ajouter à la séance (2)' }).click()
  await expect(page.locator('.live-summary')).toHaveText('2 exercices · 0 série')

  await page.getByRole('button', { name: 'Ajouter un exercice' }).last().click()
  await library.getByRole('group', { name: 'Groupe musculaire' }).getByRole('button', { name: 'Tous' }).click()
  await library.getByRole('searchbox').fill('squat')
  await expect(library.getByRole('status')).toHaveText('1 exercice')
})

test('the « séance en cours » mini-bar stays above the tabs and reopens the workout', async ({ page }) => {
  await mockApi(page)
  await openBenchPress(page)
  await page.getByRole('button', { name: 'Valider la série 1' }).first().click()
  await closeRestTimerSheet(page)
  await page.getByRole('link', { name: 'Séance', exact: true }).click()
  await expect(page.locator('.live-summary')).toHaveText('1 exercice · 1 série')
  await page.getByRole('link', { name: 'Aujourd’hui' }).click()
  await expect(page).toHaveURL(/\/tabs\/today$/)

  const bar = page.getByRole('button', { name: /Rouvrir la séance en cours : Développé couché, Série 2\/3/ })
  await expect(bar).toBeVisible()
  await expect(page.getByRole('button', { name: 'Passer le repos' })).toBeVisible()
  await page.getByRole('tab', { name: 'Historique' }).click()
  await expect(bar).toBeVisible()
  await page.getByRole('button', { name: 'Passer le repos' }).click()
  await expect(page.getByRole('button', { name: 'Passer le repos' })).toHaveCount(0)

  await bar.click()
  await expect(page).toHaveURL(new RegExp(`/live/${draftId}$`))
  await page.getByRole('button', { name: 'Terminer' }).first().click()
  await expect(page).toHaveURL(/\/tabs\/today$/)
  await expect(page.locator('.v6-live-bar')).toHaveCount(0)
})

test('the GIF demo stays one tap away in the library and on the live exercise', async ({ page }) => {
  await mockApi(page)
  await page.goto(`/live/${draftId}`)
  await page.getByRole('button', { name: 'Ajouter un exercice' }).last().click()
  const library = page.locator('ion-modal.live-catalog-sheet:not(.overlay-hidden)')
  await expect(library.getByRole('button', { name: /Squat/ }).locator('img.v5-thumb')).toHaveAttribute('src', '/icons/010-Dumbell.svg')
  await library.getByRole('button', { name: /Squat/ }).click()
  await library.getByRole('button', { name: 'Ajouter à la séance' }).click()
  await expect(page.getByRole('heading', { name: 'Squat' }).first()).toBeVisible()
  await page.getByRole('button', { name: /Voir le mouvement/ }).click()
  await expect(page.getByRole('img', { name: 'Démonstration : Squat' })).toBeVisible()
  await expect(page.getByText('Descends hanches en arrière.')).toBeVisible()
})
