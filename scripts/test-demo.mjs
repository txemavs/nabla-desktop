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
  // Maximization must cover floating tools with the conventional default.
  await world.getByRole('button', { name: 'Maximize', exact: true }).click()
  await page.waitForTimeout(400)
  assert.equal(
    await page.locator('[data-window-id="properties"]').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return document
        .elementFromPoint(r.x + r.width / 2, r.y + 80)
        ?.closest('[data-window-id]')
        ?.getAttribute('data-window-id')
    }),
    'world',
  )
  await page.getByRole('button', { name: 'Reiniciar demo', exact: true }).click()
  await page.getByRole('button', { name: 'Ver', exact: true }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Mostrar rejilla' }).click()
  assert.equal(
    await page
      .getByRole('group', { name: 'Herramientas' })
      .getByRole('button', { name: 'Mostrar rejilla' })
      .getAttribute('aria-pressed'),
    'false',
  )
  await page.locator('.lab').focus()
  await page.keyboard.press('g')
  await page.waitForFunction(
    () =>
      document
        .querySelector('.desktop-command-toolbar button[aria-pressed]')
        ?.getAttribute('aria-pressed') === 'true',
  )
  await page.getByRole('button', { name: 'Archivo', exact: true }).focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await notes.waitFor({ state: 'visible' })
  await notes.locator('textarea').fill('g')
  assert.equal(
    await page
      .getByRole('group', { name: 'Herramientas' })
      .getByRole('button', { name: 'Mostrar rejilla' })
      .getAttribute('aria-pressed'),
    'true',
  )
  await notes.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Ver', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Abrir herramienta' }).click()
  await page.getByRole('menuitem', { name: 'Cuaderno' }).click()
  await notes.waitFor({ state: 'visible' })
  assert.equal(await page.getByRole('menu').count(), 0)
  await page.locator('[data-testid="workspace"]').click({ button: 'right', position: { x: 15, y: 15 } })
  await page.getByRole('menuitemcheckbox', { name: 'Mostrar rejilla' }).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('menu').count(), 0)
  await page.getByLabel('Tema', { exact: true }).selectOption('light')
  assert.ok(await page.locator('.lab').evaluate((el) => el.classList.contains('light-theme')))
  await page.getByLabel('Tema', { exact: true }).selectOption('dark')
  if (process.env.DEMO_SCREENSHOT)
    await page.screenshot({ path: process.env.DEMO_SCREENSHOT, fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'PASS demo: linked height/color, note retention, minimize/reopen, disposable window, container resizing, foreground maximization, menus, shortcuts, input isolation and themes',
  )
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
