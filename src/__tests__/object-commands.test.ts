import { expect, it, vi } from 'vitest'
import { createCommandRegistry, snapshotCommandContext, menuLabels } from '../core'

it('evaluates object visibility, permissions and selection state consistently', async () => {
  const registry = createCommandRegistry()
  const existing = new Set(['a'])
  const execute = vi.fn()
  registry.register({
    id: 'inspect', label: 'Inspect',
    visible: context => context.target?.type === 'item',
    enabled: context => existing.has(context.target?.id ?? ''),
    checked: context => context.selection?.some(item => item.id === context.target?.id) ?? false,
    execute,
  })
  const context = { target: { type: 'item', id: 'a' }, selection: [{ type: 'item', id: 'a' }] }
  expect(registry.visible('inspect', context)).toBe(true)
  expect(registry.checked('inspect', context)).toBe(true)
  expect(registry.available('inspect', context)).toBe(true)
  expect(registry.visible('inspect')).toBe(false)
  expect(registry.visible('missing')).toBe(false)
  expect(await registry.execute('inspect', context)).toBe(true)
  existing.delete('a')
  expect(await registry.execute('inspect', context)).toBe(false)
  expect(execute).toHaveBeenCalledOnce()
})

it('captures target and selection identities without retaining mutable references', () => {
  const context = { target: { type: 'item', id: 'a' }, selection: [{ type: 'item', id: 'a' }] }
  const captured = snapshotCommandContext(context)
  context.target.id = 'b'
  context.selection[0].id = 'b'
  context.selection.push({ type: 'item', id: 'c' })
  expect(captured.target?.id).toBe('a')
  expect(captured.selection).toEqual([{ type: 'item', id: 'a' }])
  expect(Object.isFrozen(captured.target)).toBe(true)
  expect(Object.isFrozen(captured.selection)).toBe(true)
})

it('keeps radio selection application-owned and supplies English/Spanish presentation labels', async () => {
  const registry = createCommandRegistry()
  let tool = 'single'
  for (const id of ['single', 'multiple', 'none']) {
    registry.register({
      id, label: id, radioGroup: 'tool', checked: () => tool === id,
      execute: () => { tool = id },
    })
  }
  await registry.execute('none')
  expect(registry.list().filter(command => registry.checked(command.id))).toHaveLength(1)
  expect(registry.checked('none')).toBe(true)
  expect(menuLabels.en.allActions).toBe('All actions')
  expect(menuLabels.es.allActions).toBe('Todas las acciones')
})
