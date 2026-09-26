import { expect, test, type Locator, type Page } from '@playwright/test'
import { swipeLeft } from './helpers'
import { mockProgramsApi } from './programsMock'

// V6 lot 3: Aujourd’hui (03, 24) and Carnets (10 to 14). Ionic gestures accept mouse drags, so this runs in WebKit and Chromium.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('st-auth-token', 'test-token'); localStorage.setItem('st-draft-owner', 'damien@example.com'); localStorage.setItem('st-install-hint-dismissed', '1')
  })
})

type Body = { sessions: { id?: number; name: string; exercises: { exerciseId: number; order: number; targetSets: number; targetRepsMin: number; targetRepsMax: number; restSeconds: number }[] }[] }
const session = (body: unknown, id: number) => (body as Body).sessions.find(item => item.id === id)!

/** Holds the mouse still on a row: the context menu opens after 500 ms. */
async function longPress(page: Page, locator: Locator) {
  const box = (await locator.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
}

test('carnets: V5 statuses, long press menu, duplicate and delete with confirmation', async ({ page, context }) => {
  const api = await mockProgramsApi(context)
  await page.goto('/tabs/programs')
  const ppl = page.locator('ion-item.v6-session-row', { hasText: 'Push Pull Legs' })
  await expect(ppl).toContainText('3 séances · 7 exercices')
  await expect(ppl).toContainText('Actif')
  await expect(ppl).toContainText('Superset')
  await expect(ppl).toContainText('33 % de la semaine')

  await longPress(page, ppl)
  const menu = page.getByRole('menu', { name: 'Push Pull Legs' })
  await expect(menu).toBeVisible()
  await expect(page).toHaveURL(/\/tabs\/programs$/) // the long press did not open the carnet
  await menu.getByRole('menuitem', { name: 'Dupliquer' }).click()
  await expect.poll(() => api.posts.length).toBe(1)
  expect(api.posts[0]).toMatchObject({ name: 'Push Pull Legs (copie)', colorHex: '#4A90D9' })
  await expect(page.locator('ion-item.v6-session-row', { hasText: 'Push Pull Legs (copie)' })).toBeVisible()

  await page.locator('ion-item.v6-session-row', { hasText: 'Prépa course' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Supprimer le carnet' }).click()
  await page.getByRole('button', { name: 'Supprimer le carnet' }).click()
  await expect.poll(() => api.deletes).toEqual(['5'])
  await expect(page.locator('ion-item.v6-session-row', { hasText: 'Prépa course' })).toHaveCount(0)

  await ppl.first().click()
  await expect(page).toHaveURL(/\/tabs\/programs\/3$/)
})

test('nouveau carnet: inset form, errors in ink, sticky « Créer le carnet »', async ({ page, context }) => {
  const api = await mockProgramsApi(context)
  await page.goto('/tabs/programs/new')
  await page.getByRole('button', { name: 'Créer le carnet' }).click()
  await expect(page.getByText('Indique le nom du carnet.')).toBeVisible()
  expect(api.posts).toHaveLength(0)

  await page.getByLabel('Nom', { exact: true }).fill('Haut / Bas')
  await page.getByLabel('Séance 1').fill('Haut')
  await page.getByRole('button', { name: 'Ajouter une séance' }).click()
  await page.getByLabel('Séance 2').fill('Bas')
  await page.getByRole('button', { name: 'Couleur vert' }).click()
  await page.getByRole('button', { name: 'Créer le carnet' }).click()
  await expect.poll(() => api.posts.length).toBe(1)
  expect(api.posts[0]).toMatchObject({ name: 'Haut / Bas', colorHex: '#5BBD72', sessions: [{ name: 'Haut', order: 0 }, { name: 'Bas', order: 1 }] })
  await expect(page).toHaveURL(/\/tabs\/programs\/91$/)
})

test('détail du carnet: Fait / À faire, then « Démarrer » opens the next session live', async ({ page, context }) => {
  await mockProgramsApi(context)
  await page.goto('/tabs/programs/3')
  await expect(page.locator('ion-item.v6-session-row', { hasText: 'Push' }).first()).toContainText('Fait')
  await expect(page.locator('ion-item.v6-session-row', { hasText: 'Pull' })).toContainText('À faire')
  await expect(page.locator('ion-item.v6-session-row', { hasText: 'Push' }).first()).toContainText('superset A')
  await expect(page.getByText('Semaine · 1 / 3 séances')).toBeVisible()

  await page.locator('ion-item.v6-session-row', { hasText: 'Legs' }).click({ button: 'right' })
  await expect(page.getByRole('menu', { name: 'Legs' }).getByRole('menuitem')).toHaveText(['Démarrer en live', 'Ouvrir la séance', 'Modifier', 'Dupliquer'])
  await page.getByRole('menuitem', { name: 'Ouvrir la séance' }).click()
  await expect(page).toHaveURL(/\/tabs\/programs\/3\/sessions\/11$/)
  await page.goto('/tabs/programs/3')
  await page.getByRole('button', { name: 'Démarrer Pull' }).click()
  await expect(page).toHaveURL(/\/live\/programs\/3\/sessions\/10\/exercises\/2$/)
})

test('séance du carnet: badges V5, reorder with the handle, swipe to remove with an action sheet', async ({ page, context }) => {
  const api = await mockProgramsApi(context)
  await page.goto('/tabs/programs/3/sessions/12')
  const rows = page.locator('ion-item-sliding.v6-reorder-row')
  await expect(rows).toHaveCount(4)
  await expect(rows.nth(0)).toContainText('Superset A · enchaîné sans repos')
  await expect(rows.nth(0)).toContainText('Éch. · 20 kg × 12')
  await expect(rows.nth(3)).toContainText('Échec · 12 kg × 12')
  await expect(page.getByText('4 exercices • 14 séries • 1 superset')).toBeVisible()

  // Drag « Élévations latérales » (4th) to the top with its ≡ handle.
  const handle = page.getByLabel('Déplacer Élévations latérales')
  // Centre it: at the bottom of the viewport it would sit under the sticky action bar.
  await handle.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(100)
  const from = (await handle.boundingBox())!, to = (await page.getByLabel('Déplacer Développé couché').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  for (let step = 1; step <= 20; step++) await page.mouse.move(from.x + from.width / 2, from.y + (to.y - from.y - 20) * step / 20 + from.height / 2)
  await page.mouse.up()
  await expect.poll(() => api.puts.length).toBe(1)
  expect(session(api.puts[0], 12).exercises.map(item => item.exerciseId)).toEqual([4, 1, 2, 3])
  await expect(rows.nth(0)).toContainText('Élévations latérales')

  // Swipe « Développé militaire » to the left, then confirm in the action sheet.
  await swipeLeft(page, page.locator('ion-item-sliding.v6-reorder-row', { hasText: 'Développé militaire' }))
  await page.getByRole('button', { name: 'Retirer Développé militaire' }).click()
  await expect(page.getByText('Retirer « Développé militaire » ?')).toBeVisible()
  await page.getByRole('button', { name: 'Retirer l’exercice' }).click()
  await expect.poll(() => api.puts.length).toBe(2)
  expect(session(api.puts[1], 12).exercises.map(item => [item.exerciseId, item.order])).toEqual([[4, 0], [1, 1], [2, 2]])
  await expect(rows).toHaveCount(3)

  await rows.nth(1).getByRole('button', { name: /^Développé couché/ }).click()
  await expect(page).toHaveURL(/\/live\/programs\/3\/sessions\/12\/exercises\/1$/)
})

test('nouvelle séance du carnet: library sheet, steppers, rest at the wheel, sticky « Créer la séance »', async ({ page, context }) => {
  const api = await mockProgramsApi(context)
  await page.goto('/tabs/programs/3')
  await page.getByRole('button', { name: 'Nouvelle séance' }).click()
  await expect(page).toHaveURL(/\/tabs\/programs\/3\/sessions\/new$/)
  await page.getByRole('button', { name: 'Créer la séance' }).click()
  await expect(page.getByText('Indique le nom de la séance.')).toBeVisible()

  await page.getByLabel('Nom', { exact: true }).fill('Bras')
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.getByRole('button', { name: /Curl biceps/ }).click()
  await page.getByRole('button', { name: /Élévations latérales/ }).click()
  await page.getByRole('button', { name: 'Ajouter à la séance (2)' }).click()
  await expect(page.getByText('Paramètres · Élévations latérales')).toBeVisible()
  await page.getByRole('button', { name: 'Augmenter séries' }).click()
  await page.getByRole('button', { name: 'Augmenter reps max' }).click()
  await page.locator('ion-item', { hasText: 'Repos' }).last().click()
  const sheet = page.locator('ion-modal.program-rest-sheet')
  await expect(sheet.getByRole('heading', { name: 'Repos' })).toBeVisible()
  await sheet.getByRole('option', { name: '2', exact: true }).click()
  await expect(sheet.getByText('2 min 30 s')).toBeVisible()
  await sheet.getByRole('button', { name: 'Valider' }).click()
  await expect(page.locator('ion-item', { hasText: 'Repos' }).last()).toContainText('2 min 30 s')

  await page.getByRole('button', { name: 'Créer la séance' }).click()
  await expect.poll(() => api.puts.length).toBe(1)
  const created = (api.puts[0] as Body).sessions.find(item => item.name === 'Bras')!
  expect(created.exercises).toEqual([
    expect.objectContaining({ exerciseId: 6, order: 0, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 }),
    expect.objectContaining({ exerciseId: 4, order: 1, targetSets: 4, targetRepsMin: 8, targetRepsMax: 13, restSeconds: 150 }),
  ])
  await expect(page).toHaveURL(/\/tabs\/programs\/3$/)
  await expect(page.locator('ion-item.v6-session-row', { hasText: 'Bras' })).toContainText('2 exercices')
})

test('aujourd’hui: the next carnet session with « Commencer », then the empty state (24)', async ({ page, context }) => {
  await mockProgramsApi(context)
  await page.goto('/tabs/today')
  await expect(page.getByText('Ta séance du jour · Push Pull Legs')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()
  await page.getByRole('button', { name: 'Commencer' }).click()
  await expect(page).toHaveURL(/\/live\/programs\/3\/sessions\/10\/exercises\/2$/)
})

test('accueil sans séance: direct mode steps and « Créer un exercice personnalisé » in a sheet', async ({ page, context }) => {
  await mockProgramsApi(context, { programs: [], workouts: [] })
  await page.goto('/tabs/today')
  await expect(page.getByRole('heading', { name: 'Aucune séance prévue' })).toBeVisible()
  await expect(page.getByText('Tout est synchronisé · rien en attente')).toBeVisible()
  await expect(page.getByLabel('Séance à vide, mode direct')).toContainText('1 · Exercice2 · Type de série3 · RPE')
  await page.getByText('Créer un exercice personnalisé').click()
  await expect(page.getByRole('heading', { name: 'Nouvel exercice' })).toBeVisible()
  await page.getByLabel('Nom').fill('Tirage poitrine')
  await page.getByRole('button', { name: 'Créer l’exercice' }).click()
  await expect(page.locator('ion-toast.v6-toast')).toContainText('« Tirage poitrine » ajouté à la bibliothèque')
  await page.getByRole('button', { name: 'Démarrer une séance à vide' }).click()
  await expect(page).toHaveURL(/\/live(\/[\w-]+)?$/)
})
