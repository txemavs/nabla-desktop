import { describe, it, expect, vi } from 'vitest'
import {
  createWorkspace,
  measureWorkspace,
  validateWorkspace,
  type WorkspaceSnapshot,
} from '../core'
function setup() {
  const w = createWorkspace()
  for (const id of ['world', 'notes', 'tools']) {
    w.register({ id, title: id })
    w.open(id)
  }
  return w
}
describe('workspace invariants', () => {
  it('moves stable panel IDs between tabs, splits and floats without duplicates', () => {
    const w = setup(),
      root = w.snapshot().root!
    w.dock('notes', root.id, 'right')
    expect(w.snapshot().root?.kind).toBe('split')
    w.float('world')
    const groups = measureWorkspace(w.snapshot(), 800, 600).groups
    expect(groups.flatMap((g) => g.group.tabs).sort()).toEqual(['notes', 'tools', 'world'])
    w.dock('world', groups.find((g) => !g.floating)!.group.id)
    expect(w.snapshot().floating).toHaveLength(0)
    expect(validateWorkspace(w.snapshot(), new Set(['world', 'notes', 'tools']))).toEqual(
      w.snapshot(),
    )
  })
  it('reorders, activates and closes tabs with an eligible fallback', async () => {
    const w = setup(),
      id = w.snapshot().root!.id
    w.dock('world', id, 'center', 2)
    expect(w.snapshot().root).toMatchObject({ tabs: ['notes', 'tools', 'world'], active: 'world' })
    await w.close('world')
    expect(w.snapshot().active).toBe('tools')
    await w.close('notes')
    await w.close('tools')
    expect(w.snapshot().root).toBeNull()
    expect(w.snapshot().active).toBeNull()
    expect(w.open('missing')).toBe(false)
    w.open('world')
    expect(w.snapshot().active).toBe('world')
  })
  it('honors async close guards, deduplicates requests and ignores stale approvals', async () => {
    const w = createWorkspace()
    let resolve!: (v: boolean) => void
    const guard = vi.fn(
      () =>
        new Promise<boolean>((r) => {
          resolve = r
        }),
    )
    w.register({ id: 'doc', title: 'Doc', beforeClose: guard })
    w.open('doc')
    const pending = w.close('doc')
    expect(await w.close('doc')).toBe(false)
    resolve(false)
    expect(await pending).toBe(false)
    const next = w.close('doc')
    w.restore(w.snapshot())
    resolve(true)
    expect(await next).toBe(false)
    expect(w.snapshot().active).toBe('doc')
    const last = w.close('doc')
    resolve(true)
    expect(await last).toBe(true)
    expect(guard).toHaveBeenCalledTimes(3)
  })
  it('validates transactionally and recovers unavailable panels and tiny bounds', () => {
    const w = setup(),
      before = w.snapshot()
    expect(() => w.restore({ ...before, version: 99 })).toThrow()
    expect(w.snapshot()).toEqual(before)
    w.float('notes', { x: 5000, y: -100, width: 900, height: 800 })
    const rects = measureWorkspace(w.snapshot(), 120, 90).groups
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.width).toBeLessThanOrEqual(120)
      expect(r.y + r.height).toBeLessThanOrEqual(90)
    }
    const restored = validateWorkspace(w.snapshot(), new Set(['world']))
    expect(restored.root).toMatchObject({ tabs: ['world'] })
    expect(restored.floating).toEqual([])
  })
  it('rejects invalid ratios, duplicate node IDs and recursive snapshots', () => {
    const w = setup()
    w.dock('notes', w.snapshot().root!.id, 'left')
    const raw = w.snapshot()
    if (raw.root?.kind !== 'split') throw Error()
    raw.root.ratio = NaN
    expect(() => w.restore(raw)).toThrow()
    raw.root.ratio = 0.5
    raw.root.second.id = raw.root.first.id
    expect(() => w.restore(raw)).toThrow()
    raw.root.first = raw.root
    expect(() => w.restore(raw)).toThrow()
  })
  it('round trips injected storage and allows explicit migrations', async () => {
    const w = setup()
    let stored: unknown
    const storage = {
      load: () => stored,
      save: (s: WorkspaceSnapshot) => {
        stored = s
      },
    }
    await w.save(storage)
    await w.close('world')
    await w.load(storage)
    expect(w.snapshot().root).toMatchObject({ tabs: ['world', 'notes', 'tools'] })
    await w.load({ load: () => ({ legacy: true }), save: () => {} }, () => stored)
    expect(w.snapshot()).toEqual(stored)
    const before = w.snapshot()
    await expect(
      w.load({ load: () => Promise.reject(Error('offline')), save: () => {} }),
    ).rejects.toThrow('offline')
    expect(w.snapshot()).toEqual(before)
  })
  it('keeps instances isolated and old unregister callbacks harmless', () => {
    const a = createWorkspace(),
      b = createWorkspace(),
      remove = a.register({ id: 'same', title: 'Old' })
    b.register({ id: 'same', title: 'Other' })
    remove()
    a.register({ id: 'same', title: 'New' })
    remove()
    expect(a.definitions()[0].title).toBe('New')
    expect(b.definitions()[0].title).toBe('Other')
  })
})
