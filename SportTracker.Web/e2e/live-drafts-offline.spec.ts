import { expect, test } from '@playwright/test'

test('an offline draft survives reopening and is sent once when the network returns', async ({ page, context }) => {
  let putCount = 0
  await context.addInitScript(() => {
    localStorage.setItem('st-auth-token', 'mock-token')
    localStorage.setItem('st-draft-owner', 'athlete@example.com')
    localStorage.setItem('test-offline', localStorage.getItem('test-offline') ?? 'true')
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => localStorage.getItem('test-offline') !== 'true' })
  })
  await context.route('**/api/workoutsessions/live/**', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: {
        'access-control-allow-origin': '*', 'access-control-allow-methods': 'PUT',
        'access-control-allow-headers': 'authorization,content-type',
      } })
      return
    }
    expect(route.request().method()).toBe('PUT')
    putCount++
    expect(route.request().postDataJSON().sets).toEqual([
      { weight: 80, repetitions: 5, setType: 1, rpe: 8 },
    ])
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ workoutSessionId: 12, sets: [{ id: 34 }] }),
    })
  })

  await page.goto('/tabs/today')
  await page.evaluate(async () => { await import('/src/features/live/drafts/index.ts') })
  await context.setOffline(true)
  await page.evaluate(async () => {
    const { draftStore } = await import('/src/features/live/drafts/index.ts')
    await draftStore.put('athlete@example.com', 'free:00000000-0000-4000-8000-000000000001:7', {
      storageKey: 'free:00000000-0000-4000-8000-000000000001:7',
      draftId: '00000000-0000-4000-8000-000000000001', workoutDate: '2026-09-25',
      programSessionId: null, exerciseId: 7, exerciseName: 'Squat', gifUrl: null, instructions: null,
      sessionName: 'Test', restSeconds: 90, targetSets: 3,
      sets: [{ id: 0, weight: 80, repetitions: 5, setType: 'Normal', rpe: 8 }],
      weightCurrent: 80, repsCurrent: 5, setType: 'Normal', rpe: 8,
      notes: 'Saved offline', supersetGroupId: null, pendingSync: true, syncConflict: false,
      revision: 1, savedAtUtc: '2026-09-25T00:00:00Z', workoutSessionId: null,
    })
  })
  expect(putCount).toBe(0)
  expect(await page.evaluate(async () => {
    const { draftStore } = await import('/src/features/live/drafts/index.ts')
    return (await draftStore.get('athlete@example.com', 'free:00000000-0000-4000-8000-000000000001:7'))?.sets[0].weight
  })).toBe(80)
  // Vite's development server has no offline service worker. Reopen the app
  // after restoring shell access, while its draft sync still sees offline.
  const initialOrigin = new URL(page.url()).origin
  await context.setOffline(false)
  await page.close()
  const reopenedPage = await context.newPage()
  await reopenedPage.goto('/tabs/today')
  expect(new URL(reopenedPage.url()).origin).toBe(initialOrigin)
  const restored = await reopenedPage.evaluate(async () => {
    const { draftStore } = await import('/src/features/live/drafts/index.ts')
    return draftStore.get('athlete@example.com', 'free:00000000-0000-4000-8000-000000000001:7')
  })
  expect(restored?.sets[0].weight).toBe(80)
  await reopenedPage.evaluate(() => {
    localStorage.setItem('test-offline', 'false')
    window.dispatchEvent(new Event('online'))
  })
  await expect.poll(() => putCount).toBe(1)
  await expect.poll(async () => reopenedPage.evaluate(async () => {
    const { draftStore } = await import('/src/features/live/drafts/index.ts')
    return (await draftStore.get('athlete@example.com', 'free:00000000-0000-4000-8000-000000000001:7'))?.pendingSync
  })).toBe(false)
  expect(putCount).toBe(1)
})
