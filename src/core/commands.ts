export interface CommandTarget {
  type: string
  id: string
}
export interface CommandContext {
  scope?: string
  target?: Readonly<CommandTarget>
  selection?: readonly Readonly<CommandTarget>[]
}
export interface DesktopCommand {
  id: string
  label: string
  icon?: string
  iconOnly?: boolean
  shortcut?: string
  scope?: string
  allowInInput?: boolean
  enabled?: (context: CommandContext) => boolean
  visible?: (context: CommandContext) => boolean
  checked?: (context: CommandContext) => boolean
  /** Application owns the selected value; menus present this as an exclusive choice. */
  radioGroup?: string
  execute: (context: CommandContext) => void | Promise<void>
}
export type MenuItem =
  { command: string } | { separator: true } | { label: string; children: MenuItem[] }
export interface DesktopMenu {
  id: string
  label: string
  items: MenuItem[]
}

/** Capture identities, not scene objects. Predicates revalidate them before execution. */
export function snapshotCommandContext(context: CommandContext = {}): CommandContext {
  return Object.freeze({
    ...context,
    target: context.target ? Object.freeze({ ...context.target }) : undefined,
    selection: context.selection
      ? Object.freeze(context.selection.map(target => Object.freeze({ ...target })))
      : undefined,
  })
}

/** No Vue or Pinia dependency. The application owns callbacks and context. */
export function createCommandRegistry() {
  const commands = new Map<string, DesktopCommand>()
  const listeners = new Set<() => void>()
  const busy = new Set<string>()
  let suspended = 0
  const notify = () => {
    for (const listener of listeners) listener()
  }
  const available = (c: DesktopCommand, context: CommandContext) =>
    (!c.scope || c.scope === context.scope) &&
    (c.visible?.(context) ?? true) &&
    (c.enabled?.(context) ?? true) &&
    !busy.has(c.id)
  const registry = {
    register(command: DesktopCommand) {
      if (commands.has(command.id)) throw new Error(`Duplicate command: ${command.id}`)
      commands.set(command.id, command)
      notify()
      return () => {
        if (commands.get(command.id) === command) {
          commands.delete(command.id)
          notify()
        }
      }
    },
    get(id: string) {
      return commands.get(id)
    },
    list() {
      return [...commands.values()]
    },
    visible(id: string, context: CommandContext = {}) {
      const c = commands.get(id)
      return !!c && (c.visible?.(context) ?? true)
    },
    checked(id: string, context: CommandContext = {}) {
      return commands.get(id)?.checked?.(context)
    },
    available(id: string, context: CommandContext = {}) {
      const c = commands.get(id)
      return !!c && available(c, context)
    },
    notify,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    suspendShortcuts() {
      suspended++
      let released = false
      return () => {
        if (!released) {
          suspended--
          released = true
        }
      }
    },
    async execute(id: string, context: CommandContext = {}) {
      const command = commands.get(id)
      if (!command || !available(command, context)) return false
      busy.add(id)
      notify()
      try {
        await command.execute(context)
        return true
      } finally {
        busy.delete(id)
        notify()
      }
    },
    attachShortcuts(
      root: HTMLElement,
      context: () => CommandContext = () => ({}),
      onError: (error: unknown) => void = console.error,
    ) {
      const handle = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.repeat || event.isComposing || suspended) return
        const target = event.target as HTMLElement | null
        const editing = !!target?.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        )
        const current = context()
        // A matching active-scope command takes precedence over an application command.
        const matches = [...commands.values()].filter(
          (c) =>
            c.shortcut &&
            available(c, current) &&
            (!editing || c.allowInInput) &&
            matchesShortcut(event, c.shortcut),
        )
        matches.sort((a, b) => Number(!!b.scope) - Number(!!a.scope))
        const selected = matches[0]
        if (!selected) return
        event.preventDefault()
        event.stopPropagation()
        void registry.execute(selected.id, current).catch(onError)
      }
      root.addEventListener('keydown', handle)
      return () => root.removeEventListener('keydown', handle)
    },
  }
  return registry
}
export type CommandRegistry = ReturnType<typeof createCommandRegistry>
export function matchesShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  shortcut: string,
) {
  const parts = shortcut
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
  const key = parts.pop()
  const mod = parts.includes('mod')
  return (
    event.key.toLowerCase() === key &&
    (mod
      ? event.ctrlKey || event.metaKey
      : event.ctrlKey === parts.includes('ctrl') && event.metaKey === parts.includes('meta')) &&
    event.shiftKey === parts.includes('shift') &&
    event.altKey === parts.includes('alt')
  )
}
