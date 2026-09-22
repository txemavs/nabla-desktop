# @nabla/desktop

A reusable Vue 3 + Pinia library for building OS-like floating window systems. Provides a complete MDI (Multiple Document Interface) window manager with open/close/minimize/maximize/restore/focus/z-order/geometry/cascade operations.

Use this library to add desktop-style windows to any website or web app — no specific UI framework required beyond Vue 3.

## Features

- **Window lifecycle**: open, close, minimize, maximize, restore
- **Z-order management**: automatic stacking, bring-to-front on focus
- **Cascade placement**: new windows offset like classic desktop OS
- **Drag & resize**: title bar drag, 8-way edge/corner resize handles
- **Single-maximized rule**: only one window can be maximized at a time
- **Ephemeral vs persistent**: close can remove or just hide windows
- **Intro animation**: optional shelf-to-float entrance effect
- **Accessible**: keyboard support, reduced-motion support
- **Neutral styling**: dark theme by default, easy to customize with CSS

## Installation

```bash
npm install @nabla/desktop
# or
pnpm add @nabla/desktop
# or
yarn add @nabla/desktop
```

## Peer Dependencies

- `vue` ^3.3.0
- `pinia` ^2.1.0

## Quick Start

### 1. Set up Pinia (if not already done)

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

### 2. Register and render windows

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useWindowsStore, WindowHost } from '@nabla/desktop'

const windowsStore = useWindowsStore()

onMounted(() => {
  windowsStore.register('editor', {
    title: 'Code Editor',
    icon: '📝',
    width: 800,
    height: 600,
  })

  windowsStore.register('terminal', {
    title: 'Terminal',
    icon: '⌨️',
    width: 600,
    height: 400,
  })
})

function openNewWindow() {
  const id = `window-${Date.now()}`
  windowsStore.register(id, {
    title: 'New Window',
    width: 400,
    height: 300,
  })
}
</script>

<template>
  <div class="desktop">
    <button @click="openNewWindow">New Window</button>

    <WindowHost v-slot="{ window }">
      <div class="window-content">
        <p>Content for: {{ window.title }}</p>
      </div>
    </WindowHost>
  </div>
</template>

<style>
.desktop {
  width: 100vw;
  height: 100vh;
  background: #121212;
}

.window-content {
  padding: 16px;
  color: #fff;
}
</style>
```

### 3. Or use WindowFrame directly for more control

```vue
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWindowsStore, WindowFrame } from '@nabla/desktop'

const windowsStore = useWindowsStore()

onMounted(() => {
  windowsStore.register('my-window', {
    title: 'My App',
    width: 600,
    height: 400,
  })
})

function handleClose() {
  windowsStore.closeWindow('my-window')
}
</script>

<template>
  <WindowFrame
    window-id="my-window"
    title="My App"
    icon="🚀"
    @close="handleClose"
  >
    <div class="app-content">
      <h1>Hello from the window!</h1>
    </div>
  </WindowFrame>
</template>
```

## API Reference

### Types

```ts
interface WindowState {
  id: string
  title: string
  icon?: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  open: boolean
  zIndex: number
  introducing?: boolean
}

interface WindowOptions {
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
```

### Store: `useWindowsStore()`

```ts
const store = useWindowsStore()

// State
store.windows          // Map<string, WindowState>
store.activeWindowId   // string | null
store.dockBottom       // number (viewport offset for maximized windows)

// Actions
store.register(id, options?)      // Register a new window
store.unregister(id)              // Remove window from store
store.openWindow(id)              // Open a closed window
store.closeWindow(id)             // Close an open window
store.minimizeWindow(id)          // Minimize to dock/shelf
store.maximizeWindow(id)          // Fill viewport
store.restoreWindow(id)           // Return to floating geometry
store.toggleMaximize(id)          // Toggle maximize/restore
store.focusWindow(id)             // Bring to front, activate
store.updateGeometry(id, patch)   // Update x/y/width/height
store.setDockBottom(y)            // Set top offset for maximized windows
store.clear()                     // Remove all windows
```

### Components

#### `<WindowFrame>`

The window chrome component with title bar and resize handles.

**Props:**
- `windowId: string` — Required. ID of the window in the store.
- `title?: string` — Window title (default: "Window")
- `icon?: string` — Icon character or emoji
- `noResize?: boolean` — Disable resize handles
- `noMove?: boolean` — Disable title bar drag
- `noMax?: boolean` — Hide maximize button
- `noMin?: boolean` — Hide minimize button
- `noClose?: boolean` — Hide close button

**Events:**
- `close` — Emitted when close button clicked (handle removal yourself)

**Slots:**
- `default` — Window body content

#### `<WindowHost>`

Convenience component that renders all open windows.

**Props:**
- `filter?: (w: WindowState) => boolean` — Filter which windows to render
- `sort?: (a: WindowState, b: WindowState) => number` — Sort order

**Slots:**
- `default` — Scoped slot receiving `{ window, windowId }`

### Composables

#### `useWindowDrag(onDelta, onEnd?)`

Low-level drag helper for custom drag implementations.

```ts
const { onPointerDown } = useWindowDrag(
  (dx, dy) => console.log('moved', dx, dy),
  () => console.log('drag ended')
)
```

## Customizing Styles

The WindowFrame uses CSS custom properties and scoped styles. Override with higher specificity:

```css
/* Make windows light-themed */
.window-frame {
  background: #f5f5f5 !important;
  color: #333 !important;
}

.window-frame__header {
  background: #e0e0e0 !important;
}

.window-frame__body {
  background: #fff !important;
}

/* Customize active border color */
.window-frame--active {
  border-color: #007bff !important;
}
```

Or create your own WindowFrame component using the store and `useWindowDrag` composable.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
