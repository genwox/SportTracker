import { expect, test, type Page, type BrowserContext, type Route } from '@playwright/test'
import { addExerciseFromCatalog, closeRestTimerSheet } from './helpers'

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', headers: corsHeaders, body: JSON.stringify(body) })
}

async function mockLogin(context: BrowserContext) {
  await context.route('**/login', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
    await fulfillJson(route, { accessToken: 'mock-token', expiresIn: 2592000, refreshToken: '' })
  })
}

async function mockSessions(context: BrowserContext, workouts: unknown[] = []) {
  await context.route('**/api/workoutsessions', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
    await fulfillJson(route, workouts)
  })
  await context.route('**/api/cardiosessions', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
    await fulfillJson(route, [])
  })
}

async function mockExercise(context: BrowserContext) {
  await context.route('http://localhost:5294/api/exercises', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
    await fulfillJson(route, [{ id: 7, name: 'Développé couché', type: 0, muscleGroups: [0], equipment: 'Barre', gifUrl: null, instructionsFr: null }])
  })
  await context.route('http://localhost:5294/api/exercises/7', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
    await fulfillJson(route, { id: 7, name: 'Développé couché', type: 0, muscleGroups: [0], equipment: 'Barre', gifUrl: null, instructionsFr: null })
  })
  await context.route('http://localhost:5294/api/exercises/7/history', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
    await fulfillJson(route, [])
  })
}

async function login(page: Page) {
  await page.goto('/tabs/today')
  await expect(page).toHaveURL(/\/login\?returnUrl=/)
  await page.getByLabel('Adresse e-mail').fill('athlete@example.com')
  await page.getByLabel('Mot de passe').fill('secret123')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/tabs\/today$/)
}

test.describe('QA mobile — parcours complet (WebKit 390×844)', () => {
  test('connexion → Today → séance live → 3 séries → PR → minuteur → terminer → historique', async ({ page, context }) => {
    await mockLogin(context)
    await mockExercise(context)
    const putSnapshots: { sets: unknown[] }[] = []
    await context.route('http://localhost:5294/api/workoutsessions/live/**', async route => {
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
      const snapshot = route.request().postDataJSON() as { sets: unknown[] }
      putSnapshots.push(snapshot)
      await fulfillJson(route, { workoutSessionId: 11, sets: snapshot.sets.map((_, index) => ({ id: index + 100 })) })
    })
    await mockSessions(context, [{ id: 11, name: 'Séance musculation', date: new Date().toISOString(), duration: '00:35:00', workoutExercises: [{ exerciseSets: [{}, {}, {}] }] }])

    await login(page)
    await expect(page.getByRole('heading', { name: 'Bonjour Athlete' }).first()).toBeVisible()

    await page.goto('/live')
    await expect(page.getByRole('heading', { name: 'Séance libre' }).last()).toBeVisible()
    await addExerciseFromCatalog(page, /Développé couché/)
    await expect(page.getByRole('heading', { name: 'Développé couché' }).first()).toBeVisible()
    for (let index = 0; index < 3; index++) {
      await page.getByRole('button', { name: `Valider la série ${index + 1}` }).first().click()
      await closeRestTimerSheet(page)
    }
    await expect(page.getByText('Nouveau record personnel !')).toBeVisible()
    await page.getByRole('link', { name: 'Séance', exact: true }).click()
    await expect(page.locator('.live-summary')).toContainText('3 séries')
    await page.getByRole('button', { name: 'Terminer' }).first().click()
    await expect(page).toHaveURL(/\/tabs\/today$/)
    expect(putSnapshots.at(-1)?.sets).toHaveLength(3)

    await page.getByRole('tab', { name: 'Historique' }).click()
    await expect(page).toHaveURL(/\/tabs\/history$/)
    await expect(page.getByRole('heading', { name: 'Historique/Progrès' })).toBeVisible()
    await expect(page.locator('.history-stack').getByText('Séance musculation')).toBeVisible()
  })

  test('même parcours avec coupure réseau réelle pendant la saisie, puis reconnexion', async ({ page, context }) => {
    await mockLogin(context)
    await mockExercise(context)
    let putCount = 0
    await context.route('http://localhost:5294/api/workoutsessions/live/**', async route => {
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
      putCount++
      const snapshot = route.request().postDataJSON() as { sets: unknown[] }
      await fulfillJson(route, { workoutSessionId: 12, sets: snapshot.sets.map((_, index) => ({ id: index + 200 })) })
    })
    await mockSessions(context)

    await login(page)
    await page.goto('/live')
    await addExerciseFromCatalog(page, /Développé couché/)
    await expect(page.getByRole('heading', { name: 'Développé couché' }).first()).toBeVisible()

    // Coupure réseau réelle pendant la saisie (méthode Docs/qa-v5-mobile-2026-09-24.md).
    await context.setOffline(true)
    await page.getByRole('button', { name: 'Valider la série 1' }).first().click()
    await expect(page.getByText('Hors ligne — sync en attente')).toBeVisible()
    expect(putCount).toBe(0)

    await context.setOffline(false)
    await expect(page.getByText(/^Enregistré automatiquement/)).toBeVisible()
    expect(putCount).toBe(1)

    await closeRestTimerSheet(page)
    await page.getByRole('link', { name: 'Séance', exact: true }).click()
    await expect(page.locator('.live-summary')).toContainText('1 série')
    await page.getByRole('button', { name: 'Terminer' }).first().click()
    await expect(page).toHaveURL(/\/tabs\/today$/)
  })
})

test.describe('QA mobile — contrôles transverses (WebKit 390×844)', () => {
  test('zones tactiles ≥ 44 px sur Today, Programmes et Historique', async ({ page, context }) => {
    await mockLogin(context)
    await mockSessions(context)
    await context.route('http://localhost:5294/api/programs', async route => {
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: corsHeaders }); return }
      await fulfillJson(route, [])
    })
    await login(page)

    for (const [href, name] of [['/tabs/today', 'Aujourd’hui'], ['/tabs/programs', 'Programmes'], ['/tabs/history', 'Historique']] as const) {
      await page.goto(href)
      await expect(page.getByRole('tab', { name })).toBeVisible()
      const undersized = await page.evaluate(() => {
        const interactive = Array.from(document.querySelectorAll('button, a, [role="tab"], ion-tab-button'))
        return interactive
          .filter(el => (el as HTMLElement).offsetParent !== null)
          .map(el => {
            const rect = el.getBoundingClientRect()
            return { text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), width: rect.width, height: rect.height }
          })
          .filter(item => item.width > 0 && item.height > 0 && (item.width < 44 || item.height < 44))
      })
      expect(undersized, `éléments < 44 px sur ${href} : ${JSON.stringify(undersized)}`).toEqual([])
    }
  })

  test('aucun défilement du body et pas de spinner plein écran au second affichage', async ({ page, context }) => {
    await mockLogin(context)
    await mockSessions(context)
    await login(page)

    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    // Première visite : le cache est vide, un état de chargement est toléré.
    await page.goto('/tabs/history')
    await expect(page.getByRole('heading', { name: 'Historique/Progrès' })).toBeVisible()

    // Revisite : les données sont en cache, pas de spinner plein écran.
    await page.goto('/tabs/today')
    await page.goto('/tabs/history')
    await expect(page.locator('[aria-label="Chargement en cours"]')).toHaveCount(0)
  })
})
