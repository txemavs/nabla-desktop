/**
 * MDI window runtime store (Pinia).
 *
 * Lifecycle (persistent windows):
 * - closed:    `open=false` — not listed, not visible
 * - open:      `open=true`, `minimized=false` — visible (floating or maximized)
 * - minimized: `open=true`, `minimized=true` — shelf/dock; listed dimmed
 *
 * Maximized windows fill their host bounds. Only one window can be maximized at a time.
 * Restore / minimize returns to the saved floating geometry.
 *
 * Ephemeral windows are removed from the store on close.
 */
import { defineStore } from 'pinia'
import { reactive, ref, onScopeDispose } from 'vue'
import type { WindowState, WindowOptions, DesktopInsets, MaximizePolicy } from '../types'

/** Short intro delay for shelf-to-float animation. */
export const WINDOW_INTRO_MS = 120

/** Cascade offset for each new window (+30px right/down). */
const CASCADE_STEP = 30
const CASCADE_ORIGIN_X = 120

export function defineWindowsStore(id: string) {
  return defineStore(id, () => {
    let nextZ = 10
    let cascadeIndex = 0
    const maximizePolicy = ref<MaximizePolicy>('background')
    const bounds = reactive({
      width: 1280,
      height: 800,
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    const windows = reactive<Map<string, WindowState>>(new Map())
    const activeWindowId = ref<string | null>(null)
    /** Viewport Y below app chrome — maximized windows start here. */
    const dockBottom = ref(48)

    function takeCascadePosition(
      width: number,
      height: number,
      topOffset = dockBottom.value,
    ): { x: number; y: number } {
      const originX = CASCADE_ORIGIN_X
      const originY = Math.max(0, topOffset + 8)
      const maxX = Math.max(originX, bounds.width - width - 24)
      const maxY = Math.max(originY, bounds.height - height - 24)

      let x = originX + cascadeIndex * CASCADE_STEP
      let y = originY + cascadeIndex * CASCADE_STEP
      if (x > maxX || y > maxY) {
        cascadeIndex = 0
        x = originX
        y = originY
      }
      cascadeIndex += 1
      return { x, y }
    }

    function setActiveWindow(id: string | null) {
      const w = id ? windows.get(id) : undefined
      if (w && isInteractive(w) && !w.maximized && maximizePolicy.value === 'exclusive')
        clearOtherMaximized(w.id)
      activeWindowId.value = w && isInteractive(w) ? w.id : null
    }

    function setDockBottom(y: number) {
      dockBottom.value = Number.isFinite(y) ? Math.max(0, y) : 0
      setBounds(bounds.width, bounds.height, {
        ...bounds.insets,
        top: dockBottom.value,
      })
    }

    function isInteractive(w: WindowState) {
      return w.open && !w.minimized
    }

    /** Desktop maximize (or any mobile viewport): one full-screen window. */
    function isImmersive() {
      const id = activeWindowId.value
      const w = id ? windows.get(id) : null
      return !!(w && isInteractive(w) && w.maximized)
    }

    function clearOtherMaximized(exceptId: string) {
      for (const other of windows.values()) {
        if (other.id !== exceptId && other.maximized) other.maximized = false
      }
    }

    const introTimers = new Map<string, ReturnType<typeof setTimeout>>()

    function prefersReducedMotion() {
      return (
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      )
    }

    function cancelIntro(id: string) {
      const t = introTimers.get(id)
      if (t != null) clearTimeout(t)
      introTimers.delete(id)
      const w = windows.get(id)
      if (w) w.introducing = false
    }

    function scheduleIntro(id: string) {
      cancelIntro(id)
      const w = windows.get(id)
      if (prefersReducedMotion()) {
        if (w?.open && w.minimized) {
          w.minimized = false
          setActiveWindow(id)
        }
        return
      }
      if (w) w.introducing = true
      introTimers.set(
        id,
        setTimeout(() => {
          introTimers.delete(id)
          const live = windows.get(id)
          if (!live?.open || !live.minimized) {
            if (live) live.introducing = false
            return
          }
          live.introducing = false
          live.minimized = false
          live.zIndex = nextZ++
          setActiveWindow(id)
        }, WINDOW_INTRO_MS),
      )
    }

    function shouldIntroduce() {
      return !isImmersive() && !prefersReducedMotion()
    }

    function register(id: string, defaults: WindowOptions = {}): WindowState {
      const existing = windows.get(id)
      if (existing) return existing

      const width = defaults.width ?? 600
      const height = defaults.height ?? 400
      const pos =
        defaults.x != null && defaults.y != null
          ? { x: defaults.x, y: defaults.y }
          : takeCascadePosition(width, height)

      const state: WindowState = {
        id,
        title: defaults.title ?? id,
        icon: defaults.icon,
        x: pos.x,
        y: pos.y,
        width,
        height,
        minimized: defaults.minimized ?? false,
        maximized: !!defaults.maximized && defaults.open !== false && !defaults.minimized,
        keepAlive: defaults.keepAlive ?? false,
        closeBehavior: defaults.closeBehavior ?? 'hide',
        hasOpened: defaults.open !== false,
        open: defaults.open ?? true,
        zIndex: nextZ++,
      }
      if (state.maximized) clearOtherMaximized(id)
      Object.assign(state, fitGeometry(state))
      windows.set(id, state)

      if (state.open && !state.maximized && !defaults.minimized && shouldIntroduce()) {
        state.minimized = true
        scheduleIntro(id)
      }
      if (!activeWindowId.value && state.open && !state.minimized) {
        activeWindowId.value = id
      }
      return state
    }

    function unregister(id: string) {
      cancelIntro(id)
      windows.delete(id)
      if (activeWindowId.value === id) {
        const next = pickNextInteractive()
        activeWindowId.value = next?.id ?? null
      }
    }

    function pickNextInteractive(exceptId?: string) {
      return [...windows.values()]
        .filter((w) => w.id !== exceptId && isInteractive(w))
        .sort((a, b) =>
          maximizePolicy.value === 'background' && a.maximized !== b.maximized
            ? Number(a.maximized) - Number(b.maximized)
            : b.zIndex - a.zIndex,
        )[0]
    }

    function focusWindow(id: string) {
      const w = windows.get(id)
      if (!w || !w.open) return
      cancelIntro(id)
      w.minimized = false
      if (!w.maximized && maximizePolicy.value === 'exclusive') clearOtherMaximized(id)
      w.zIndex = nextZ++
      setActiveWindow(id)
    }

    function openWindow(id: string) {
      const stayImmersive = maximizePolicy.value === 'exclusive' && isImmersive()
      const w = windows.get(id)
      if (!w) return
      const wasClosed = !w.open
      w.open = true
      w.hasOpened = true
      if (wasClosed) {
        const pos = takeCascadePosition(w.width, w.height)
        if (!Number.isFinite(w.x)) w.x = pos.x
        if (!Number.isFinite(w.y)) w.y = pos.y
      }
      w.zIndex = nextZ++
      if (stayImmersive) {
        cancelIntro(id)
        w.minimized = false
        maximizeWindow(id)
        return
      }
      if (wasClosed && shouldIntroduce()) {
        w.minimized = true
        scheduleIntro(id)
        return
      }
      w.minimized = false
      setActiveWindow(id)
    }

    function closeWindow(id: string) {
      const w = windows.get(id)
      if (w?.closeBehavior === 'dispose') {
        unregister(id)
        return
      }
      if (w) {
        cancelIntro(id)
        w.open = false
        w.minimized = false
        w.maximized = false
      }
      if (activeWindowId.value === id) {
        const next = pickNextInteractive()
        activeWindowId.value = next?.id ?? null
      }
    }

    function minimizeWindow(id: string) {
      const w = windows.get(id)
      if (!w?.open || w.minimized) return
      cancelIntro(id)
      w.minimized = true
      w.maximized = false
      w.zIndex = nextZ++
      if (activeWindowId.value === id) {
        const next = pickNextInteractive(id)
        activeWindowId.value = next?.id ?? null
      }
    }

    function maximizeWindow(id: string) {
      const w = windows.get(id)
      if (!w?.open) return
      cancelIntro(id)
      clearOtherMaximized(id)
      w.maximized = true
      w.minimized = false
      w.zIndex = nextZ++
      setActiveWindow(id)
    }

    function restoreWindow(id: string) {
      const w = windows.get(id)
      if (!w?.open) return
      cancelIntro(id)
      w.maximized = false
      w.minimized = false
      w.zIndex = nextZ++
      setActiveWindow(id)
    }

    function toggleMaximize(id: string) {
      const w = windows.get(id)
      if (!w?.open) return
      if (w.maximized) restoreWindow(id)
      else maximizeWindow(id)
    }

    function updateGeometry(
      id: string,
      patch: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>,
    ) {
      const w = windows.get(id)
      if (!w) return
      const safe = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => Number.isFinite(value)),
      )
      Object.assign(w, fitGeometry({ ...w, ...safe }))
    }

    function fitGeometry(g: Pick<WindowState, 'x' | 'y' | 'width' | 'height'>) {
      const availableWidth = Math.max(1, bounds.width - bounds.insets.left - bounds.insets.right)
      const availableHeight = Math.max(1, bounds.height - bounds.insets.top - bounds.insets.bottom)
      const width = Math.min(
        availableWidth,
        Math.max(200, Number.isFinite(g.width) ? g.width : 600),
      )
      const height = Math.min(
        availableHeight,
        Math.max(120, Number.isFinite(g.height) ? g.height : 400),
      )
      return {
        width,
        height,
        x: Math.max(
          bounds.insets.left,
          Math.min(
            Number.isFinite(g.x) ? g.x : bounds.insets.left,
            bounds.insets.left + availableWidth - width,
          ),
        ),
        y: Math.max(
          bounds.insets.top,
          Math.min(
            Number.isFinite(g.y) ? g.y : bounds.insets.top,
            bounds.insets.top + availableHeight - height,
          ),
        ),
      }
    }
    function setBounds(width: number, height: number, insets: Partial<DesktopInsets> = {}) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return
      bounds.width = width
      bounds.height = height
      for (const key of ['top', 'right', 'bottom', 'left'] as const) {
        const value = insets[key] ?? 0
        bounds.insets[key] = Number.isFinite(value)
          ? Math.max(
              0,
              Math.min(value, (key === 'top' || key === 'bottom' ? height : width) / 2 - 0.5),
            )
          : 0
      }
      for (const w of windows.values()) Object.assign(w, fitGeometry(w))
    }
    function setMaximizePolicy(policy: MaximizePolicy) {
      maximizePolicy.value = policy
    }

    onScopeDispose(() => {
      for (const id of introTimers.keys()) cancelIntro(id)
    })

    function clear() {
      for (const id of introTimers.keys()) cancelIntro(id)
      windows.clear()
      activeWindowId.value = null
      nextZ = 10
      cascadeIndex = 0
    }

    return {
      windows,
      bounds,
      maximizePolicy,
      setBounds,
      fitGeometry,
      setMaximizePolicy,
      activeWindowId,
      dockBottom,
      register,
      unregister,
      openWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      toggleMaximize,
      updateGeometry,
      setActiveWindow,
      setDockBottom,
      takeCascadePosition,
      clear,
      isImmersive,
    }
  })
}
export const useWindowsStore = defineWindowsStore('windows')
export type WindowsStore = ReturnType<typeof useWindowsStore>
