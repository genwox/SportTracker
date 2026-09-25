import { expect, type Page } from '@playwright/test'

/**
 * Ionic sheet modals animate their transform via the Web Animations API, which
 * Playwright's actionability checks can race (`element is not stable`) right as the
 * sheet settles. Wait for two consecutive animation frames with the same transform
 * before clicking a button inside the currently open `.live-sheet` modal.
 */
async function waitForSheetSettled(page: Page) {
  await page.waitForFunction(() => {
    const modal = document.querySelector('ion-modal.live-sheet:not(.overlay-hidden)')
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
  await page.getByRole('button', { name: 'Fermer' }).click()
}
