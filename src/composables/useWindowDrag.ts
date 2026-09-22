import { onScopeDispose } from 'vue'
/**
 * Pointer drag helper for window title bars.
 * Calls `onDelta(dx, dy)` on each move, `onEnd()` when released.
 */
export function useWindowDrag(onDelta: (dx: number, dy: number) => void, onEnd?: () => void) {
  let cleanup: (() => void) | undefined
  onScopeDispose(() => cleanup?.())
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, .window-frame__resize-handle')) return

    cleanup?.()
    const el = e.currentTarget as HTMLElement
    let lastX = e.clientX
    let lastY = e.clientY
    el.setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return
      const dx = ev.clientX - lastX
      const dy = ev.clientY - lastY
      lastX = ev.clientX
      lastY = ev.clientY
      if (dx || dy) onDelta(dx, dy)
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return
      if (el.hasPointerCapture(ev.pointerId)) el.releasePointerCapture(ev.pointerId)
      cleanup?.()
    }

    cleanup = () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('lostpointercapture', onUp)
      cleanup = undefined
      onEnd?.()
    }
    el.addEventListener('lostpointercapture', onUp)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  return { onPointerDown }
}
