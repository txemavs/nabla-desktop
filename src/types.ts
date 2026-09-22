/**
 * Represents the runtime state of a window in the desktop shell.
 *
 * Lifecycle (persistent windows):
 * - closed:    `open=false` — not shown, not listed in any window list
 * - open:      `open=true`, `minimized=false` — visible (floating or maximized)
 * - minimized: `open=true`, `minimized=true` — hidden but still "open" (e.g. in a dock/shelf)
 *
 * Maximized windows fill the viewport. Only one window can be maximized at a time.
 * Restoring / minimizing returns to the saved floating geometry.
 *
 * Ephemeral windows are removed from the store on close; persistent windows
 * remain with `open=false` so they can be reopened later.
 */
export interface WindowState {
  id: string
  title: string
  icon?: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  /** Whether the window is open (visible or minimized). Closed = hidden. */
  open: boolean
  zIndex: number
  /** Skip CSS motion during the first paint (used for intro animation). */
  introducing?: boolean
}

/**
 * Options for creating or registering a new window.
 */
export interface WindowOptions {
  title?: string
  icon?: string
  x?: number
  y?: number
  width?: number
  height?: number
  open?: boolean
  minimized?: boolean
  maximized?: boolean
}
