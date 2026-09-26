import { expect, test, type Locator, type Page } from '@playwright/test'
import { swipeLeft } from './helpers'
import { mockHistoryApi } from './historyMock'

// V6 lot 4: Historique (17), Séances (04), détail (06), cardio (07 to 09), historique exercice (16), Progrès (18).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('st-auth-token', 'test-token'); localStorage.setItem('st-draft-owner', 'damien@example.com'); localStorage.setItem('st-install-hint-dismissed', '1')
  })
})

async function longPress(page: Page, locator: Locator) {
  const box = (await locator.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
}

async function swipeRight(page: Page, locator: Locator) {
  await locator.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(100)
  const box = (await locator.boundingBox())!
  const from = { x: box.x + box.width * 0.3, y: box.y + box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let step = 1; step <= 12; step++) await page.mouse.move(from.x + 110 * step / 12, from.y)
  await page.mouse.up()
}

/** Rows of one list (« Séances », « Séances musculation », « Sorties cardio »): the page left behind keeps its own list during the transition. */
const row = (page: Page, name: string, list = 'Séances musculation') => page.locator(`section[aria-label="${list}"] ion-item-sliding.v6-sliding-session`, { hasText: name })
/** Back button of the page on top (the previous page is still in the DOM while the push animates). */
const back = (page: Page) => page.locator('.ion-page:not(.ion-page-hidden) .v6-back').last()

test('historique: segment and period chips filter the page, never change tab; Progrès stays one tap away', async ({ page, context }) => {
  await mockHistoryApi(context)
  await page.goto('/tabs/history')
  await expect(page.getByRole('heading', { name: 'Historique', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Séances par semaine sur six semaines' })).toBeVisible()
  const list = page.locator('.history-list')
  await expect(list.locator('ion-item-sliding')).toHaveCount(6)
  await expect(row(page, 'Haut du corps', 'Séances')).toContainText('PR')
  await expect(row(page, 'Sortie longue', 'Séances')).toContainText('8,2 km')

  await page.locator('ion-segment-button', { hasText: 'Cardio' }).click()
  await expect(list.locator('ion-item-sliding')).toHaveCount(3)
  await expect(page).toHaveURL(/\/tabs\/history$/)
  await page.locator('ion-segment-button', { hasText: 'Muscu' }).click()
  await expect(list.locator('ion-item-sliding')).toHaveCount(3)
  await expect(list).not.toContainText('Sortie longue')
  await page.locator('ion-segment-button', { hasText: 'Tout' }).click()

  const chips = page.getByRole('group', { name: 'Période' }).getByRole('button')
  await expect(chips.first()).toBeVisible()
  await chips.first().click()
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')
  await chips.first().click()
  await expect(list.locator('ion-item-sliding')).toHaveCount(6)

  await page.getByText('Voir mes progrès').click()
  await expect(page).toHaveURL(/\/tabs\/history\/progress$/)
  await expect(page.getByRole('heading', { name: 'Progrès', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Répartition des séries par groupe musculaire' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Minutes d’entraînement par jour cette semaine' })).toBeVisible()
})

test('séances muscu: muscle chips, swipe to delete (action sheet) and to duplicate, long press menu', async ({ page, context }) => {
  const api = await mockHistoryApi(context)
  await page.goto('/tabs/history')
  await page.getByText('Séances musculation').click()
  await expect(page).toHaveURL(/\/tabs\/history\/workouts$/)
  await expect(page.getByText('Musculation · 3 séances')).toBeVisible()
  await expect(row(page, 'Haut du corps')).toContainText('Éch. ×2')
  await expect(row(page, 'Haut du corps')).toContainText('Normal ×5')
  await expect(row(page, 'Haut du corps')).toContainText('Drop ×1')

  await page.getByRole('group', { name: 'Groupe musculaire' }).getByRole('button', { name: 'Jambes' }).click()
  await expect(page.locator('section[aria-label="Séances musculation"] ion-item-sliding')).toHaveCount(2)
  await page.getByRole('group', { name: 'Groupe musculaire' }).getByRole('button', { name: 'Dos', exact: true }).click()
  await expect(page.locator('section[aria-label="Séances musculation"] ion-item-sliding')).toHaveCount(1)
  await page.getByRole('group', { name: 'Groupe musculaire' }).getByRole('button', { name: 'Tous' }).click()

  // Swipe left: red « Supprimer », then the action sheet asks first.
  await swipeLeft(page, row(page, 'Jambes'))
  await page.getByRole('button', { name: 'Supprimer Jambes' }).click()
  await expect(page.getByText('Supprimer « Jambes » ?')).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.locator('ion-action-sheet')).toHaveCount(0)
  expect(api.deletes).toHaveLength(0)
  await swipeLeft(page, row(page, 'Jambes'))
  await page.getByRole('button', { name: 'Supprimer Jambes' }).click()
  await page.getByRole('button', { name: 'Supprimer la séance' }).click()
  await expect.poll(() => api.deletes).toEqual(['/api/workoutsessions/50'])
  await expect(row(page, 'Jambes')).toHaveCount(0)

  // Swipe right: « Dupliquer » posts a copy dated today, without its ids.
  await swipeRight(page, row(page, 'Full body'))
  await page.getByRole('button', { name: 'Dupliquer Full body' }).click()
  await expect.poll(() => api.posts.length).toBe(1)
  expect(api.posts[0].path).toBe('/api/workoutsessions')
  expect(api.posts[0].body).toMatchObject({ name: 'Full body', workoutProgramSessionId: null })
  expect(api.posts[0].body.id).toBeUndefined()
  await expect(row(page, 'Full body')).toHaveCount(2)

  // Long press: context menu, the row did not open.
  await longPress(page, row(page, 'Haut du corps').locator('ion-item'))
  const menu = page.getByRole('menu', { name: 'Haut du corps' })
  await expect(menu).toBeVisible()
  await expect(page).toHaveURL(/\/tabs\/history\/workouts$/)
  await menu.getByRole('menuitem', { name: 'Ouvrir la séance' }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/workouts\/51$/)
  // Back label = the page that pushed the detail.
  await expect(back(page)).toContainText('Séances')
})

test('détail séance muscu: V5 superset, set types, RPE, record star, note; exercise history with its segment', async ({ page, context }) => {
  await mockHistoryApi(context)
  await page.goto('/tabs/history/workouts/51')
  await expect(page.getByRole('heading', { name: 'Haut du corps' })).toBeVisible()
  const superset = page.locator('.history-superset')
  await expect(superset).toContainText('Superset A')
  await expect(superset.locator('.history-exercise')).toHaveCount(2)
  await expect(page.locator('.history-sets li.is-record')).toHaveCount(1)
  await expect(page.locator('.history-sets li.is-record')).toContainText('65 kg')
  await expect(page.getByText('Coudes plus hauts')).toBeVisible()
  await expect(page.locator('.v6-stat-tile', { hasText: 'record' })).toContainText('1')

  // Long press on an exercise: menu with its history.
  await longPress(page, page.getByRole('button', { name: /Tirage vertical/ }))
  await page.getByRole('menuitem', { name: 'Historique de l’exercice' }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/exercises\/2$/)
  await page.goto('/tabs/history/workouts/51')
  await page.getByRole('button', { name: /Développé couché/ }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/exercises\/1$/)
  await expect(back(page)).toContainText('Séance')
  await expect(page.getByText('3 séances · 5 semaines')).toBeVisible()
  await expect(page.getByRole('heading', { name: '1RM estimé · Epley' })).toBeVisible()
  await page.locator('ion-segment-button', { hasText: 'Volume' }).click()
  await expect(page.getByRole('heading', { name: 'Volume par séance' })).toBeVisible()
  await page.locator('ion-segment-button', { hasText: 'Reps' }).click()
  await expect(page.getByRole('heading', { name: 'Répétitions totales' })).toBeVisible()
  await expect(page).toHaveURL(/\/tabs\/history\/exercises\/1$/)
  await expect(page.locator('.v6-record-banner')).toContainText('Record')
})

test('cardio: activity segment, weekly volume, new outing with the duration wheel, detail, edit and delete', async ({ page, context }) => {
  const api = await mockHistoryApi(context)
  await page.goto('/tabs/history/cardio')
  await expect(page.getByRole('heading', { name: 'Cardio', exact: true })).toBeVisible()
  await expect(page.locator('section[aria-label="Sorties cardio"] ion-item-sliding')).toHaveCount(3)
  await page.locator('ion-segment-button', { hasText: 'Vélo' }).click()
  await expect(page.locator('section[aria-label="Sorties cardio"] ion-item-sliding')).toHaveCount(1)
  await page.locator('ion-segment-button', { hasText: 'Course' }).click()
  await expect(page.locator('section[aria-label="Sorties cardio"] ion-item-sliding')).toHaveCount(2)
  await expect(row(page, 'Sortie longue', 'Sorties cardio')).toContainText('PR')

  // « Nouvelle séance cardio » keeps the chosen activity.
  await page.getByRole('button', { name: 'Nouvelle séance cardio' }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/cardio\/new\?type=0$/)
  await page.getByRole('button', { name: 'Enregistrer la sortie' }).click()
  await expect(page.getByText('Indique le nom de ta sortie.')).toBeVisible()
  expect(api.posts).toHaveLength(0)

  await page.getByLabel('Nom', { exact: true }).fill('Fractionné')
  await page.getByLabel('Distance (km)').fill('8,2')
  await page.getByRole('button', { name: /Durée/ }).click()
  const sheet = page.locator('ion-modal.history-duration-sheet')
  await expect(sheet.getByRole('heading', { name: 'Durée' })).toBeVisible()
  await sheet.getByRole('listbox', { name: 'Minutes' }).getByRole('option', { name: '42', exact: true }).click()
  await expect(sheet.getByText('42 min')).toBeVisible()
  await sheet.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText('5:07 /km')).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer la sortie' }).click()
  await expect.poll(() => api.posts.length).toBe(1)
  expect(api.posts[0].body).toMatchObject({ name: 'Fractionné', type: 0, duration: '00:42:00', distance: 8.2, elevationGain: 0 })
  await expect(page).toHaveURL(/\/tabs\/history\/cardio\/901$/)

  await page.goto('/tabs/history/cardio/8')
  await expect(page.getByRole('heading', { name: 'Sortie longue' })).toBeVisible()
  await expect(page.locator('.v6-stat-tile', { hasText: 'allure' })).toContainText('5:07')
  await expect(page.locator('.v6-record-banner')).toContainText('battu de 1,7 km')
  await page.getByRole('button', { name: 'Modifier la sortie' }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/cardio\/8\/edit$/)
  await expect(page.getByLabel('Distance (km)')).toHaveValue('8,2')
  await page.getByLabel('Distance (km)').fill('9')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect.poll(() => api.puts.length).toBe(1)
  expect(api.puts[0]).toMatchObject({ path: '/api/cardiosessions/8', body: { id: 8, distance: 9, duration: '00:42:00', name: 'Sortie longue' } })
  // Back on the detail, refreshed.
  await expect(page).toHaveURL(/\/tabs\/history\/cardio\/8$/)
  await expect(page.locator('.ion-page:not(.ion-page-hidden) .v6-stat-tile', { hasText: 'distance' }).last()).toContainText('9')

  await page.goto('/tabs/history/cardio/8/edit')
  await page.getByRole('button', { name: 'Supprimer la sortie' }).click()
  await page.locator('ion-action-sheet').getByRole('button', { name: 'Supprimer la sortie' }).click()
  await expect.poll(() => api.deletes).toEqual(['/api/cardiosessions/8'])
  await expect(page).toHaveURL(/\/tabs\/history\/cardio$/)
})

test('routes: /workouts/new and /cardio/:id/edit are not swallowed by their :id twins', async ({ page, context }) => {
  await mockHistoryApi(context)
  await page.goto('/tabs/history/workouts/new')
  await expect(page.getByRole('heading', { name: 'Nouvelle séance' }).last()).toBeVisible()
  await expect(back(page)).toContainText('Séances')
  await page.goto('/tabs/history/cardio/7/edit')
  await expect(page.getByRole('heading', { name: 'Modifier la sortie' }).last()).toBeVisible()
})
