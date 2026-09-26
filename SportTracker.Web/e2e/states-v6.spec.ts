import { expect, test, type Locator, type Page } from '@playwright/test'
import { swipeLeft } from './helpers'
import { daysAgo, mockHistoryApi } from './historyMock'

// V6 lot 5: Connexion (01), Inscription (02), Nouvelle séance muscu (05), Profil (19), Page introuvable (20),
// Modifier une séance (21), Erreur d’enregistrement (25), Chargement (26).

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }
const signedIn = (page: Page) => page.addInitScript(() => {
  if (!sessionStorage.getItem('st-test-signed-out')) { localStorage.setItem('st-auth-token', 'test-token'); localStorage.setItem('st-draft-owner', 'damien@example.com') }
  localStorage.setItem('st-install-hint-dismissed', '1')
})
/** The page on top (the previous one stays in the DOM during a push). */
const top = (page: Page) => page.locator('.ion-page:not(.ion-page-hidden)').last()
/** A segment button (Ionic’s own element takes the click). */
const segment = (scope: Page | Locator, label: string) => scope.locator('ion-segment-button', { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
const openSheet = (page: Page, className: string) => page.locator(`ion-modal.${className}:not(.overlay-hidden)`)

async function dragHandle(page: Page, handle: Locator, target: Locator) {
  await handle.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(100)
  const from = (await handle.boundingBox())!, to = (await target.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  for (let step = 1; step <= 20; step++) await page.mouse.move(from.x + from.width / 2, from.y + (to.y - from.y - 20) * step / 20 + from.height / 2)
  await page.mouse.up()
}

/** No red in the error state (form errors, notice, pending list, toast): computed colours. Red stays for deletion controls only. */
async function reds(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll('.ion-page:not(.ion-page-hidden) :is(.v6-notice, .v6-list-group, .auth-card, .wf-error) *, .ion-page:not(.ion-page-hidden) :is(.v6-notice, .v6-list-group, .auth-card), ion-toast')].filter(element => {
    const style = getComputedStyle(element)
    return [style.color, style.borderTopColor, style.backgroundColor].some(value => {
      const match = /rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?/.exec(value)
      return !!match && Number(match[4] ?? 1) > 0.2 && Number(match[1]) > 170 && Number(match[2]) < 90 && Number(match[3]) < 90
    })
  }).map(element => element.className || element.tagName))
}

test('connexion: segment to inscription, 16 px fields, « Rester connecté » off keeps the token for the session only', async ({ page }) => {
  await page.route('http://localhost:5294/**', async route => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (new URL(request.url()).pathname === '/login') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ accessToken: 'session-token' }) })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  await page.goto('/tabs/history')
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Ftabs%2Fhistory$/)
  await expect(page.getByRole('heading', { name: 'Heureux de te retrouver.' })).toBeVisible()
  // iOS zooms into any field under 16 px.
  expect(await page.locator('input[type=email], input[type=password], input[type=text]').evaluateAll(inputs => inputs.map(input => parseFloat(getComputedStyle(input).fontSize)))).toEqual([16, 16])

  await segment(page, 'Créer un compte').click()
  await expect(page).toHaveURL(/\/register\?returnUrl=%2Ftabs%2Fhistory$/)
  await expect(page.getByRole('heading', { name: 'Commençons.' })).toBeVisible()
  await segment(page, 'Connexion').click()
  await expect(page).toHaveURL(/\/login\?returnUrl=/)

  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('alert')).toContainText('Indique ton adresse e-mail et ton mot de passe.')
  await page.getByLabel('Adresse e-mail').fill('athlete@example.com')
  await page.getByLabel('Mot de passe').fill('secret123')
  await page.getByRole('switch', { name: 'Rester connecté 30 jours' }).click()
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/tabs\/history$/)
  expect(await page.evaluate(() => [localStorage.getItem('st-auth-token'), sessionStorage.getItem('st-auth-token')])).toEqual([null, 'session-token'])
})

test('inscription: password mismatch in ink, then the weekly goal chosen in the segment is saved', async ({ page }) => {
  await page.route('http://localhost:5294/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (path === '/register') return route.fulfill({ status: 200, headers: cors })
    if (path === '/login') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ accessToken: 'new-token' }) })
    if (path === '/manage/info') return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ email: 'new@example.com' }) })
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '[]' })
  })
  await page.goto('/register')
  await page.getByLabel('Adresse e-mail').fill('new@example.com')
  await page.getByLabel('Mot de passe', { exact: true }).fill('secret123')
  await page.getByLabel('Confirmation').fill('secret124')
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByText('Les mots de passe ne correspondent pas.')).toBeVisible()
  expect(await reds(page)).toEqual([])

  await page.getByLabel('Confirmation').fill('secret123')
  await segment(page, '3 séances').click()
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page).toHaveURL(/\/tabs\/today$/)
  expect(await page.evaluate(() => localStorage.getItem('st-weekly-goal:v1:new@example.com'))).toBe('3')
})

test('profil: stats, inset preferences with toggles, sign out confirmed in an action sheet', async ({ page, context }) => {
  await signedIn(page)
  await mockHistoryApi(context)
  await page.goto('/tabs/today')
  await page.getByRole('link', { name: 'Profil' }).first().click()
  await expect(page).toHaveURL(/\/tabs\/profile$/)
  const profile = top(page)
  await expect(profile.getByRole('heading', { name: 'Damien' })).toBeVisible()
  await expect(profile.getByText('damien@example.com')).toBeVisible()
  await expect(profile.locator('.v6-stat-tile')).toHaveCount(3)
  await expect(profile.locator('.v6-back')).toContainText('Aujourd’hui')

  const rpe = profile.getByRole('switch', { name: 'Afficher le RPE' })
  await expect(rpe).toBeChecked()
  await rpe.click()
  await expect(rpe).not.toBeChecked()
  expect(await page.evaluate(() => localStorage.getItem('st-pref:v1:show-rpe'))).toBe('0')

  await profile.getByRole('switch', { name: 'Rester connecté 30 jours' }).click()
  expect(await page.evaluate(() => [localStorage.getItem('st-auth-token'), sessionStorage.getItem('st-auth-token')])).toEqual([null, 'test-token'])
  await profile.getByRole('switch', { name: 'Rester connecté 30 jours' }).click()
  expect(await page.evaluate(() => localStorage.getItem('st-auth-token'))).toBe('test-token')

  await profile.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page.getByText('Se déconnecter ?')).toBeVisible()
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(page.locator('ion-action-sheet')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('st-auth-token'))).toBe('test-token')
  await page.evaluate(() => sessionStorage.setItem('st-test-signed-out', '1'))
  await profile.getByRole('button', { name: 'Se déconnecter' }).click()
  await page.locator('ion-action-sheet').last().getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => localStorage.getItem('st-auth-token'))).toBeNull()
})

test('page introuvable: inside the tabs (tab bar kept), with the latest workout to resume', async ({ page, context }) => {
  await signedIn(page)
  await mockHistoryApi(context)
  for (const path of ['/tabs/nulle-part', '/ancienne-page']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
    await expect(page.locator('ion-tab-bar')).toBeVisible()
    await expect(page.getByText('Données locales intactes · rien n’a été perdu')).toBeVisible()
  }
  await page.getByRole('button', { name: 'Reprendre : Haut du corps' }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/workouts\/51$/)
  await page.goto('/tabs/nulle-part')
  await page.getByRole('button', { name: 'Revenir à l’accueil' }).click()
  await expect(page).toHaveURL(/\/tabs\/today$/)
})

test('nouvelle séance: library, set sheet with the keypad, swipe to delete a set, draft kept across a reload, then saved', async ({ page, context }) => {
  await signedIn(page)
  const api = await mockHistoryApi(context)
  await page.goto('/tabs/history/workouts/new')
  await expect(page.getByRole('heading', { name: 'Nouvelle séance' })).toBeVisible()
  await page.getByLabel('Nom', { exact: true }).fill('Haut du corps')
  await segment(page.locator('.history-form__group'), 'Éch.').click()
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click()
  const library = openSheet(page, 'live-catalog-sheet')
  await library.getByRole('button', { name: /Développé couché/ }).click()
  await library.getByRole('button', { name: /Ajouter à la séance/ }).click()
  const card = page.locator('article.wf-exercise', { hasText: 'Développé couché' })
  await expect(card).toContainText('1 série')

  // Set 1: tap → sheet with type, RPE and the keypad (never the system keyboard).
  await card.getByRole('button', { name: /^Modifier la série 1/ }).click()
  const sheet = openSheet(page, 'wf-set-sheet')
  await expect(sheet.getByRole('heading', { name: 'Série 1 · Développé couché' })).toBeVisible()
  await expect(segment(sheet, 'Éch.')).toHaveClass(/segment-button-checked/)
  for (const key of ['2', '0']) await sheet.getByRole('button', { name: key, exact: true }).click()
  await sheet.getByLabel('Répétitions').click()
  for (const key of ['1', '2']) await sheet.getByRole('button', { name: key, exact: true }).click()
  await segment(sheet, '6').click()
  await sheet.getByRole('button', { name: 'Valider' }).click()
  await expect(card.getByRole('button', { name: 'Modifier la série 1 : Éch., 20 kg × 12, RPE 6' })).toBeVisible()

  // « Ajouter une série » copies the load with the page’s type; then a third one is swiped away.
  await segment(page.locator('.history-form__group'), 'Normal').click()
  await card.getByRole('button', { name: 'Ajouter une série' }).click()
  await card.getByRole('button', { name: 'Ajouter une série' }).click()
  await expect(card.getByRole('button', { name: /^Modifier la série 3 : Normal, 20 kg × 12/ })).toBeVisible()
  await swipeLeft(page, card.locator('ion-item-sliding.wf-set-row').nth(2))
  await card.getByRole('button', { name: 'Supprimer la série 3 de Développé couché' }).click()
  await expect(card).toContainText('2 séries')

  // The draft survives a reload.
  await expect(page.getByText(/Brouillon enregistré · \d\d:\d\d/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/Brouillon repris · \d\d:\d\d/)).toBeVisible()
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Haut du corps')

  await page.getByRole('button', { name: 'Enregistrer la séance' }).click()
  await expect.poll(() => api.posts.length).toBe(1)
  expect(api.posts[0].body).toMatchObject({ name: 'Haut du corps', workoutExercises: [{ exerciseId: 1, exerciseSets: [
    { weight: 20, repetitions: 12, setType: 0, rpe: 6 }, { weight: 20, repetitions: 12, setType: 1, rpe: null },
  ] }] })
  await expect(page).toHaveURL(/\/tabs\/history\/workouts\/901$/)
  await expect(page.getByRole('button', { name: 'Modifier la séance' })).toBeVisible()
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('st-form-draft')))).toEqual([])
})

const editable = () => [{
  id: 60, name: 'Haut du corps', date: daysAgo(1), duration: '00:45:00', workoutProgramSessionId: null, workoutExercises: [
    { id: 11, exerciseId: 1, exercise: { id: 1, name: 'Développé couché', muscleGroups: [0], gifUrl: null }, notes: 'Coudes à 45°', supersetGroupId: null,
      exerciseSets: [{ id: 101, weight: 20, repetitions: 12, setType: 0, rpe: 5 }, { id: 102, weight: 60, repetitions: 10, setType: 1, rpe: 8 }] },
    { id: 12, exerciseId: 2, exercise: { id: 2, name: 'Tirage vertical', muscleGroups: [1], gifUrl: null }, notes: null, supersetGroupId: null,
      exerciseSets: [{ id: 201, weight: 45, repetitions: 12, setType: 1, rpe: 7 }] },
  ],
}]

test('modifier la séance: from the detail, superset from a long press, reorder with ≡, saved as one PUT', async ({ page, context }) => {
  await signedIn(page)
  const api = await mockHistoryApi(context, { workouts: editable() })
  await page.goto('/tabs/history/workouts/60')
  await page.getByRole('button', { name: 'Modifier la séance' }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/workouts\/60\/edit$/)
  const edit = top(page)
  await expect(edit.getByRole('heading', { name: 'Modifier la séance' })).toBeVisible()
  await expect(edit.locator('.v6-back')).toContainText('Séance')
  await expect(edit.locator('article.wf-exercise').first()).toContainText('Développé couché')

  // Tap (or long press) on the exercise → menu → superset with the one above.
  await edit.getByRole('button', { name: '2. Tirage vertical : options' }).click()
  await page.getByRole('menuitem', { name: 'Superset avec Développé couché' }).click()
  await expect(edit.getByText('Superset A')).toBeVisible()

  await dragHandle(page, edit.getByLabel('Déplacer Tirage vertical'), edit.getByLabel('Déplacer Développé couché'))
  await expect(edit.locator('article.wf-exercise').first()).toContainText('Tirage vertical')

  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect.poll(() => api.puts.length).toBe(1)
  const body = api.puts[0].body as { id: number; workoutExercises: { id?: number; exerciseId: number; supersetGroupId: number; exerciseSets: { id?: number }[] }[] }
  expect(api.puts[0].path).toBe('/api/workoutsessions/60')
  expect(body.id).toBe(60)
  // Reordered: sent as new rows so the server recreates them in this order.
  expect(body.workoutExercises.map(item => [item.id, item.exerciseId, item.supersetGroupId, item.exerciseSets.map(set => set.id)])).toEqual([
    [undefined, 2, 1, [undefined]], [undefined, 1, 1, [undefined, undefined]],
  ])
  await expect(page).toHaveURL(/\/tabs\/history\/workouts\/60$/)
})

test('modifier la séance: delete the session from an action sheet (system red)', async ({ page, context }) => {
  await signedIn(page)
  const api = await mockHistoryApi(context, { workouts: editable() })
  await page.goto('/tabs/history/workouts/60/edit')
  await page.getByRole('button', { name: 'Supprimer la séance' }).click()
  const confirm = page.locator('ion-action-sheet').getByRole('button', { name: 'Supprimer la séance' })
  await expect(confirm).toHaveCSS('color', 'rgb(255, 59, 48)')
  await confirm.click()
  await expect.poll(() => api.deletes).toEqual(['/api/workoutsessions/60'])
  await expect(page).toHaveURL(/\/tabs\/history\/workouts$/)
})

test('erreur d’enregistrement: toast and in-page state without red, draft kept, « Garder en local » then « Réessayer »', async ({ page, context }) => {
  await signedIn(page)
  const api = await mockHistoryApi(context, { workouts: editable() })
  let fail = true
  await page.route('http://localhost:5294/api/workoutsessions/60', route => route.request().method() === 'PUT' && fail ? route.abort('internetdisconnected') : route.fallback())
  await page.goto('/tabs/history/workouts/60/edit')
  await page.getByLabel('Nom', { exact: true }).fill('Haut du corps lourd')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()

  await expect(page.locator('ion-toast.v6-toast')).toContainText('Ta séance reste enregistrée sur cet appareil.')
  const edit = top(page)
  await expect(edit.getByText('Le serveur n’a pas répondu')).toBeVisible()
  await expect(edit.getByText('En attente de synchronisation')).toBeVisible()
  await expect(edit.getByText('Haut du corps lourd · 3 séries')).toBeVisible()
  await expect(edit.getByText('Développé couché · note d’exercice')).toBeVisible()
  await expect(edit.getByRole('button', { name: 'Garder en local' })).toBeVisible()
  expect(await reds(page)).toEqual([])
  expect(await page.evaluate(() => localStorage.getItem('st-form-draft:v1:damien@example.com:workout:60'))).toContain('Haut du corps lourd')

  // « Garder en local »: back to the detail; reopening the editor resumes the draft.
  await edit.getByRole('button', { name: 'Garder en local' }).click()
  await expect(page).toHaveURL(/\/tabs\/history\/workouts\/60$/)
  await page.goto('/tabs/history/workouts/60/edit')
  await expect(page.getByLabel('Nom', { exact: true })).toHaveValue('Haut du corps lourd')
  await expect(page.getByText(/Brouillon repris/)).toBeVisible()

  fail = false
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect.poll(() => api.puts.length).toBe(1)
  expect(api.puts[0].body).toMatchObject({ name: 'Haut du corps lourd' })
  expect(await page.evaluate(() => localStorage.getItem('st-form-draft:v1:damien@example.com:workout:60'))).toBeNull()
})

test('chargement: skeletons of the page, never a spinner, tabs usable while loading', async ({ page, context }) => {
  await signedIn(page)
  await mockHistoryApi(context)
  let release: () => void = () => {}
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('http://localhost:5294/api/workoutsessions', async route => { await gate; await route.fallback() })
  await page.goto('/tabs/today')
  await expect(page.getByText('Chargement de tes séances…')).toBeVisible()
  await expect(page.locator('.t-loading .v6-skeleton-tiles__tile')).toHaveCount(3)
  await expect(page.locator('ion-spinner:visible')).toHaveCount(0)
  // Ionic's gestures need its touch-action (iOS Safari broke them under « pan-x pan-y »).
  expect(await page.evaluate(() => [document.documentElement, document.body].map(el => getComputedStyle(el).touchAction))).toEqual(['manipulation', 'manipulation'])
  await page.getByRole('tab', { name: 'Programmes' }).click()
  await expect(page).toHaveURL(/\/tabs\/programs$/)
  release()
})
