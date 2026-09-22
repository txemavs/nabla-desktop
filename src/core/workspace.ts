/** Layout state is independent from view instances and document state. */
export interface PanelDefinition {
  id: string
  title: string
  dirty?: () => boolean
  beforeClose?: () => boolean | Promise<boolean>
}
export interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
}
export interface TabGroup {
  kind: 'tabs'
  id: string
  tabs: string[]
  active: string
}
export interface LayoutSplit {
  kind: 'split'
  id: string
  axis: 'horizontal' | 'vertical'
  ratio: number
  first: LayoutNode
  second: LayoutNode
}
export type LayoutNode = TabGroup | LayoutSplit
export interface FloatingGroup extends LayoutRect {
  group: TabGroup
}
export interface WorkspaceSnapshot {
  version: 1
  root: LayoutNode | null
  floating: FloatingGroup[]
  active: string | null
}
export type DockPosition = 'center' | 'left' | 'right' | 'top' | 'bottom'
export interface LayoutStorage {
  load(): unknown | Promise<unknown>
  save(snapshot: WorkspaceSnapshot): void | Promise<void>
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const boundRatio = (value: number) => Math.max(0.1, Math.min(0.9, value))

/** Reject malformed schemas, remove unavailable views, and collapse empty splits. */
export function validateWorkspace(value: unknown, known: ReadonlySet<string>): WorkspaceSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid workspace snapshot')
  const raw = value as WorkspaceSnapshot
  if (raw.version !== 1) throw new Error('Unsupported workspace version')
  if (!Array.isArray(raw.floating) || raw.floating.length > 100)
    throw new Error('Invalid floating groups')
  const used = new Set<string>(),
    nodes = new Set<string>()
  let count = 0
  function parse(value: unknown, depth = 0): LayoutNode | null {
    if (!value || typeof value !== 'object' || depth > 24 || ++count > 500)
      throw new Error('Invalid layout node')
    const n = value as LayoutNode
    if (typeof n.id !== 'string' || !n.id || n.id.length > 200 || nodes.has(n.id))
      throw new Error('Invalid or duplicate group ID')
    nodes.add(n.id)
    if (n.kind === 'tabs') {
      if (!Array.isArray(n.tabs) || n.tabs.length > 500 || typeof n.active !== 'string')
        throw new Error('Invalid tabs')
      const tabs = n.tabs.filter((id) => {
        if (typeof id !== 'string') throw new Error('Invalid panel ID')
        if (!known.has(id) || used.has(id)) return false
        used.add(id)
        return true
      })
      return tabs.length
        ? { kind: 'tabs', id: n.id, tabs, active: tabs.includes(n.active) ? n.active : tabs[0] }
        : null
    }
    if (n.kind !== 'split' || !['horizontal', 'vertical'].includes(n.axis) || !finite(n.ratio))
      throw new Error('Invalid split')
    const first = parse(n.first, depth + 1),
      second = parse(n.second, depth + 1)
    return first && second
      ? { kind: 'split', id: n.id, axis: n.axis, ratio: boundRatio(n.ratio), first, second }
      : (first ?? second)
  }
  const root = raw.root === null ? null : parse(raw.root)
  const floating: FloatingGroup[] = []
  for (const f of raw.floating) {
    if (
      !f ||
      ![f.x, f.y, f.width, f.height].every(finite) ||
      f.width <= 0 ||
      f.height <= 0 ||
      f.group?.kind !== 'tabs'
    )
      throw new Error('Invalid floating bounds')
    const group = parse(f.group)
    if (group?.kind === 'tabs')
      floating.push({ group, x: f.x, y: f.y, width: f.width, height: f.height })
  }
  const eligible = [...groupsIn(root), ...floating.map((f) => f.group)].map((g) => g.active)
  return {
    version: 1,
    root,
    floating,
    active:
      typeof raw.active === 'string' && eligible.includes(raw.active)
        ? raw.active
        : (eligible[0] ?? null),
  }
}
function groupsIn(node: LayoutNode | null): TabGroup[] {
  return !node
    ? []
    : node.kind === 'tabs'
      ? [node]
      : [...groupsIn(node.first), ...groupsIn(node.second)]
}
function replace(
  node: LayoutNode | null,
  id: string,
  replacement: LayoutNode | null,
): LayoutNode | null {
  if (!node) return null
  if (node.id === id) return replacement
  if (node.kind === 'tabs') return node
  const first = replace(node.first, id, replacement),
    second = replace(node.second, id, replacement)
  return first && second ? { ...node, first, second } : (first ?? second)
}
export function createWorkspace() {
  const panels = new Map<string, PanelDefinition>(),
    listeners = new Set<() => void>(),
    pending = new Set<string>()
  let layout: WorkspaceSnapshot = { version: 1, root: null, floating: [], active: null },
    counter = 0,
    generation = 0
  const notify = () => {
    for (const fn of listeners) fn()
  }
  const groups = () => [...groupsIn(layout.root), ...layout.floating.map((f) => f.group)]
  const groupFor = (id: string) => groups().find((g) => g.tabs.includes(id))
  const newGroup = (id: string): TabGroup => {
    const ids = new Set<string>()
    function visit(n: LayoutNode | null) {
      if (!n) return
      ids.add(n.id)
      if (n.kind === 'split') {
        visit(n.first)
        visit(n.second)
      }
    }
    visit(layout.root)
    layout.floating.forEach((f) => visit(f.group))
    let key: string
    do {
      key = `group-${++counter}`
    } while (ids.has(key) || ids.has(`split-${key}`))
    return { kind: 'tabs', id: key, tabs: [id], active: id }
  }
  function prune() {
    for (const g of groups())
      if (!g.tabs.length) {
        layout.root = replace(layout.root, g.id, null)
        layout.floating = layout.floating.filter((f) => f.group.id !== g.id)
      }
    if (!groups().some((g) => g.active === layout.active))
      layout.active = groups()[0]?.active ?? null
  }
  function detach(id: string) {
    const g = groupFor(id)
    if (!g) return
    const index = g.tabs.indexOf(id)
    g.tabs.splice(index, 1)
    if (g.active === id) g.active = g.tabs[Math.min(index, g.tabs.length - 1)] ?? ''
    prune()
  }
  const api = {
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    notify,
    definitions() {
      return [...panels.values()]
    },
    snapshot(): WorkspaceSnapshot {
      return clone(layout)
    },
    register(panel: PanelDefinition) {
      if (!panel.id || panels.has(panel.id))
        throw new Error(`Duplicate or empty panel ID: ${panel.id}`)
      panels.set(panel.id, panel)
      notify()
      return () => {
        if (panels.get(panel.id) !== panel) return
        detach(panel.id)
        panels.delete(panel.id)
        generation++
        notify()
      }
    },
    activate(id: string) {
      const g = groupFor(id)
      if (!g) return false
      g.active = id
      layout.active = id
      const f = layout.floating.find((f) => f.group.id === g.id)
      if (f) layout.floating = [...layout.floating.filter((item) => item !== f), f]
      notify()
      return true
    },
    open(id: string) {
      if (!panels.has(id)) return false
      if (!groupFor(id)) {
        const first = groups()[0]
        if (first) first.tabs.push(id)
        else layout.root = newGroup(id)
      }
      return api.activate(id)
    },
    async close(id: string) {
      const definition = panels.get(id)
      if (!definition || !groupFor(id) || pending.has(id)) return false
      pending.add(id)
      const started = generation
      try {
        if (definition.beforeClose && !(await definition.beforeClose())) return false
        if (started !== generation || panels.get(id) !== definition) return false
        detach(id)
        notify()
        return true
      } finally {
        pending.delete(id)
      }
    },
    dock(id: string, targetGroup: string, position: DockPosition = 'center', index?: number) {
      if (!panels.has(id) || !['center', 'left', 'right', 'top', 'bottom'].includes(position))
        return false
      const target = groups().find((g) => g.id === targetGroup)
      if (!target) return false
      if (position !== 'center' && layout.floating.some((f) => f.group === target)) return false
      if (target.tabs.length === 1 && target.tabs[0] === id && position !== 'center') return false
      // Preserve the target group while moving its last tab within itself.
      if (target === groupFor(id) && position === 'center') {
        target.tabs.splice(target.tabs.indexOf(id), 1)
        target.tabs.splice(
          index === undefined
            ? target.tabs.length
            : Math.max(0, Math.min(target.tabs.length, index)),
          0,
          id,
        )
      } else {
        detach(id)
        if (position === 'center')
          target.tabs.splice(
            index === undefined
              ? target.tabs.length
              : Math.max(0, Math.min(target.tabs.length, index)),
            0,
            id,
          )
        else {
          const g = newGroup(id),
            before = position === 'left' || position === 'top'
          const split: LayoutSplit = {
            kind: 'split',
            id: `split-${g.id}`,
            axis: position === 'left' || position === 'right' ? 'horizontal' : 'vertical',
            ratio: 0.5,
            first: before ? g : target,
            second: before ? target : g,
          }
          layout.root = replace(layout.root, target.id, split)
        }
      }
      return api.activate(id)
    },
    float(id: string, rect: LayoutRect = { x: 40, y: 40, width: 420, height: 300 }) {
      if (
        !panels.has(id) ||
        ![rect.x, rect.y, rect.width, rect.height].every(finite) ||
        rect.width <= 0 ||
        rect.height <= 0
      )
        return false
      detach(id)
      layout.floating.push({ ...rect, group: newGroup(id) })
      return api.activate(id)
    },
    moveFloating(groupId: string, rect: LayoutRect) {
      const f = layout.floating.find((f) => f.group.id === groupId)
      if (!f || ![rect.x, rect.y, rect.width, rect.height].every(finite)) return
      Object.assign(f, {
        x: rect.x,
        y: rect.y,
        width: Math.max(160, rect.width),
        height: Math.max(100, rect.height),
      })
      notify()
    },
    resizeSplit(id: string, ratio: number) {
      if (!finite(ratio)) return
      function visit(node: LayoutNode | null) {
        if (node?.kind !== 'split') return
        if (node.id === id) node.ratio = boundRatio(ratio)
        else {
          visit(node.first)
          visit(node.second)
        }
      }
      visit(layout.root)
      notify()
    },
    restore(value: unknown) {
      const next = validateWorkspace(value, new Set(panels.keys()))
      layout = next
      generation++
      notify()
    },
    async save(storage: LayoutStorage) {
      await storage.save(api.snapshot())
    },
    async load(storage: LayoutStorage, migrate?: (value: unknown) => unknown) {
      const value = await storage.load()
      api.restore(migrate ? migrate(value) : value)
    },
  }
  return api
}
export type Workspace = ReturnType<typeof createWorkspace>
export interface PlacedGroup extends LayoutRect {
  group: TabGroup
  floating: boolean
  z: number
}
export interface PlacedDivider extends LayoutRect {
  id: string
  axis: LayoutSplit['axis']
  ratio: number
  parent: LayoutRect
}
/** Minimum sizes are best-effort; small containers always take precedence. */
export function measureWorkspace(layout: WorkspaceSnapshot, width: number, height: number) {
  const groups: PlacedGroup[] = [],
    dividers: PlacedDivider[] = []
  width = Math.max(0, width)
  height = Math.max(0, height)
  function place(node: LayoutNode, rect: LayoutRect) {
    if (node.kind === 'tabs') {
      groups.push({ ...rect, group: node, floating: false, z: 1 })
      return
    }
    const horizontal = node.axis === 'horizontal',
      size = horizontal ? rect.width : rect.height,
      gap = Math.min(6, size),
      available = size - gap,
      min = Math.min(140, available / 2),
      first = Math.max(min, Math.min(available - min, available * node.ratio))
    dividers.push({
      ...rect,
      id: node.id,
      axis: node.axis,
      ratio: node.ratio,
      parent: rect,
      x: rect.x + (horizontal ? first : 0),
      y: rect.y + (horizontal ? 0 : first),
      width: horizontal ? gap : rect.width,
      height: horizontal ? rect.height : gap,
    })
    place(node.first, {
      ...rect,
      width: horizontal ? first : rect.width,
      height: horizontal ? rect.height : first,
    })
    place(node.second, {
      x: rect.x + (horizontal ? first + gap : 0),
      y: rect.y + (horizontal ? 0 : first + gap),
      width: horizontal ? available - first : rect.width,
      height: horizontal ? rect.height : available - first,
    })
  }
  if (layout.root) place(layout.root, { x: 0, y: 0, width, height })
  layout.floating.forEach((f, i) => {
    const w = Math.min(width, f.width),
      h = Math.min(height, f.height)
    groups.push({
      group: f.group,
      floating: true,
      z: 10 + i * 3,
      x: Math.max(0, Math.min(f.x, width - w)),
      y: Math.max(0, Math.min(f.y, height - h)),
      width: w,
      height: h,
    })
  })
  return { groups, dividers }
}
