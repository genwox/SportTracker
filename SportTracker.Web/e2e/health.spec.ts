import { expect, test, type Page } from '@playwright/test'

type Metric = { date: string; weightKg: number | null; steps: number | null }
const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,content-type' }

async function setup(page: Page, initial: Metric[] = []) {
  const metrics = [...initial]
  let rejectSave = false
  await page.addInitScript(() => {
    localStorage.setItem('st-auth-token', 'test-token')
    localStorage.setItem('st-draft-owner', 'damien@example.com')
    localStorage.setItem('st-install-hint-dismissed', '1')
  })
  await page.route('http://localhost:5294/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path === '/api/healthmetrics') return route.fulfill({ json: metrics, headers })
    if (path.startsWith('/api/healthmetrics/')) {
      if (rejectSave) return route.fulfill({ status: 503, headers })
      const [, , , kind, date] = path.split('/')
      let metric = metrics.find(m => m.date === date)
      if (!metric) { metric = { date, weightKg: null, steps: null }; metrics.push(metric) }
      if (request.method() === 'DELETE') {
        metric[kind === 'weight' ? 'weightKg' : 'steps'] = null
        return route.fulfill({ status: 204, headers })
      }
      metric[kind === 'weight' ? 'weightKg' : 'steps'] = request.postDataJSON().value
      return route.fulfill({ json: metric, headers })
    }
    return route.fulfill({ json: path === '/manage/info' ? { email: 'damien@example.com' } : [], headers })
  })
  return { metrics, failSave: (value: boolean) => { rejectSave = value } }
}

test('weight: French decimals, curve, correction, confirmed deletion and preserved daily steps', async ({ page }) => {
  const state = await setup(page, [{ date: '2026-09-01', weightKg: 80, steps: null }, { date: today(), weightKg: null, steps: 4000 }])
  await page.goto('/tabs/profile/weight')
  await expect(page.getByRole('heading', { name: 'Mon poids', exact: true })).toBeVisible()
  await page.getByLabel('Poids (kg)', { exact: true }).fill('75,5')
  await page.getByRole('button', { name: 'Enregistrer la pesée' }).click()
  await expect(page.getByRole('img', { name: /Poids de 80 à 75,5/ })).toBeVisible()
  expect(state.metrics.find(m => m.date === today())).toEqual({ date: today(), weightKg: 75.5, steps: 4000 })
  await page.getByLabel('Poids (kg)', { exact: true }).fill('74,8')
  await page.getByRole('button', { name: 'Enregistrer la pesée' }).click()
  await expect(page.getByRole('img', { name: /Poids de 80 à 74,8/ })).toBeVisible()
  expect(state.metrics).toHaveLength(2)
  await page.getByRole('button', { name: /^Supprimer/ }).first().click()
  await page.locator('ion-action-sheet button', { hasText: /^Supprimer$/ }).click()
  await expect(page.getByRole('img', { name: /Poids de 80 à 80/ })).toBeVisible()
  expect(state.metrics.find(m => m.date === today())?.steps).toBe(4000)
  await page.screenshot({ path: 'test-results/health-weight.png', fullPage: true })
})

test('failed weight save survives reload and can be retried', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/tabs/profile/weight')
  await page.getByLabel('Poids (kg)', { exact: true }).fill('75,5')
  state.failSave(true)
  await page.getByRole('button', { name: 'Enregistrer la pesée' }).click()
  await expect(page.getByText('Mesure en attente', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Poids (kg)', { exact: true })).toHaveValue('75,5')
  state.failSave(false)
  await page.getByRole('button', { name: 'Enregistrer la pesée' }).click()
  await expect.poll(() => state.metrics[0]?.weightKg).toBe(75.5)
})

test('motion pedometer: distinct steps, stop, transfer once, persist and save daily total', async ({ page }) => {
  const state = await setup(page, [{ date: today(), weightKg: 75, steps: 1000 }])
  await page.addInitScript(() => {
    Object.defineProperty(window, 'DeviceMotionEvent', { configurable: true, value: class { static requestPermission() { return Promise.resolve('granted') } } })
  })
  await page.goto('/tabs/profile/steps')
  await expect(page.getByText('jours renseignés')).toBeVisible()
  await page.getByRole('button', { name: 'Démarrer le podomètre' }).click()
  await page.evaluate(async () => {
    const sample = (z: number) => {
      const event = new Event('devicemotion')
      Object.defineProperty(event, 'accelerationIncludingGravity', { value: { x: 0, y: 0, z } })
      window.dispatchEvent(event)
    }
    sample(9.81)
    for (let stride = 0; stride < 3; stride++) {
      for (let sampleIndex = 0; sampleIndex < 25; sampleIndex++) {
        await new Promise(resolve => setTimeout(resolve, 20))
        sample(sampleIndex >= 5 && sampleIndex <= 8 ? 12.5 : 9.3)
      }
    }
  })
  await expect(page.locator('.health-counter strong')).toHaveText('3')
  await page.getByRole('button', { name: 'Arrêter la marche' }).click()
  await page.getByRole('button', { name: 'Reporter ces pas dans la journée' }).click()
  await expect(page.getByLabel('Pas', { exact: true })).toHaveValue('1003')
  await expect(page.locator('.health-counter strong')).toHaveText('0')
  await page.reload()
  await expect(page.getByLabel('Pas', { exact: true })).toHaveValue('1003')
  await page.getByRole('button', { name: 'Enregistrer les pas' }).click()
  await expect.poll(() => state.metrics[0]?.steps).toBe(1003)
  expect(state.metrics[0]?.weightKg).toBe(75)
  await page.screenshot({ path: 'test-results/health-steps.png', fullPage: true })
})

test('pedometer reports denied motion permission without starting', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => {
    Object.defineProperty(window, 'DeviceMotionEvent', { configurable: true, value: class { static requestPermission() { return Promise.resolve('denied') } } })
  })
  await page.goto('/tabs/profile/steps')
  await page.getByRole('button', { name: 'Démarrer le podomètre' }).click()
  await expect(page.getByText(/Accès aux mouvements refusé/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Arrêter la marche' })).toHaveCount(0)
})

test('switching accounts resets the draft even when Ionic keeps the previous page cached', async ({ page }) => {
  await setup(page)
  await page.goto('/tabs/profile/weight')
  await page.getByLabel('Poids (kg)', { exact: true }).fill('75,5')
  await page.evaluate(() => {
    localStorage.removeItem('st-auth-token')
    localStorage.removeItem('st-draft-owner')
    window.dispatchEvent(new Event('sporttracker:auth-changed'))
  })
  await expect(page).toHaveURL(/\/login/)
  await page.evaluate(() => {
    localStorage.setItem('st-auth-token', 'second-account-token')
    localStorage.setItem('st-draft-owner', 'other@example.com')
    window.dispatchEvent(new Event('sporttracker:auth-changed'))
    window.history.pushState(null, '', '/tabs/profile/weight')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  const visible = page.locator('.ion-page:not(.ion-page-hidden)').last()
  await expect(visible.getByRole('heading', { name: 'Mon poids', exact: true })).toBeVisible()
  await expect(visible.getByLabel('Poids (kg)', { exact: true })).toHaveValue('')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('st-health-form:v1:damien@example.com:weight')!).value)).toBe('75,5')
})

test('sound: one chime at expiry, no repeated alert or chime when disabled', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => {
    let tones = 0
    Object.defineProperty(window, '__tones', { get: () => tones })
    class Audio {
      state = 'running'; currentTime = 0; sampleRate = 44100; destination = {}
      createBuffer() { return {} }
      createBufferSource() { return { connect() {}, start() {} } }
      createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } } }
      createOscillator() { return { frequency: { value: 0 }, connect() {}, disconnect() {}, start() { tones++ }, stop() {}, onended: null } }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: Audio })
  })
  // This route has no mini-bar draft cleanup; exercise the app-wide timer monitor in isolation.
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').click()
  const start = () => page.evaluate(() => {
    const now = Date.now()
    localStorage.setItem('st-live-session', JSON.stringify({ owner: 'damien@example.com', sessionKey: 'test', storageKey: 'test', href: '/live/test', startedAt: now,
      timer: { state: 'running', durationMs: 500, endsAt: now + 500, remainingMs: 500 } }))
  })
  await start()
  await expect.poll(() => page.evaluate(() => (window as Window & { __tones: number }).__tones)).toBe(3)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('st-live-session')!).timer.state)).toBe('finished')
  await page.waitForTimeout(750)
  expect(await page.evaluate(() => (window as Window & { __tones: number }).__tones)).toBe(3)
  await page.evaluate(() => localStorage.setItem('st-pref:v1:rest-sound', '0'))
  await start()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('st-live-session')!).timer.state)).toBe('finished')
  expect(await page.evaluate(() => (window as Window & { __tones: number }).__tones)).toBe(3)
})
