import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createServer, preview } from 'vite'
import { chromium, expect } from '@playwright/test'
const server = await preview({
  configFile: 'vite.demo.config.ts',
  preview: { host: '127.0.0.1', port: 4179 },
})
const fixture = await createServer({
  configFile: false,
  root: resolve('tests/detached'),
  resolve: { alias: { '@nabla/desktop/core': resolve('dist/core.js') } },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [process.cwd()] } },
})
let browser
try {
  await fixture.listen()
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
  const opener = page.getByRole('button', { name: 'Abrir ventana independiente' })
  const popupEvent = page.waitForEvent('popup')
  await opener.click()
  const popup = await popupEvent
  popup.on('pageerror', (e) => errors.push(e.message))
  await popup.getByLabel('Altura del edificio').focus()
  await popup.keyboard.press('Home')
  await popup.keyboard.press('ArrowRight')
  await page.waitForFunction(() => document.querySelector('#workspace-height')?.value === '31')
  await popup.getByLabel('Documento compartido').fill('Texto desde otra ventana')
  await page.bringToFront()
  await page.locator('.workspace-lab').getByRole('button', { name: 'Abrir documento' }).click()
  const doc = page.getByRole('textbox', { name: 'Documento del espacio de trabajo' })
  assert.equal(await doc.inputValue(), 'Texto desde otra ventana')
  await doc.fill('Actualizado en la principal')
  await popup.waitForFunction(
    () => document.querySelector('textarea')?.value === 'Actualizado en la principal',
  )
  const pages = page.context().pages().length
  await opener.click()
  assert.equal(page.context().pages().length, pages)
  await popup.getByRole('button', { name: 'Volver a la ventana principal' }).click()
  await expect.poll(() => popup.isClosed()).toBe(true)
  const secondEvent = page.waitForEvent('popup')
  await opener.click()
  const second = await secondEvent
  assert.equal(
    await second.getByLabel('Documento compartido').inputValue(),
    'Actualizado en la principal',
  )
  await second.close()
  await page.waitForFunction(() =>
    document
      .querySelector('.workspace-lab [role="status"]')
      ?.textContent.includes('Inspector cerrado'),
  )
  // A blocked popup must leave the owner usable, not hide or dispose its document.
  await page.evaluate(() => {
    window.originalOpen = window.open
    window.open = () => null
  })
  await opener.click()
  await page.getByRole('status').filter({ hasText: 'bloqueado' }).waitFor()
  assert.equal(await doc.inputValue(), 'Actualizado en la principal')
  await page.evaluate(() => {
    window.open = window.originalOpen
  })
  const thirdEvent = page.waitForEvent('popup')
  await opener.click()
  const third = await thirdEvent
  await page.reload()
  await expect.poll(() => third.isClosed()).toBe(true)
  // Public distribution contracts, independent of Vue and of the demo.
  await page.goto(fixture.resolvedUrls.local[0])
  const contractEvent = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  const child = await contractEvent
  await child.locator('output').waitFor()
  assert.equal(await child.locator('output').textContent(), '1')
  assert.equal(
    await page.evaluate(() => window.detachedTest.host.open('another', window.detachedTest.view)),
    'limit',
  )
  assert.equal(await page.evaluate(() => window.detachedTest.state.value), 1) // state snapshot is a clone
  await child.getByLabel('Value').fill('7')
  await page.waitForFunction(() => window.detachedTest.state.value === 7)
  await page.evaluate(() => window.detachedTest.set(8))
  await child.waitForFunction(() => document.querySelector('output').textContent === '8')
  await child.reload()
  await page.waitForFunction(() => window.detachedTest.disposes === 1)
  assert.equal(
    await page.evaluate(() => window.detachedTest.lastBridge.dispatch({ value: 10 })),
    false,
  )
  const reopenEvent = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  const reopened = await reopenEvent
  assert.equal(await reopened.locator('output').textContent(), '8')
  await page.evaluate(() => window.detachedTest.host.dispose())
  await page.waitForFunction(() => window.detachedTest.disposes === 2)
  assert.equal(await page.evaluate(() => window.detachedTest.subscribed), false)
  assert.equal(
    await page.evaluate(() => window.detachedTest.host.open('view', window.detachedTest.view)),
    'disposed',
  )
  await page.reload()
  await page.getByRole('button', { name: 'Broken renderer' }).click()
  await page.waitForFunction(() => window.detachedTest.result === 'error')
  assert.equal(await page.evaluate(() => window.detachedTest.disposes), 1)
  assert.deepEqual(await page.evaluate(() => window.detachedTest.host.ids()), [])
  assert.deepEqual(errors, [])
  console.log(
    'PASS detached windows: bidirectional state, single owner, duplicate focus, blocked popup, return, reconnect, reload cleanup, owner shutdown, stale actions and renderer failure',
  )
} finally {
  await browser?.close()
  await new Promise((r) => server.httpServer.close(r))
  await fixture.close()
}
