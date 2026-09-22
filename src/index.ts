import './theme.css'
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

export * from './core'
export { default as ExternalContent } from './components/ExternalContent.vue'
export { default as MenuBar } from './components/MenuBar.vue'
export { default as CommandToolbar } from './components/CommandToolbar.vue'
export { default as CommandMenu } from './components/CommandMenu.vue'

export { default as ContextMenu } from './components/ContextMenu.vue'
export { default as WorkspaceHost } from './components/WorkspaceHost.vue'
export { default as DesktopDialog } from './components/DesktopDialog.vue'
export { default as DesktopButton } from './components/DesktopButton.vue'
export { default as SettingsGroup } from './components/SettingsGroup.vue'
export { default as StatusBar } from './components/StatusBar.vue'
