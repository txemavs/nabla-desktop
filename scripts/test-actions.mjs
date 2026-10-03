import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { chromium } from '@playwright/test'

const packageRoot = resolve(process.env.DESKTOP_PACKAGE_ROOT ?? '.')
const server = await createServer({
  configFile: false,
  root: resolve('tests/actions'),
  plugins: [vue()],
  resolve: { alias: [
    { find: '@nabla/desktop/style.css', replacement: resolve(packageRoot, 'dist/style.css') },
    { find: '@nabla/desktop', replacement: resolve(packageRoot, 'dist/index.js') },
  ] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [resolve('.'), packageRoot] } },
})
let browser
try {
  await server.listen()
  browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
  })
  const page = await browser.newPage({ viewport: { width: 700, height: 650 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const url = server.resolvedUrls.local[0]
  async function reset() {
    await page.goto(url)
    await page.locator('#target').waitFor()
  }
  const popup = page.locator('.desktop-menu-popup')
  await reset()
  // Working buttons are usable without opening a contextual menu.
  await page.getByRole('button', { name: 'Inspect', exact: true }).click()
  assert.equal(await page.locator('#result').innerText(), 'inspect:a')
  assert.equal(await popup.count(), 0)
  await page.getByRole('button', { name: 'All actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Advanced details' }).waitFor()
  assert.equal(await page.getByRole('menuitem', { name: 'Only for B' }).count(), 0)
  assert.equal(await page.locator('#ownership').innerText(), '1')
  await page.keyboard.press('i')
  // Change focus identity without a pointer event dismissing the menu.
  await page.locator('#retarget').evaluate(button => button.click())
  await page.getByRole('menuitem', { name: 'Inspect', exact: true }).click()
  assert.equal(await page.locator('#result').innerText(), 'inspect:a')
  assert.equal(await page.locator('#ownership').innerText(), '0')
  assert.equal(await page.getByRole('button', { name: 'Inspect', exact: true }).isDisabled(), true)
  await reset()
  await page.locator('#target').focus()
  await page.keyboard.press('Shift+F10')
  await page.getByRole('menuitem', { name: 'Inspect', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#target').evaluate(el => el === document.activeElement), true)
  await page.locator('#target').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Tools' }).click()
  await page.getByRole('menuitemradio', { name: 'none', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'none', exact: true }).getAttribute('aria-pressed'), 'true')
  await page.getByRole('button', { name: 'All actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tools' }).click()
  assert.equal(await page.getByRole('menuitemradio', { checked: true }).count(), 1)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Object', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Inspect', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'All actions', exact: true }).click()
  await page.locator('#permission').evaluate(button => button.click())
  assert.equal(await page.getByRole('menuitem', { name: 'Inspect', exact: true }).isDisabled(), true)
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('button', { name: 'Inspect', exact: true }).isDisabled(), true)
  await reset()
  await page.getByRole('button', { name: 'All actions', exact: true }).click()
  await page.locator('#remove').evaluate(button => button.click())
  assert.equal(await page.getByRole('menuitem', { name: 'Inspect', exact: true }).isDisabled(), true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'All actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Fail', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('#errors').textContent === '1')
  assert.equal(await page.locator('#ownership').innerText(), '0')
  await page.getByRole('button', { name: 'All actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Slow', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Slow', exact: true }).isDisabled(), true)
  await page.waitForFunction(() => !document.querySelector('[data-command="slow"]').disabled)
  await page.getByRole('button', { name: 'All actions', exact: true }).click()
  await page.locator('#unmount').evaluate(button => button.click())
  assert.equal(await page.locator('#ownership').innerText(), '0')
  await reset()
  await page.locator('#edge').click()
  const bounds = await popup.boundingBox()
  assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 700)
  assert(bounds.y + bounds.height <= 650)
  await page.keyboard.press('Escape')
  await page.locator('#cancel-open').click()
  assert.equal(await popup.count(), 0)
  assert.equal(await page.locator('#ownership').innerText(), '0')
  await page.getByRole('button', { name: 'All actions', exact: true }).focus()
  await page.keyboard.press('Enter')
  await popup.waitFor()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Space')
  await popup.waitFor()
  await page.locator('#retarget').click()
  assert.equal(await popup.count(), 0)
  assert.equal(await page.locator('#ownership').innerText(), '0')
  // Simulated touch hardware exercises the same direct toolbar and full action menu.
  await reset()
  await page.getByRole('button', { name: 'Open confirmation', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Confirmation', exact: true })
  await confirmation.waitFor()
  assert.equal(await confirmation.evaluate(element => element.matches(':modal')), true)
  await confirmation.getByRole('button', { name: 'Confirm', exact: true }).click()
  await confirmation.waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Open utility', exact: true }).click()
  const utility = page.getByRole('dialog', { name: 'Utility', exact: true })
  await utility.waitFor()
  assert.equal(await utility.evaluate(element => element.matches(':modal')), false)
  await page.getByRole('button', { name: 'Inspect', exact: true }).click()
  assert.equal(await page.locator('#result').innerText(), 'inspect:a')
  await utility.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await utility.waitFor({ state: 'hidden' })
  const touch = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 700 } })
  const touchPage = await touch.newPage()
  touchPage.on('pageerror', error => errors.push(error.message))
  await touchPage.goto(url)
  await touchPage.getByRole('button', { name: 'Inspect', exact: true }).tap()
  assert.equal(await touchPage.locator('#result').innerText(), 'inspect:a')
  await touchPage.locator('#spanish').tap()
  assert((await touchPage.locator('#spanish').boundingBox()).height >= 44)
  const trigger = touchPage.getByRole('button', { name: 'Todas las acciones', exact: true })
  assert((await trigger.boundingBox()).height >= 44)
  await trigger.tap()
  await touchPage.getByRole('menuitem', { name: 'Advanced details' }).waitFor()
  assert((await touchPage.getByRole('menuitem', { name: 'Inspect', exact: true }).boundingBox()).height >= 44)
  await touchPage.getByRole('menuitem', { name: 'Inspect', exact: true }).tap()
  assert.equal(await touchPage.locator('#ownership').innerText(), '0')
  await touch.close()
  assert.deepEqual(errors, [])
  console.log('PASS: working toolbars, full context actions, target capture, permissions, radio modes, keyboard, touch, focus, busy/errors, disposal and bounds')
} finally {
  await browser?.close()
  await server.close()
}
