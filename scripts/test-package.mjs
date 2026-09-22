import { execFileSync } from 'node:child_process'
import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const root = resolve('.')
const temp = mkdtempSync(join(tmpdir(), 'nabla-desktop-package-'))
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' })
const profiles = [
  { name: 'pinia2', vue: '3.4.21', pinia: '2.1.7' },
  { name: 'agency', vue: '3.5.41', pinia: '4.0.3', vuetify: '4.1.10' },
]
try {
  run('npm', ['run', 'build'])
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp], {
      cwd: root,
      encoding: 'utf8',
    }),
  )[0]
  for (const profile of profiles) {
    const cwd = join(temp, profile.name)
    cpSync(join(root, 'tests/consumer'), cwd, { recursive: true })
    const deps = {
      '@nabla/desktop': `file:${join(temp, packed.filename)}`,
      vue: profile.vue,
      pinia: profile.pinia,
    }
    // Only the Agency consumer includes its optional UI framework.
    if (profile.vuetify) deps.vuetify = profile.vuetify
    else {
      // Remove optional host-only import from the minimal consumer.
      const { readFileSync } = await import('node:fs')
      const file = join(cwd, 'main.js')
      writeFileSync(
        file,
        readFileSync(file, 'utf8').replace(
          /if \(import.meta.env.VITE_AGENCY_PROFILE === '1'\) \{[\s\S]*?\n\}/,
          '',
        ),
      )
    }
    writeFileSync(
      join(cwd, 'package.json'),
      JSON.stringify({ private: true, type: 'module', dependencies: deps }),
    )
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], cwd)
    writeFileSync(
      join(cwd, 'consumer.ts'),
      `import { defineWindowsStore, WindowHost, type WindowOptions } from '@nabla/desktop'; import { createWorkspace, type WorkspaceSnapshot, createCommandRegistry, type ContentFactory } from '@nabla/desktop/core'; import { MenuBar, ContextMenu, CommandToolbar, ExternalContent } from '@nabla/desktop'; import { createPinia } from 'pinia'; const workspace = createWorkspace(); const snapshot: WorkspaceSnapshot = workspace.snapshot(); void snapshot; const registry = createCommandRegistry(); registry.register({id:'test',label:'Test',execute() {}}); const factory: ContentFactory = () => ({dispose() {}}); void [factory, MenuBar, ContextMenu, CommandToolbar, ExternalContent]; const options: WindowOptions = { keepAlive: true, closeBehavior: 'hide' }; defineWindowsStore('typed')(createPinia()).register('world', options); void WindowHost;`,
    )
    run(
      process.execPath,
      [
        join(root, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--skipLibCheck',
        '--target',
        'ES2020',
        '--module',
        'ESNext',
        '--moduleResolution',
        'bundler',
        'consumer.ts',
      ],
      cwd,
    )
    const server = await createServer({
      configFile: false,
      root: cwd,
      server: { host: '127.0.0.1', port: 0 },
      define: {
        'import.meta.env.VITE_AGENCY_PROFILE': JSON.stringify(profile.vuetify ? '1' : '0'),
      },
    })
    let browser
    try {
      await server.listen()
      browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
      })
      const page = await browser.newPage({
        viewport: { width: 1100, height: 800 },
        reducedMotion: 'reduce',
      })
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(server.resolvedUrls.local[0])
      const world = page.locator('[data-window-id="world"]')
      await world.waitFor({ state: 'visible' })
      assert.equal(await world.evaluate((el) => getComputedStyle(el).position), 'absolute')
      assert.equal(
        await world.evaluate((el) => getComputedStyle(el).backgroundColor),
        'rgb(30, 30, 30)',
      )
      assert.equal(await page.evaluate(() => window.desktopTest.counts.lazy ?? 0), 0)
      const original = await world.boundingBox()
      const title = world.locator('.window-frame__title')
      const t = await title.boundingBox()
      await page.mouse.move(t.x + 30, t.y + 15)
      await page.mouse.down()
      await page.mouse.move(t.x + 90, t.y + 65, { steps: 5 })
      await page.mouse.up()
      const dragged = await world.boundingBox()
      assert.ok(Math.abs(dragged.x - original.x - 60) < 2)
      assert.ok(Math.abs(dragged.y - original.y - 50) < 2)
      const handle = await world.locator('.window-frame__resize-handle--se').boundingBox()
      await page.mouse.move(handle.x + 3, handle.y + 3)
      await page.mouse.down()
      await page.mouse.move(handle.x + 53, handle.y + 43, { steps: 5 })
      await page.mouse.up()
      const resized = await world.boundingBox()
      assert.ok(resized.width > dragged.width + 40)
      await world.locator('textarea').fill('Preserve the world')
      await world.getByRole('button', { name: 'Maximize', exact: true }).click()
      await page.locator('[aria-label="tool document"]').click()
      assert.equal(
        await page.evaluate(() => window.desktopTest.store.windows.get('world').maximized),
        true,
      )
      assert.equal(await page.evaluate(() => window.desktopTest.store.activeWindowId), 'tool')
      await page.evaluate(() => window.desktopTest.store.minimizeWindow('world'))
      await world.waitFor({ state: 'hidden' })
      await page.evaluate(() => window.desktopTest.store.restoreWindow('world'))
      await world.waitFor({ state: 'visible' })
      await world.getByRole('button', { name: 'Close', exact: true }).click()
      await world.waitFor({ state: 'hidden' })
      await page.evaluate(() => window.desktopTest.store.openWindow('world'))
      await world.waitFor({ state: 'visible' })
      assert.equal(await world.locator('textarea').inputValue(), 'Preserve the world')
      assert.equal(await page.evaluate(() => window.desktopTest.counts.world), 1)
      await page.evaluate(() => window.desktopTest.store.closeWindow('tool'))
      await page.locator('[data-window-id="tool"]').waitFor({ state: 'detached' })
      assert.equal(await page.evaluate(() => window.desktopTest.disposed.tool), 1)
      await page.evaluate(() => window.desktopTest.store.openWindow('tool'))
      await page.locator('[data-window-id="tool"]').waitFor({ state: 'visible' })
      assert.equal(await page.evaluate(() => window.desktopTest.counts.tool), 2)
      await page.evaluate(() => {
        document.getElementById('container').style.width = '320px'
        document.getElementById('container').style.height = '220px'
      })
      await page.waitForFunction(() => window.desktopTest.store.bounds.width === 320)
      for (const w of await page.evaluate(() => [...window.desktopTest.store.windows.values()])) {
        assert.ok(w.x >= 8 && w.y >= 24 && w.x + w.width <= 312 && w.y + w.height <= 212)
      }
      const workspace = page.locator('#packed-workspace')
      await workspace.getByRole('textbox').fill('Packed document survives')
      await workspace.getByRole('button', { name: 'Float panel', exact: true }).click()
      await workspace
        .locator('.nd-floating')
        .getByRole('button', { name: 'Dock panel', exact: true })
        .click()
      assert.equal(await workspace.getByRole('textbox').inputValue(), 'Packed document survives')
      await workspace.getByRole('tab', { name: 'Native view', exact: true }).click()
      assert.equal(await page.evaluate(() => window.workspaceTest.mounts), 1)
      await page.evaluate(async () => {
        const w = window.workspaceTest.workspace
        let saved
        const storage = {
          save: (s) => {
            saved = s
          },
          load: () => saved,
        }
        await w.save(storage)
        w.float('canvas')
        await w.load(storage)
      })
      assert.equal(await page.evaluate(() => window.workspaceTest.mounts), 1)
      assert.equal(await workspace.locator('canvas').getAttribute('data-visible'), 'true')
      assert.deepEqual(errors, [])
      console.log(
        `PASS packed consumer: ${profile.name} (CSS, types, drag, resize, focus, layering, lifecycle, bounds)`,
      )
    } finally {
      await browser?.close()
      await server.close()
    }
  }
} finally {
  rmSync(temp, { recursive: true, force: true })
}
