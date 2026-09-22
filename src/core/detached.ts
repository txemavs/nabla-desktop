import type { MountedContent } from './content'
export interface DetachedBridge<Action> {
  /** Requests run in the owner. A disconnected view cannot dispatch. */
  dispatch(action: Action): Promise<boolean>
  returnToOwner(): void
}
export interface DetachedContent<State> extends MountedContent {
  update(state: State): void
}
export interface DetachedView<State, Action> {
  title: string
  width?: number
  height?: number
  mount(element: HTMLElement, bridge: DetachedBridge<Action>): DetachedContent<State>
}
export type DetachedCloseReason = 'returned' | 'closed' | 'navigated' | 'owner-disposed' | 'error'
export interface DetachedHostOptions<State, Action> {
  read(): State
  subscribe(changed: () => void): () => void
  dispatch(action: Action): void | Promise<void>
  /** Explicit same-origin stylesheets; no application-wide CSS is copied implicitly. */
  styles?: string[]
  maxWindows?: number
  onClose?(id: string, reason: DetachedCloseReason): void
  onError?(error: unknown): void
}
export type DetachedOpenResult = 'opened' | 'focused' | 'blocked' | 'limit' | 'disposed' | 'error'

/** Optional same-origin browser views. The owner retains all application state. */
export function createDetachedHost<State, Action>(options: DetachedHostOptions<State, Action>) {
  if (typeof window === 'undefined') throw new Error('Detached views require a browser owner')
  const owner = window
  const report = (error: unknown) => {
    try {
      ;(options.onError ?? console.error)(error)
    } catch {
      /* Error reporting must not prevent cleanup. */
    }
  }
  const styles = (options.styles ?? []).map((href) => {
    const url = new URL(href, owner.location.href)
    if (url.origin !== owner.location.origin || !['http:', 'https:'].includes(url.protocol))
      throw new Error('Detached styles must be same-origin HTTP(S) URLs')
    return url.href
  })
  const max = Number.isFinite(options.maxWindows)
    ? Math.max(1, Math.min(20, Math.floor(options.maxWindows!)))
    : 8
  interface Session {
    child: Window
    cleanup(reason: DetachedCloseReason): void
    refresh(): void
  }
  const sessions = new Map<string, Session>()
  let disposed = false,
    refreshing = false,
    queued = false
  function refresh() {
    if (disposed) return
    if (refreshing) {
      queued = true
      return
    }
    refreshing = true
    try {
      for (const session of sessions.values()) session.refresh()
    } finally {
      refreshing = false
    }
    if (queued) {
      queued = false
      queueMicrotask(refresh)
    }
  }
  const stop = options.subscribe(refresh)
  const poll = owner.setInterval(() => {
    for (const session of sessions.values()) {
      try {
        if (session.child.closed) session.cleanup('closed')
      } catch (error) {
        report(error)
        session.cleanup('error')
      }
    }
  }, 500)
  function dispose() {
    if (disposed) return
    disposed = true
    owner.clearInterval(poll)
    owner.removeEventListener('pagehide', dispose)
    try {
      stop()
    } catch (error) {
      report(error)
    }
    for (const session of [...sessions.values()]) session.cleanup('owner-disposed')
  }
  owner.addEventListener('pagehide', dispose)
  const api = {
    ids() {
      return [...sessions.keys()]
    },
    refresh,
    close(id: string) {
      sessions.get(id)?.cleanup('returned')
    },
    dispose,
    open(id: string, view: DetachedView<State, Action>): DetachedOpenResult {
      if (disposed) return 'disposed'
      if (!id) throw new Error('A detached view needs a stable ID')
      const existing = sessions.get(id)
      if (existing && !existing.child.closed) {
        existing.child.focus()
        return 'focused'
      }
      existing?.cleanup('closed')
      if (sessions.size >= max) return 'limit'
      const dimension = (value: number | undefined, fallback: number) =>
        Number.isFinite(value) ? Math.round(Math.max(240, Math.min(2400, value!))) : fallback
      // Synchronous call: callers must invoke open() directly from a user gesture.
      let child: Window | null
      try {
        child = owner.open(
          'about:blank',
          '_blank',
          `popup,width=${dimension(view.width, 540)},height=${dimension(view.height, 620)}`,
        )
      } catch (error) {
        report(error)
        return 'error'
      }
      if (!child) return 'blocked'
      let content: DetachedContent<State> | undefined,
        observer: ResizeObserver | undefined,
        ended = false
      let root: HTMLElement | undefined
      const cleanup = (reason: DetachedCloseReason) => {
        if (ended) return
        ended = true
        sessions.delete(id)
        observer?.disconnect()
        try {
          child.removeEventListener('pagehide', navigated)
          child.removeEventListener('focus', lifecycle)
          child.removeEventListener('blur', lifecycle)
          child.document.removeEventListener('visibilitychange', lifecycle)
        } catch {
          /* Navigated out of same origin. */
        }
        try {
          content?.dispose()
        } catch (error) {
          report(error)
        }
        try {
          child.close()
        } catch (error) {
          report(error)
        }
        try {
          options.onClose?.(id, reason)
        } catch (error) {
          report(error)
        }
        if (reason === 'returned') owner.focus()
      }
      const navigated = () => cleanup(child.closed ? 'closed' : 'navigated')
      const lifecycle = () => {
        if (ended) return
        try {
          content?.setVisible?.(!child.document.hidden)
          content?.setActive?.(child.document.hasFocus())
        } catch (error) {
          report(error)
          cleanup('error')
        }
      }
      const bridge: DetachedBridge<Action> = {
        async dispatch(action) {
          if (ended || disposed || child.closed) return false
          try {
            await options.dispatch(structuredClone(action))
            refresh()
            return true
          } catch (error) {
            report(error)
            return false
          }
        },
        returnToOwner: () => cleanup('returned'),
      }
      const session: Session = {
        child,
        cleanup,
        refresh: () => {
          if (ended) return
          try {
            if (child.closed) {
              cleanup('closed')
              return
            }
            content?.update(structuredClone(options.read()))
          } catch (error) {
            report(error)
            cleanup('error')
          }
        },
      }
      try {
        const doc = child.document
        doc.title = view.title
        doc.documentElement.lang = owner.document.documentElement.lang || 'en'
        const meta = doc.createElement('meta')
        meta.name = 'viewport'
        meta.content = 'width=device-width, initial-scale=1'
        doc.head.append(meta)
        for (const href of styles) {
          const link = doc.createElement('link')
          link.rel = 'stylesheet'
          link.href = href
          doc.head.append(link)
        }
        root = doc.createElement('main')
        root.setAttribute('aria-label', view.title)
        doc.body.append(root)
        sessions.set(id, session)
        // Factories own cleanup of partial allocations if they throw before returning.
        content = view.mount(root, bridge)
        if (ended) {
          content.dispose()
          return 'error'
        }
        observer = new ResizeObserver(() => {
          if (ended) return
          try {
            content?.resize?.(root!.clientWidth, root!.clientHeight)
          } catch (error) {
            report(error)
            cleanup('error')
          }
        })
        observer.observe(root)
        child.addEventListener('pagehide', navigated)
        child.addEventListener('focus', lifecycle)
        child.addEventListener('blur', lifecycle)
        doc.addEventListener('visibilitychange', lifecycle)
        lifecycle()
        session.refresh()
        if (ended) return 'error'
        child.focus()
        return 'opened'
      } catch (error) {
        report(error)
        cleanup('error')
        return 'error'
      }
    },
  }
  return api
}
export type DetachedHost<State, Action> = ReturnType<typeof createDetachedHost<State, Action>>
