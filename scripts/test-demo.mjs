import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { preview } from 'vite'
import { chromium } from '@playwright/test'
const server = await preview({
  configFile: resolve('vite.demo.config.ts'),
  preview: { host: '127.0.0.1', port: 4177 },
})
let browser
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(server.resolvedUrls.local[0])
  const world = page.locator('[data-window-id="world"]')
  await world.waitFor({ state: 'visible' })
  await page.locator('#height').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.height === '31')
  await page.locator('#color').fill('#dd8844')
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.color === '#dd8844')
  await page.locator('.launchers button').filter({ hasText: 'Cuaderno' }).click()
  const notes = page.locator('[data-window-id="notes"]')
  await notes.locator('textarea').fill('Mi nota permanece')
  await notes.getByRole('button', { name: 'Close', exact: true }).click()
  await notes.waitFor({ state: 'hidden' })
  await page.locator('.taskbar button').filter({ hasText: 'Cuaderno' }).click()
  assert.equal(await notes.locator('textarea').inputValue(), 'Mi nota permanece')
  await notes.getByRole('button', { name: 'Minimize', exact: true }).click()
  await notes.waitFor({ state: 'hidden' })
  await page.locator('.taskbar button').filter({ hasText: 'Cuaderno' }).click()
  await notes.waitFor({ state: 'visible' })
  await notes.getByRole('button', { name: 'Close', exact: true }).click()
  await page.locator('.launchers button').filter({ hasText: 'Ventana temporal' }).click()
  const temporary = page.locator('[data-window-id^="tool-"]')
  await temporary.getByRole('button', { name: 'Cerrar y eliminar' }).click()
  await temporary.waitFor({ state: 'detached' })
  await page.getByLabel('Contenedor pequeño').check()
  assert.ok((await page.locator('[data-testid="workspace"]').boundingBox()).width <= 580)
  await page.getByLabel('Contenedor pequeño').uncheck()
  await page.getByRole('button', { name: 'Reiniciar demo' }).click()
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.height === '90')
  if (process.env.DEMO_SCREENSHOT)
    await page.screenshot({ path: process.env.DEMO_SCREENSHOT, fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'PASS demo: linked height/color, note retention, minimize/reopen, disposable window, container resizing and reset',
  )
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
