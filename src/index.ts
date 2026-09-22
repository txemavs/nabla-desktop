export const VERSION = '0.1.0'

// Types
export type {
  WindowState,
  WindowOptions,
  DesktopInsets,
  DesktopBounds,
  MaximizePolicy,
} from './types'

// Store
export { useWindowsStore, defineWindowsStore, WINDOW_INTRO_MS } from './stores/windows'
export type { WindowsStore } from './stores/windows'

// Composables
export { useWindowDrag } from './composables/useWindowDrag'

// Components
export { default as WindowFrame } from './components/WindowFrame.vue'
export { default as WindowHost } from './components/WindowHost.vue'
