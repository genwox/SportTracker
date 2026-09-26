import { expect, type Page } from '@playwright/test'

/**
 * Ionic sheet modals animate their transform via the Web Animations API, which
 * Playwright's actionability checks can race (`element is not stable`) right as the
 * sheet settles. Wait for two consecutive animation frames with the same transform
 * before clicking a button inside the open rest timer sheet.
 */
async function waitForSheetSettled(page: Page) {
  await page.waitForFunction(() => {
    const modal = document.querySelector('ion-modal.live-timer-sheet:not(.overlay-hidden)')
    if (!modal) return false
    const transform = getComputedStyle(modal).transform
    const previous = (modal as HTMLElement).dataset.lastTransform
    ;(modal as HTMLElement).dataset.lastTransform = transform
    return previous === transform
  })
}

export async function closeRestTimerSheet(page: Page) {
  await expect(page.getByRole('heading', { name: 'Minuteur de repos' })).toBeVisible()
  await waitForSheetSettled(page)
  await page.locator('ion-modal.live-timer-sheet:not(.overlay-hidden)').getByRole('button', { name: 'Fermer' }).click()
  await expect(page.locator('ion-modal.live-timer-sheet:not(.overlay-hidden)')).toHaveCount(0)
}

/** Library sheet (V6 · 27): pick one exercise, then « Ajouter à la séance » opens it. */
export async function addExerciseFromCatalog(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Ajouter un exercice' }).last().click()
  await page.getByRole('button', { name }).click()
  await page.getByRole('button', { name: 'Ajouter à la séance' }).click()
}

/** Swipe a row to the left with the mouse (Ionic gestures accept mouse drags). */
export async function swipeLeft(page: Page, locator: ReturnType<Page['locator']>) {
  // Centre the row: at the bottom of the viewport it would sit under the sticky action bar.
  await locator.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(100)
  const box = (await locator.boundingBox())!
  const from = { x: box.x + box.width * 0.7, y: box.y + box.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let step = 1; step <= 12; step++) await page.mouse.move(from.x - 110 * step / 12, from.y)
  await page.mouse.up()
}
