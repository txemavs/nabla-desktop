import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { VERSION, useWindowsStore } from '../index'
import type { WindowState, WindowOptions } from '../types'

describe('@nabla/desktop', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exports VERSION constant', () => {
    expect(VERSION).toBe('0.1.0')
  })

  it('WindowState type is usable', () => {
    const state: WindowState = {
      id: 'test-window',
      title: 'Test Window',
      x: 100,
      y: 100,
      width: 800,
      height: 600,
      minimized: false,
      maximized: false,
      open: true,
      zIndex: 1,
    }
    expect(state.id).toBe('test-window')
    expect(state.minimized).toBe(false)
    expect(state.open).toBe(true)
  })

  it('WindowOptions type is usable', () => {
    const opts: WindowOptions = {
      title: 'My Window',
      width: 400,
      height: 300,
    }
    expect(opts.title).toBe('My Window')
  })
})

describe('useWindowsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('register', () => {
    it('registers a window with default values', () => {
      const store = useWindowsStore()
      const state = store.register('test-1')

      expect(state.id).toBe('test-1')
      expect(state.title).toBe('test-1')
      expect(state.width).toBe(600)
      expect(state.height).toBe(400)
      expect(state.open).toBe(true)
      expect(state.minimized).toBe(true) // intro animation
      expect(state.maximized).toBe(false)
      expect(store.windows.get('test-1')?.id).toBe(state.id)
    })

    it('registers a window with custom options', () => {
      const store = useWindowsStore()
      const state = store.register('test-2', {
        title: 'Custom Title',
        width: 800,
        height: 500,
        x: 200,
        y: 150,
      })

      expect(state.title).toBe('Custom Title')
      expect(state.width).toBe(800)
      expect(state.height).toBe(500)
      expect(state.x).toBe(200)
      expect(state.y).toBe(150)
    })

    it('returns existing window if already registered', () => {
      const store = useWindowsStore()
      const first = store.register('same-id', { title: 'First' })
      const second = store.register('same-id', { title: 'Second' })

      expect(first.id).toBe(second.id)
      expect(store.windows.get('same-id')?.title).toBe('First')
    })
  })

  describe('unregister', () => {
    it('removes a window from the store', () => {
      const store = useWindowsStore()
      store.register('to-remove')
      expect(store.windows.has('to-remove')).toBe(true)

      store.unregister('to-remove')
      expect(store.windows.has('to-remove')).toBe(false)
    })

    it('clears activeWindowId if removing active window', () => {
      const store = useWindowsStore()
      store.register('active-one', { minimized: true })
      store.focusWindow('active-one')
      expect(store.activeWindowId).toBe('active-one')

      store.unregister('active-one')
      expect(store.activeWindowId).toBe(null)
    })
  })

  describe('openWindow', () => {
    it('opens a closed window', () => {
      const store = useWindowsStore()
      store.register('w1', { open: false, minimized: true })
      const w = store.windows.get('w1')!
      expect(w.open).toBe(false)

      store.openWindow('w1')
      expect(w.open).toBe(true)
    })
  })

  describe('closeWindow', () => {
    it('closes an open window', () => {
      const store = useWindowsStore()
      store.register('w2', { minimized: true })
      const w = store.windows.get('w2')!
      expect(w.open).toBe(true)

      store.closeWindow('w2')
      expect(w.open).toBe(false)
      expect(w.minimized).toBe(false)
      expect(w.maximized).toBe(false)
    })
  })

  describe('minimizeWindow', () => {
    it('minimizes an open window', () => {
      const store = useWindowsStore()
      store.register('w3', { minimized: true })
      store.focusWindow('w3')
      const w = store.windows.get('w3')!
      expect(w.minimized).toBe(false)

      store.minimizeWindow('w3')
      expect(w.minimized).toBe(true)
      expect(store.activeWindowId).toBe(null)
    })

    it('does nothing if window is already minimized', () => {
      const store = useWindowsStore()
      store.register('w4', { minimized: true })
      const w = store.windows.get('w4')!
      w.minimized = true
      const zBefore = w.zIndex

      store.minimizeWindow('w4')
      expect(w.zIndex).toBe(zBefore)
    })
  })

  describe('maximizeWindow', () => {
    it('maximizes an open window', () => {
      const store = useWindowsStore()
      store.register('w5', { minimized: true })
      const w = store.windows.get('w5')!

      store.maximizeWindow('w5')
      expect(w.maximized).toBe(true)
      expect(w.minimized).toBe(false)
      expect(store.activeWindowId).toBe('w5')
    })

    it('clears maximized from other windows', () => {
      const store = useWindowsStore()
      store.register('w6', { minimized: true })
      store.register('w7', { minimized: true })
      store.maximizeWindow('w6')
      expect(store.windows.get('w6')!.maximized).toBe(true)

      store.maximizeWindow('w7')
      expect(store.windows.get('w6')!.maximized).toBe(false)
      expect(store.windows.get('w7')!.maximized).toBe(true)
    })
  })

  describe('restoreWindow', () => {
    it('restores a maximized window', () => {
      const store = useWindowsStore()
      store.register('w8', { minimized: true })
      const w = store.windows.get('w8')!
      store.maximizeWindow('w8')
      expect(w.maximized).toBe(true)

      store.restoreWindow('w8')
      expect(w.maximized).toBe(false)
      expect(w.minimized).toBe(false)
    })

    it('restores a minimized window', () => {
      const store = useWindowsStore()
      store.register('w9', { minimized: true })
      const w = store.windows.get('w9')!
      w.minimized = true

      store.restoreWindow('w9')
      expect(w.minimized).toBe(false)
    })
  })

  describe('toggleMaximize', () => {
    it('toggles between maximized and restored', () => {
      const store = useWindowsStore()
      store.register('w10', { minimized: true })
      const w = store.windows.get('w10')!

      store.toggleMaximize('w10')
      expect(w.maximized).toBe(true)

      store.toggleMaximize('w10')
      expect(w.maximized).toBe(false)
    })
  })

  describe('focusWindow', () => {
    it('focuses a window and updates zIndex', () => {
      const store = useWindowsStore()
      store.register('f1', { minimized: true })
      store.register('f2', { minimized: true })

      const z1Before = store.windows.get('f1')!.zIndex
      store.focusWindow('f1')
      expect(store.activeWindowId).toBe('f1')
      expect(store.windows.get('f1')!.zIndex).toBeGreaterThan(z1Before)
    })

    it('unminimizes a minimized window', () => {
      const store = useWindowsStore()
      store.register('f3', { minimized: true })
      const w = store.windows.get('f3')!
      w.minimized = true

      store.focusWindow('f3')
      expect(w.minimized).toBe(false)
    })
  })

  describe('updateGeometry', () => {
    it('updates window position and size', () => {
      const store = useWindowsStore()
      store.register('g1', { x: 0, y: 0, width: 100, height: 100, minimized: true })
      const w = store.windows.get('g1')!

      store.updateGeometry('g1', { x: 50, y: 60, width: 300, height: 200 })
      expect(w.x).toBe(50)
      expect(w.y).toBe(60)
      expect(w.width).toBe(300)
      expect(w.height).toBe(200)
    })

    it('handles partial updates', () => {
      const store = useWindowsStore()
      store.register('g2', { x: 10, y: 20, minimized: true })
      const w = store.windows.get('g2')!

      store.updateGeometry('g2', { x: 100 })
      expect(w.x).toBe(100)
      expect(w.y).toBe(20)
    })
  })

  describe('clear', () => {
    it('removes all windows', () => {
      const store = useWindowsStore()
      store.register('c1', { minimized: true })
      store.register('c2', { minimized: true })
      store.focusWindow('c1')

      store.clear()
      expect(store.windows.size).toBe(0)
      expect(store.activeWindowId).toBe(null)
    })
  })

  describe('zIndex ordering', () => {
    it('assigns increasing zIndex to new windows', () => {
      const store = useWindowsStore()
      const w1 = store.register('z1', { minimized: true })
      const w2 = store.register('z2', { minimized: true })
      const w3 = store.register('z3', { minimized: true })

      expect(w2.zIndex).toBeGreaterThan(w1.zIndex)
      expect(w3.zIndex).toBeGreaterThan(w2.zIndex)
    })

    it('brings window to front on focus', () => {
      const store = useWindowsStore()
      store.register('z4', { minimized: true })
      store.register('z5', { minimized: true })

      const w4z = store.windows.get('z4')!.zIndex
      const w5z = store.windows.get('z5')!.zIndex
      expect(w5z).toBeGreaterThan(w4z)

      store.focusWindow('z4')
      expect(store.windows.get('z4')!.zIndex).toBeGreaterThan(w5z)
    })
  })

  describe('cascade placement', () => {
    it('places windows in cascade pattern', () => {
      const store = useWindowsStore()
      store.clear()

      const w1 = store.register('cas1', { minimized: true })
      const w2 = store.register('cas2', { minimized: true })
      const w3 = store.register('cas3', { minimized: true })

      expect(w2.x).toBeGreaterThan(w1.x)
      expect(w2.y).toBeGreaterThan(w1.y)
      expect(w3.x).toBeGreaterThan(w2.x)
      expect(w3.y).toBeGreaterThan(w2.y)
    })
  })

  describe('dockBottom', () => {
    it('can be set and read', () => {
      const store = useWindowsStore()
      expect(store.dockBottom).toBe(48)

      store.setDockBottom(64)
      expect(store.dockBottom).toBe(64)
    })
  })
})
