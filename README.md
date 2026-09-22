# @nabla/desktop

A Vue 3 window shell for Agency, Nabla Studio and other applications. The package
provides floating windows, container-relative layout, focus and stacking,
maximization policies, drag/resize and explicit content lifetime options.

This includes **phases 1–4** of [the shared desktop roadmap](https://github.com/txemavs/nabla-desktop/issues/3).
Shared commands, menus, context menus, toolbars, scoped shortcuts, theme tokens and
external DOM/canvas content adapters are available. WorkspaceHost adds tabs, split
panes, docking, internal floating panels, guarded close and versioned layout storage.
An optional same-origin detached-view adapter synchronizes child inspectors with a
single application owner. Production Agency/Studio integration remains separate. Application state, rendering
and business logic remain outside Desktop.

## Installation

Install the package and its Vue/Pinia peers using your package manager. When using
a development build, install the `.tgz` produced by `npm pack`; the examples below
refer to the package name, not repository source paths.

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@nabla/desktop/style.css' // required, explicit public stylesheet export

createApp(App).use(createPinia()).mount('#app')
```

The peer range supports Vue `^3.3.0` and Pinia `^2.1.0 || ^4.0.3`. Automated packed
consumer tests verify these exact combinations:

| Profile | Vue    | Pinia | Host UI framework |
| ------- | ------ | ----- | ----------------- |
| Minimal | 3.4.21 | 2.1.7 | None              |
| Agency  | 3.5.41 | 4.0.3 | Vuetify 4.1.10    |

Vuetify is not a Desktop dependency. Pinia 3 is not declared supported; other
versions within the peer ranges are not individually certified by this matrix.

## Quick start

```vue
<script setup lang="ts">
import { WindowHost, useWindowsStore } from '@nabla/desktop'

const desktop = useWindowsStore()
desktop.register('world', {
  title: 'World',
  maximized: true,
  keepAlive: true,
})
desktop.register('properties', {
  title: 'Properties',
  x: 40,
  y: 60,
  width: 300,
  height: 400,
})
</script>

<template>
  <div class="workspace">
    <WindowHost :store="desktop" :insets="{ top: 0 }" v-slot="{ window }">
      <div v-if="window.id === 'world'">Your world component</div>
      <div v-else>Your tools component</div>
    </WindowHost>
  </div>
</template>

<style>
.workspace {
  width: 100%;
  height: 600px;
  min-height: 0;
}
</style>
```

The parent must have a definite height. The default host occupies its **container**,
not the browser viewport. A `ResizeObserver` updates bounds when the container
changes size. Use `mode="viewport"` for the old full-browser placement and pass
`insets` to reserve space for the host application's menus or dock.

The default `exclusive` policy brings a maximized window to the front. Focusing
a floating window restores the maximized one. Choose
`desktop.setMaximizePolicy('background')` explicitly for a world view that stays
behind floating tools.

## Independent desktops

Define one store factory per workspace identity, outside component setup:

```ts
import { defineWindowsStore } from '@nabla/desktop'
export const useStudioDesktop = defineWindowsStore('studio-desktop')
export const useAgencyDesktop = defineWindowsStore('agency-desktop')
```

Each factory follows Pinia's identity rules. Different IDs give isolated desktops
within the same Pinia. The same factory in different Pinia instances is also
isolated. Use the same ID only when you deliberately want the same desktop.
Pass the store to `WindowHost`; it forwards the same instance to every frame.
Do not mount multiple hosts with different bounds for the same store.

## Content lifetime

| Action/option                          | Registration | Mounted content in WindowHost     |
| -------------------------------------- | ------------ | --------------------------------- |
| Minimize                               | Retained     | Retained, hidden                  |
| Close, default `closeBehavior: 'hide'` | Retained     | Unmounted by default              |
| Close with `keepAlive: true`           | Retained     | Retained, hidden after first open |
| Close with `closeBehavior: 'dispose'`  | Removed      | Unmounted, even with keepAlive    |
| `unregister(id)`                       | Removed      | Unmounted                         |
| `clear()`                              | All removed  | All unmounted                     |

Initially closed windows mount lazily when first opened. Reopening an unmounted
window creates fresh component state. A retained hidden canvas does **not** stop
its own render loop automatically: the application should observe `open` and
`minimized` and pause work appropriately. Geometry and registration are in-memory;
“retained” does not mean persisted to disk.

`WindowHost` retains its immediate-close behavior. For an application-owned confirmation,
use `WindowFrame` directly, handle its `close` event and invoke `closeWindow` only
when approved. `WindowHost` closes immediately. See the lifecycle guide before
embedding a live renderer. `WorkspaceHost` provides async close guards; see the
[workspace guide](docs/phase-three.md).

## Documentation

- [Detached browser views and synchronization](docs/phase-four.md)
- [Workspaces, docking, dialogs and persistence](docs/phase-three.md)
- [Commands, themes and external content](docs/phase-two.md)
- [Public API and migration guide](docs/phase-one.md)
- [Packaged consumers and interaction testing](docs/testing.md)
- [Roadmap and ownership boundaries](https://github.com/txemavs/nabla-desktop/issues/3)

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:package
```

MIT licensed. No Agency schemas, authentication, routing or engine dependencies.

## Interactive lab

Run `npm run dev:demo` to try connected window controls, a properties-driven canvas,
retained notes and disposable windows. `npm run build:demo` produces `demo-dist/`
for static hosting. See [the demo guide](docs/demo.md) for interactions and scope.
