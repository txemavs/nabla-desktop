# Phase 2: shared commands and application shell

## Public entry points and ownership

`@nabla/desktop` exports the Vue shell, Pinia window stores, UI components and core
APIs. `@nabla/desktop/core` exports commands and external DOM content lifecycle
without importing Vue or Pinia. Import `@nabla/desktop/style.css` explicitly for UI.
The window manager itself still requires Vue/Pinia. This is **not** a second,
framework-independent desktop renderer, nor a completed Agency/Studio migration.

Agency can render Vue content directly. Studio can use a small Vue shell while
retaining its own DOM, WebGL renderer, simulation and scene state. The lab contains
both a Vue notes view and a native canvas factory (`demo/canvas-content.ts`).
Neither production app has been converted by this change.

## Commands

```ts
import { createCommandRegistry } from '@nabla/desktop/core'
const commands = createCommandRegistry()
const unregister = commands.register({
  id: 'document.save', label: 'Save', shortcut: 'Mod+s', scope: 'editor',
  enabled: () => documentState.dirty,
  execute: async () => { await saveDocument() },
})
const unbind = commands.attachShortcuts(shellElement, () => ({ scope: activeViewId }))
// After external state changes, refresh presentations:
commands.notify()
// When the application shell is disposed:
unbind()
unregister()
```

An application owns a registry and command callbacks. IDs are unique; duplicate
registration throws. `enabled`, `visible` and `checked` are getters evaluated when
needed; call `notify()` after external changes. `subscribe()` returns an unsubscribe
function. Labels and menus are supplied by the consumer and can be translated.
`execute(id, context)` returns a promise of whether the command executed. It respects
scope/visibility/availability, blocks concurrent execution of the same ID, restores
availability after failure and propagates errors. UI components emit `error`.

`attachShortcuts(element, context, onError)` binds only to that element's bubbling
keydown events and returns cleanup. `Mod` accepts Ctrl or Meta; modifiers must
otherwise match. Repeats, IME composition, already-handled events and editable
fields are ignored (unless `allowInInput` is explicitly true). A scoped command
wins over an application command; same-scope collisions use registration order.
Reserve distinct shortcuts within a scope. Consumed events stop propagation so a
parent desktop will not execute the same shortcut. Do not bind the same registry
more than once to the same root. Browser-reserved shortcuts may remain unavailable.

## Presentations and input ownership

- `MenuBar`: `registry`, `menus: DesktopMenu[]`, optional `context`.
- `ContextMenu`: the same registry/context, `items: MenuItem[]`; wraps the region
  where right-click opens it.
- `CommandToolbar`: registry/context, command ID array `commands`, accessible `label`.

Menu items are `{command: id}`, `{separator: true}` or `{label, children}`. The
same registry drives visibility, disabled/checked state and execution everywhere.
Nested menus expand inline. Arrow keys, Home/End, Enter and Escape navigate them;
outside pointer interaction dismisses them. MenuBar and ContextMenu emit
`interaction-start` and `interaction-end`, and suspend their registry's shortcuts
while open. Popovers use the browser top layer to stay above maximized windows.

**Studio owns gameplay input.** On interaction-start release pointer lock and
suspend gameplay listeners; resume only when the world is active and no other
interaction owns input. A command registry cannot stop unrelated global capture
listeners. Ignore editable fields in game input handlers as well. Never reacquire
pointer lock without a user gesture. For application dialogs, use the reference-
counted `suspendShortcuts()` release function and your own gameplay input gate.
Modal dialogs and close guards are not provided in this phase.

## External content contract

A stable `ContentFactory(element)` mounts native content synchronously and returns:

```ts
{
  resize(width, height) { /* CSS pixels: renderer chooses device pixel ratio */ },
  setVisible(visible) { /* pause/resume rendering and expensive observers */ },
  setActive(active) { /* enable/disable application input */ },
  dispose() { /* release DOM, GPU resources, listeners and animation frames */ },
}
```

Only `dispose` is required. Use `ExternalContent` with `mount`, `visible` and
`active` props. Within WindowHost, visibility is `window.open && !window.minimized`;
activity is `desktop.activeWindowId === window.id`. Keep the factory reference
stable: replacing it disposes and remounts content. Application state remains
outside the adapter, including across remounts.

Native hosts can call `mountExternalContent(element, factory, initialState)` and
then `update(state)` and `dispose()` themselves. The adapter sends initial state,
observes dimensions and resizes on becoming visible. Hidden resize work is skipped.
Dispose disconnects observation and invokes content cleanup once. The factory must
clean up partial resources if it throws before returning. Hook failures are
application errors; don't throw from visibility or disposal callbacks.
Visibility means explicitly hidden/minimized/closed, not pixel occlusion by
another window. Applications decide whether a covered view should keep rendering.

## Theme contract

Set CSS custom properties on the desktop root; components inherit them without a
global reset. Tokens: `--nd-surface`, `--nd-header`, `--nd-text`, `--nd-muted`,
`--nd-border`, `--nd-hover`, `--nd-accent`, `--nd-font`, `--nd-font-size`, `--nd-radius`.
Window chrome and command UI consume these; application content is styled by its
owner. The demo includes dark gray and light presets. Themes must preserve focus
contrast and readable disabled/text colors.

## Migration and limits

1. Use a distinct desktop store and command registry per workspace.
2. Move action callbacks into command registrations; replace duplicated UI handlers.
3. Bind shortcuts to the owning shell and wire menu interaction events to input gates.
4. Wrap native content with a stable factory and explicit visibility/activity props.
5. Import CSS, set tokens and test with real content before replacing production UI.

Maximization now defaults to `exclusive`, bringing the selected window forward.
Set `background` explicitly to retain phase 1's world-behind-tools arrangement.

Browser requirements include ResizeObserver and the HTML Popover API. Chromium is
exercised automatically; Firefox/Safari and assistive technology combinations are
not certified by this test suite. No legacy popover polyfill is bundled. Tabs,
splits/docking, layout persistence, modal ownership and browser-window transfer
remain later roadmap work. API is pre-1.0; document migrations with changes rather
than promising frozen contracts before both production consumers adopt them.
