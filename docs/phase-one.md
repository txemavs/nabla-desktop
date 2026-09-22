# Phase 1: reliable window shell

## Ownership and scope

Desktop owns registration, in-memory layout, focus and visual window chrome. The
consumer owns documents, routing, render loops and application resources. Vue and
Pinia remain required for this phase. Studio can use a small Vue shell
around externally owned content, but an external-content mounting adapter is a
phase-2 deliverable, now documented in [the integration guide](phase-two.md).

## Public exports

- `WindowHost`, `WindowFrame`, `useWindowDrag`.
- `useWindowsStore`: default shared store (`windows`).
- `defineWindowsStore(id)`: creates a Pinia store definition for an explicit desktop.
- Types: `WindowState`, `WindowOptions`, `WindowsStore`, `DesktopBounds`,
  `DesktopInsets`, `MaximizePolicy`.
- `VERSION`, `WINDOW_INTRO_MS`.
- `@nabla/desktop/style.css`: public stylesheet subpath, imported explicitly once.

ES modules, CommonJS and declaration entry points are exported. CSS is marked as
side-effectful so bundlers do not remove an explicit import.

## Store operations

| Operation                           | Contract                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `register(id, options?)`            | Idempotent; existing registration is returned unchanged                        |
| `openWindow(id)`                    | Opens a known registration; unknown IDs are ignored                            |
| `focusWindow(id)`                   | Activates an open window and restores it from minimized state                  |
| `setActiveWindow(id \| null)`       | Selects only an open, non-minimized registration, otherwise null               |
| `minimizeWindow(id)`                | Hides content without unmounting; inactive windows do not steal focus          |
| `maximizeWindow(id)`                | Maximizes this open window and restores any other maximized window             |
| `restoreWindow(id)`                 | Restores an open window; closed and missing windows are ignored                |
| `toggleMaximize(id)`                | Switches between maximized and floating geometry                               |
| `closeWindow(id)`                   | Hides or unregisters according to `closeBehavior`                              |
| `unregister(id)`                    | Removes registration and cancels its pending introduction                      |
| `updateGeometry(id, patch)`         | Ignores non-finite values and constrains geometry to the current bounds        |
| `setBounds(width, height, insets?)` | Updates host bounds and recovers out-of-bounds floating windows                |
| `fitGeometry(rect)`                 | Returns constrained geometry without applying it                               |
| `setMaximizePolicy(policy)`         | Chooses `exclusive` (default) or `background`                                  |
| `setDockBottom(y)`                  | Legacy top-inset setter; prefer host `insets`                                  |
| `clear()`                           | Removes all registrations and cancels introductions, within this instance only |

Treat the exposed window state as observable data and use these actions for
transitions; direct mutation can bypass invariants. Pinia `$dispose()` cancels
pending introductions, but does not unmount an application or erase Pinia's saved
state by itself. Unmount the host and call `clear()` before disposing a desktop
that will not be reused. The consumer owns its Pinia and its lifecycle.

A close/removal chooses the highest visually stacked eligible remaining window. There is
at most one maximized window. Closed or explicitly minimized registrations are
not maximized. Intro timers never activate removed windows.

## Layering and focus

`background` keeps a maximized view below floating tools, even when the world is
active. Tools can receive focus without changing the world's layout. Keyboard
focus inside a frame also activates that window. Desktop does not implement
application shortcuts, modal focus trapping or gameplay input arbitration yet.

`exclusive` retains the old focus policy: focusing a floating window restores the
other maximized window; opening another view while immersive maximizes it. It is
an explicit compatibility policy, not the default for Studio.

## Geometry and host placement

`WindowHost` props:

- `store?: WindowsStore`: defaults to `useWindowsStore()`.
- `mode?: 'container' | 'viewport'`: default `container`.
- `insets?: Partial<DesktopInsets>`: nonnegative top/right/bottom/left reservations.
- `filter?: (window) => boolean`: includes all eligible windows by default.
- `sort?: (a, b) => number`: z-order ascending by default.

The slot receives `{ window, windowId }`. Its content is consumer-owned. A filter
exclusion unmounts the frame even if `keepAlive` is true; use `minimizeWindow` to
hide content while retaining it. Removing the host also unmounts all its content.

Each host establishes its own stacking context. Bounds use its client dimensions,
not viewport dimensions. Zero-sized temporarily hidden hosts do not overwrite
valid geometry. Insets are clamped to leave usable space. Floating dimensions
normally have 200×120 minimums; a smaller host takes precedence, preventing an
unreachable window. A smaller host can shrink saved floating geometry; later
expansion does not reconstruct the previous size automatically.

`WindowFrame` can be used directly with `store`, `windowId`, `title`, `icon` and
`noMove`, `noResize`, `noMax`, `noMin`, `noClose`. It emits `close` without closing
itself. A direct frame requires a positioned containing element and consumer
calls to `store.setBounds(...)`; unlike WindowHost, it does not measure the host.

Drag/resize do not animate behind the pointer. Pointer cancellation and lost
capture terminate the gesture; component disposal removes listeners. Reduced
motion also disables transition animations and introduction delays. Controls
have accessible names, but full keyboard move/resize and modal accessibility are
not claimed in phase 1.

## Migration from the first extraction

1. Import `@nabla/desktop/style.css` explicitly.
2. Give the host container a definite size; use `mode="viewport"` if the old
   full-browser placement is required. Reserve chrome with `insets`, for example
   `{ top: 48 }`; WindowHost no longer implicitly assumes a 48px header.
3. Choose `background` or set `exclusive` deliberately.
4. Set `keepAlive: true` for a renderer that must survive closing. Merely minimizing
   already retains content. Use `closeBehavior: 'dispose'` for disposable instances.
5. Create distinct store factories for distinct workspaces. Do not create a new
   factory with a random ID on every render.
6. Test Agency against the declared Pinia range. No Vuetify dependency is added to
   the library and no Studio engine dependency is introduced.

## Contract evolution

The package remains pre-1.0. Behavioral changes must be recorded in the changelog
and migration guide and exercised against the packed consumers. Phases 2–4 may
extend commands, panels and persistence; do not rely on private DOM structure,
internal timer state or Pinia implementation details as integration contracts.
No npm publication or migration of the production Agency/Studio apps is implied
by the phase-1 implementation.
