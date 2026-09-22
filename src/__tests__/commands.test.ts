import { expect, it, vi } from 'vitest'
import { createCommandRegistry, matchesShortcut } from '../core'

it('shares availability, scope and checked state without a UI framework', async () => {
  const registry = createCommandRegistry()
  let enabled = false
  const execute = vi.fn()
  const unregister = registry.register({
    id: 'save',
    label: 'Save',
    scope: 'editor',
    enabled: () => enabled,
    execute,
  })
  expect(await registry.execute('save', { scope: 'editor' })).toBe(false)
  enabled = true
  expect(await registry.execute('save', { scope: 'world' })).toBe(false)
  expect(await registry.execute('save', { scope: 'editor' })).toBe(true)
  expect(execute).toHaveBeenCalledOnce()
  expect(() => registry.register({ id: 'save', label: 'Other', execute })).toThrow('Duplicate')
  unregister()
  expect(registry.get('save')).toBeUndefined()
})
it('blocks concurrent execution and recovers from rejected commands', async () => {
  const registry = createCommandRegistry()
  let reject!: (error: Error) => void
  registry.register({
    id: 'save',
    label: 'Save',
    execute: () =>
      new Promise<void>((_, fail) => {
        reject = fail
      }),
  })
  const pending = registry.execute('save')
  expect(await registry.execute('save')).toBe(false)
  reject(new Error('failed'))
  await expect(pending).rejects.toThrow('failed')
  expect(registry.available('save')).toBe(true)
})
it('matches exact modifier combinations and portable primary modifiers', () => {
  const event = { key: 'S', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false }
  expect(matchesShortcut(event, 'Mod+Shift+s')).toBe(true)
  expect(matchesShortcut(event, 'Mod+s')).toBe(false)
  expect(matchesShortcut({ ...event, ctrlKey: false, metaKey: true }, 'Mod+Shift+s')).toBe(true)
})
