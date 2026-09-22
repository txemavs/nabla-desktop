import { afterEach, expect, it, vi } from 'vitest'
import { mountExternalContent } from '../core'
afterEach(() => {
  vi.unstubAllGlobals()
})
it('resizes only visible content and releases resources exactly once', () => {
  const disconnect = vi.fn()
  let changed!: () => void
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        changed = callback
      }
      observe() {}
      disconnect = disconnect
    },
  )
  const element = { clientWidth: 400, clientHeight: 300 } as HTMLElement
  const content = { resize: vi.fn(), setVisible: vi.fn(), setActive: vi.fn(), dispose: vi.fn() }
  const mounted = mountExternalContent(element, () => content, { visible: false, active: false })
  changed()
  expect(content.resize).not.toHaveBeenCalled()
  mounted.update({ visible: true, active: true })
  expect(content.resize).toHaveBeenLastCalledWith(400, 300)
  expect(content.setActive).toHaveBeenLastCalledWith(true)
  mounted.dispose()
  mounted.dispose()
  changed()
  mounted.update({ visible: true, active: true })
  expect(content.resize).toHaveBeenCalledOnce()
  expect(content.dispose).toHaveBeenCalledOnce()
  expect(disconnect).toHaveBeenCalledOnce()
})
it('cleans up a mounted renderer when initial lifecycle notification fails', () => {
  const disconnect = vi.fn(),
    dispose = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect = disconnect
    },
  )
  expect(() =>
    mountExternalContent({} as HTMLElement, () => ({
      dispose,
      setVisible() {
        throw new Error('renderer failed')
      },
    })),
  ).toThrow('renderer failed')
  expect(dispose).toHaveBeenCalledOnce()
  expect(disconnect).toHaveBeenCalledOnce()
})
