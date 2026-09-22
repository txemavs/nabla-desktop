# Phase 4: optional detached browser views

## Supported architecture

`createDetachedHost<State, Action>` is an optional browser adapter exported by both
`@nabla/desktop/core` and the main entry. It has no Vue or Pinia imports. The original
application remains the only owner of documents, world state and simulation. Each
child is a trusted, same-origin `about:blank` browser window containing an explicitly
mounted view. A view receives cloned snapshots and sends typed actions back to the
owner. Opening an inspector does not instantiate a second engine.

This is not automatic DOM/WebGL context transfer, Vue app teleportation, independent
browser sessions, cross-origin messaging or a distributed simulation. Consumers
supply a native content factory (which may itself own a framework adapter). They
choose whether to keep or hide the corresponding local panel. The existing
WorkspaceHost is unchanged; floating panels remain internal to its browser window.

## Example

```ts
import { createDetachedHost } from '@nabla/desktop/core'
const detached = createDetachedHost<State, Action>({
  read: () => stateForInspector(),
  subscribe: changed => application.subscribe(changed), // returns unsubscribe
  dispatch: action => application.apply(action),       // owner validates actions
  onClose: (id, reason) => revealLocalPanel(id),
  onError: error => showApplicationError(error),
})

// Directly inside a click handler; do not await work before opening:
const result = detached.open('inspector', {
  title: 'Inspector', width: 540, height: 620,
  mount(element, bridge) {
    // Use element.ownerDocument to create the child DOM.
    const output = element.ownerDocument.createElement('output')
    element.append(output)
    return {
      update(snapshot) { output.textContent = snapshot.selectionName },
      resize(width, height) { /* CSS pixels; optional */ },
      setVisible(visible) { /* pause child rendering; optional */ },
      setActive(active) { /* child input ownership; optional */ },
      dispose() { output.remove() },
    }
  },
})
// Handle blocked/limit/error results while retaining local UI.
// On application teardown:
detached.dispose()
```

The factory's `bridge.dispatch(action)` returns a promise of success. It clones
input, invokes the owner's callback and refreshes snapshots after completion.
Disconnected views return false and cannot submit further actions. Callback failures
are reported through `onError` and return false. Already-started async application
actions are not canceled when a view closes; application cancellation is separate.
`bridge.returnToOwner()` closes that child and focuses the original window.

`read()` must return structured-cloneable view state, not functions, Vue proxies,
DOM nodes or simulation instances. Build small plain snapshots from application
state. Each child receives its own copy so modifying it cannot mutate owner state.
`update()` should only render; do not dispatch from it or create a feedback loop.
The application chooses change frequency and should throttle frame-rate telemetry.
No application state is broadcast to other tabs or external servers by this adapter.

## API and lifecycle

| API | Contract |
| --- | --- |
| `open(id, view)` | Synchronous user-gesture operation; stable ID, title, optional dimensions and factory. |
| Result `opened` / `focused` | New view mounted, or existing window focused without another mount. |
| Result `blocked` | Browser returned no window; local content is untouched. |
| Result `limit` | Configured session count reached (default 8, allowed 1–20). |
| Result `disposed` / `error` | Host ended, or opening/mounting failed. |
| `ids()` | IDs of current connected views; external browser close detection can take up to 500 ms. |
| `refresh()` | Explicitly send a fresh snapshot to every connected view. |
| `close(id)` | Return that view to its owner; content is disposed once. |
| `dispose()` | Unsubscribe, stop monitoring, close all children; idempotent and terminal. |

The adapter forwards focus/blur, document visibility and element resize changes.
It releases observers/listeners and calls content disposal once on close, navigation,
reload, renderer failure or owner teardown. Initial setup failure also releases
resources. A factory throwing before it returns must clean its own partial allocations.
Renderer update/lifecycle exceptions disconnect that view, keeping the owner usable.

Reopening the same ID after closure mounts a new view and immediately reads the
latest owner state. It does not restore stale child data. Reload/navigation ends the
child session; reopen from the owner's button. It is intentionally not an independent
URL you can bookmark. Closing/reloading/navigating the owner closes its children.
Owner `pagehide` disposes the host, including bfcache transitions; an application
restored from bfcache must create a new host on `pageshow` before opening views again.
There is no automatic process-crash recovery or cross-session reconnection.

`onClose(id, reason)` reports `returned`, `closed`, `navigated`, `owner-disposed` or
`error`. A pagehide/unload may be reported as `navigated` before browsers set their
`closed` flag, including user closure; treat both as disconnected. Applications must
not rely on unload handlers to save documents. Persist them through the owner.

## Browser, security and rendering boundaries

- Popups require a user gesture and can be blocked by user settings or embedding
  policy. The browser decides window versus tab and may ignore requested dimensions.
- This adapter intentionally maintains an opener relationship. Factories and child
  content must be trusted application code. Do not use it to host arbitrary URLs or
  untrusted HTML. Navigation disconnects the view; no general message listener is used.
- Optional `styles` is a list of explicit same-origin HTTP(S) stylesheet URLs. Global
  application styles are not copied automatically. Factories can style their own view;
  the host's CSP still applies. Put theme state in snapshots or supplied styles.
- The child DOM belongs to `element.ownerDocument`. For child animation frames use its
  `defaultView`, not an assumed global window. Dispose GPU resources and listeners in
  the factory's `dispose`. Rendering can be replicated, simulation ownership must not be.
- Native focus/visibility are forwarded, but headless/browser focus behavior differs.
  Background tabs may throttle timers and the owner's simulation. This is not a guarantee
  of real-time background execution. Mobile browsers and sandboxed embeds need host tests.
- TypeScript action types are not runtime authorization. The owner validates ranges,
  IDs and allowed actions, and decides how concurrent edits are resolved.

## Demo and validation

In the workspace lab choose **Abrir ventana independiente**. Change building height
or document text in either window; both views update. Open it again to focus the
existing child, return to the owner, then reopen to see the latest state. Closing
the inspector never deletes the original document or world.

`test:detached` runs Chromium workflows for two-way changes, duplicate focus, popup
blocking, return/reopen, child reload, owner reload, stale action rejection, cloned
snapshots, view-count limits and renderer failure. Both packed dependency profiles
also open a child inspector from the distributed core and synchronize it with the
workspace. `test:demo` includes this suite. The API is browser-only (SSR hosts must
create it after mounting); Firefox, Safari, mobile and assistive-technology combinations
are not certified. There is no new dependency on a desktop/native window runtime.

All four library roadmap phases now have implementations and documented boundaries.
Production Agency/Studio integration, broader accessibility/browser validation, and
additional consumer-driven controls remain adoption work, not implicitly completed
by this adapter.
