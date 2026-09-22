/**
 * MDI window runtime store (Pinia).
 *
 * Lifecycle (persistent windows):
 * - closed:    `open=false` — not listed, not visible
 * - open:      `open=true`, `minimized=false` — visible (floating or maximized)
 * - minimized: `open=true`, `minimized=true` — shelf/dock; listed dimmed
 *
 * Maximized windows use full viewport. Only one window can be maximized at a time.
 * Restore / minimize returns to the saved floating geometry.
 *
 * Ephemeral windows are removed from the store on close.
 */
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { WindowState, WindowOptions } from '../types'

/** Short intro delay for shelf-to-float animation. */
export const WINDOW_INTRO_MS = 120

let nextZ = 10

/** Cascade offset for each new window (+30px right/down). */
const CASCADE_STEP = 30
const CASCADE_ORIGIN_X = 120

let cascadeIndex = 0

export const useWindowsStore = defineStore('windows', () => {
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
    const maxX = Math.max(originX, (typeof window !== 'undefined' ? window.innerWidth : 1280) - width - 24)
    const maxY = Math.max(originY, (typeof window !== 'undefined' ? window.innerHeight : 800) - height - 24)

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
    activeWindowId.value = id
  }

  function setDockBottom(y: number) {
    dockBottom.value = y
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
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
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
      maximized: defaults.maximized ?? false,
      open: defaults.open ?? true,
      zIndex: nextZ++,
    }
    windows.set(id, state)

    if (state.open && !defaults.minimized && shouldIntroduce()) {
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
      const next = [...windows.values()].find((w) => w.open)
      activeWindowId.value = next?.id ?? null
    }
  }

  function pickNextInteractive(exceptId?: string) {
    return [...windows.values()]
      .filter((w) => w.id !== exceptId && isInteractive(w))
      .sort((a, b) => b.zIndex - a.zIndex)[0]
  }

  function focusWindow(id: string) {
    const w = windows.get(id)
    if (!w || !w.open) return
    cancelIntro(id)
    w.minimized = false
    if (!w.maximized) clearOtherMaximized(id)
    w.zIndex = nextZ++
    setActiveWindow(id)
  }

  function openWindow(id: string) {
    const stayImmersive = isImmersive()
    const w = windows.get(id)
    if (!w) {
      setActiveWindow(id)
      return
    }
    const wasClosed = !w.open
    w.open = true
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
    const next = pickNextInteractive(id)
    activeWindowId.value = next?.id ?? null
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
    if (!w) return
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
    Object.assign(w, patch)
  }

  function clear() {
    for (const id of introTimers.keys()) cancelIntro(id)
    windows.clear()
    activeWindowId.value = null
    nextZ = 10
    cascadeIndex = 0
  }

  return {
    windows,
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

export type WindowsStore = ReturnType<typeof useWindowsStore>
