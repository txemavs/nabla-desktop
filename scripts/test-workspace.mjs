import assert from 'node:assert/strict'
import { preview } from 'vite'
import { chromium } from '@playwright/test'
const server = await preview({
  configFile: 'vite.demo.config.ts',
  preview: { host: '127.0.0.1', port: 4178 },
})
let browser
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(process.env.DESKTOP_DEMO_URL ?? server.resolvedUrls.local[0])
  await page.getByRole('button', { name: 'Probar paneles y pestañas' }).click()
  const lab = page.locator('.workspace-lab'),
    host = lab.locator('.nd-workspace'),
    canvas = host.locator('canvas')
  await canvas.waitFor({ state: 'visible' })
  await canvas.evaluate((el) => {
    window.originalWorkspaceCanvas = el
  })
  await lab.locator('#workspace-height').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(
    () => document.querySelector('.nd-workspace canvas')?.dataset.height === '31',
  )
  await host.getByRole('tab', { name: 'Documento', exact: true }).click()
  const doc = host.getByRole('textbox', { name: 'Documento del espacio de trabajo' })
  await doc.fill('Conservado al acoplar')
  await host
    .locator('[data-group="main-view"]')
    .getByRole('button', { name: 'Hacer flotante' })
    .click()
  const floating = host.locator('.nd-floating')
  await floating.waitFor()
  assert.equal(await doc.inputValue(), 'Conservado al acoplar')
  await floating.getByRole('button', { name: 'Mover panel' }).focus()
  const before = await floating.boundingBox()
  await page.keyboard.press('ArrowRight')
  assert.ok((await floating.boundingBox()).x > before.x)
  await floating.getByRole('button', { name: 'Acoplar panel' }).click()
  assert.equal(await doc.inputValue(), 'Conservado al acoplar')
  await host
    .locator('[data-group="main-view"]')
    .getByRole('button', { name: 'Cerrar panel' })
    .click()
  const dialog = lab.getByRole('dialog')
  await dialog.waitFor()
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'hidden' })
  await doc.waitFor({ state: 'visible' })
  await host
    .locator('[data-group="main-view"]')
    .getByRole('button', { name: 'Cerrar panel' })
    .click()
  await dialog.getByRole('button', { name: 'Cerrar de todos modos' }).click()
  await doc.waitFor({ state: 'hidden' })
  await lab.getByRole('button', { name: 'Abrir documento' }).click()
  assert.equal(await doc.inputValue(), 'Conservado al acoplar')
  await host.getByRole('tab', { name: 'Documento', exact: true }).focus()
  await page.keyboard.press('Alt+ArrowLeft')
  assert.equal(
    await host.locator('[data-group="main-view"] [role="tab"]').first().textContent(),
    'Documento',
  )
  await host
    .locator('[data-group="main-view"]')
    .getByRole('button', { name: 'Dividir abajo' })
    .click()
  assert.equal(await host.getByRole('separator').count(), 3)
  const divider = host.getByRole('separator').first()
  const old = await divider.getAttribute('aria-valuenow')
  await divider.focus()
  await page.keyboard.press('ArrowLeft')
  assert.notEqual(await divider.getAttribute('aria-valuenow'), old)
  await lab.getByRole('button', { name: 'Guardar distribución' }).click()
  await lab.getByRole('status').filter({ hasText: 'guardada' }).waitFor()
  await lab.getByRole('button', { name: 'Restablecer paneles' }).click()
  assert.equal(await host.getByRole('separator').count(), 2)
  await lab.getByRole('button', { name: 'Recuperar distribución' }).click()
  await page.waitForFunction(() => document.querySelectorAll('.nd-divider').length === 3)
  await lab.getByRole('button', { name: 'Solo mundo' }).click()
  assert.equal(await host.getByRole('tab').count(), 1)
  assert.equal(await canvas.evaluate((el) => el === window.originalWorkspaceCanvas), true)
  await lab.getByRole('button', { name: 'Solo mundo' }).click()
  assert.equal(await doc.inputValue(), 'Conservado al acoplar')
  await lab.getByLabel('Espacio pequeño').check()
  await page.waitForFunction(() => {
    const host = document.querySelector('.nd-workspace'),
      r = host.getBoundingClientRect()
    return [...host.querySelectorAll('.nd-group')].every((el) => {
      const b = el.getBoundingClientRect()
      return b.right <= r.right + 1 && b.bottom <= r.bottom + 1
    })
  })
  const bounds = await host.boundingBox()
  for (const g of await host.locator('.nd-group').all()) {
    const b = await g.boundingBox()
    assert.ok(
      b.x >= bounds.x - 1 &&
        b.y >= bounds.y - 1 &&
        b.x + b.width <= bounds.x + bounds.width + 1 &&
        b.y + b.height <= bounds.y + bounds.height + 1,
    )
  }
  await lab.getByLabel('Espacio pequeño').uncheck()
  await lab.getByRole('button', { name: 'Restablecer paneles' }).click()
  // Real drag-and-drop, not a direct store mutation.
  await host
    .getByRole('tab', { name: 'Documento', exact: true })
    .dragTo(host.locator('[data-group="inspector"] [role="tablist"]'))
  await host
    .locator('[data-group="inspector"]')
    .getByRole('tab', { name: 'Documento', exact: true })
    .waitFor()
  assert.equal(await doc.inputValue(), 'Conservado al acoplar')
  assert.equal(await canvas.evaluate((el) => el === window.originalWorkspaceCanvas), true)
  if (process.env.DEMO_SCREENSHOT)
    await page.screenshot({ path: process.env.DEMO_SCREENSHOT, fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'PASS workspace: docking, native canvas identity, dirty close guards, keyboard tabs/splits, floating movement, drag/drop, persistence and small bounds',
  )
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
