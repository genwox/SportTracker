// Generates the home-screen icons and the iOS launch screens from the V5 identity
// (Paragon background, neon mark, Foruner wordmark). Run from SportTracker.Web with the dev
// server up: `npx vite --port 4173 & node scripts/pwa-assets.mjs`.
// CHROMIUM_PATH overrides the browser Playwright would use.
import { chromium } from '@playwright/test'

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4173'
const icon = size => `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:#1a7964 url(${base}/backgrounds/paragon-v5.webp) center/cover">
  <div style="width:62%;height:62%;background:#D4F53C;-webkit-mask:url(${base}/icons/010-Dumbell.svg) center/contain no-repeat"></div></div>`
const maskable = size => `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:#1a7964 url(${base}/backgrounds/paragon-v5.webp) center/cover">
  <div style="width:46%;height:46%;background:#D4F53C;-webkit-mask:url(${base}/icons/010-Dumbell.svg) center/contain no-repeat"></div></div>`
const splash = (w, h) => `<div style="width:${w}px;height:${h}px;display:grid;place-items:center;align-content:center;gap:22px;background:#1a7964 url(${base}/backgrounds/paragon-v5.webp) center/cover">
  <div style="width:96px;height:96px;background:#D4F53C;-webkit-mask:url(${base}/icons/010-Dumbell.svg) center/contain no-repeat"></div>
  <div style="font:400 30px 'Foruner';color:#082D45;letter-spacing:.02em">SPORTTRACKER</div></div>`

// iPhone portrait viewports (CSS px) and pixel ratios, from the SE to the 17 Pro Max.
export const splashScreens = [[375, 667, 2], [414, 896, 2], [375, 812, 3], [414, 896, 3], [390, 844, 3], [428, 926, 3], [393, 852, 3], [430, 932, 3], [402, 874, 3], [420, 912, 3], [440, 956, 3]]

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
async function shot(html, width, height, scale, path, type = 'png') {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  // Same origin as the assets: CSS masks and web fonts are refused cross-origin (about:blank).
  await page.goto(`${base}/manifest.webmanifest`)
  await page.setContent(`<style>@font-face{font-family:Foruner;src:url(${base}/fonts/Foruner.ttf)}body{margin:0}</style>${html}`)
  await page.evaluate(async () => { await document.fonts.load("30px Foruner"); await document.fonts.ready })
  await page.waitForTimeout(300)
  await page.screenshot({ path, type, ...(type === 'jpeg' ? { quality: 82 } : {}) })
  await page.close()
}
for (const size of [192, 512]) await shot(icon(size), size, size, 1, `public/icon-${size}.png`)
await shot(maskable(512), 512, 512, 1, 'public/icon-maskable-512.png')
await shot(icon(180), 180, 180, 1, 'public/apple-touch-icon.png')
for (const [w, h, dpr] of splashScreens) await shot(splash(w, h), w, h, dpr, `public/splash/splash-${w * dpr}x${h * dpr}.jpg`, 'jpeg')
await browser.close()
