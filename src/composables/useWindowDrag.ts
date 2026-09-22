/**
 * Pointer drag helper for window title bars.
 * Calls `onDelta(dx, dy)` on each move, `onEnd()` when released.
 */
export function useWindowDrag(
  onDelta: (dx: number, dy: number) => void,
  onEnd?: () => void,
) {
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, .window-frame__resize-handle')) return

    const el = e.currentTarget as HTMLElement
    let lastX = e.clientX
    let lastY = e.clientY
    el.setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - lastX
      const dy = ev.clientY - lastY
      lastX = ev.clientX
      lastY = ev.clientY
      if (dx || dy) onDelta(dx, dy)
    }

    function onUp(ev: PointerEvent) {
      el.releasePointerCapture(ev.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      onEnd?.()
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  return { onPointerDown }
}
