export interface ContentState {
  visible: boolean
  active: boolean
}
export interface MountedContent {
  resize?: (width: number, height: number) => void
  setVisible?: (visible: boolean) => void
  setActive?: (active: boolean) => void
  dispose: () => void
}
export type ContentFactory = (element: HTMLElement) => MountedContent
/** Owns observations, not application state. Factories are synchronous and own their resources. */
export function mountExternalContent(
  element: HTMLElement,
  factory: ContentFactory,
  initial: ContentState = { visible: true, active: true },
) {
  const content = factory(element)
  let disposed = false
  const state = { ...initial }
  const resize = () => {
    if (!disposed && state.visible) content.resize?.(element.clientWidth, element.clientHeight)
  }
  const observer = new ResizeObserver(resize)
  try {
    observer.observe(element)
    content.setVisible?.(state.visible)
    content.setActive?.(state.active)
    resize()
  } catch (error) {
    observer.disconnect()
    content.dispose()
    throw error
  }
  return {
    update(next: ContentState) {
      if (disposed) return
      const becameVisible = !state.visible && next.visible
      if (next.visible !== state.visible) content.setVisible?.(next.visible)
      if (next.active !== state.active) content.setActive?.(next.active)
      Object.assign(state, next)
      if (becameVisible) resize()
    },
    dispose() {
      if (disposed) return
      disposed = true
      observer.disconnect()
      content.dispose()
    },
  }
}
