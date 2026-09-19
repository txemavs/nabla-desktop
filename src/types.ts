/**
 * Represents the state of a window in the desktop shell.
 */
export interface WindowState {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  focused: boolean
  zIndex: number
}

/**
 * Options for creating a new window.
 */
export interface WindowOptions {
  title?: string
  x?: number
  y?: number
  width?: number
  height?: number
}
