# Phase 3: reusable workspaces

## Two hosts, one ownership boundary

`WindowHost` remains the floating-window API introduced in phase 1. `WorkspaceHost`
is the tabbed/docked workspace API. It uses a framework-independent `Workspace`
from `@nabla/desktop/core`; it does not wrap or synchronize a second Pinia window
store. Choose one owner for each view. Do not mount the same renderer through both
hosts. Existing WindowHost applications do not change behavior automatically.

Desktop owns view placement and chrome. Applications own document data, scene
state, render loops, close confirmation and persistence destinations. A floating
workspace group is an internal panel, **not** another browser window.

## Minimal integration

```ts
import { createWorkspace } from '@nabla/desktop/core'
const workspace = createWorkspace()
const unregister = workspace.register({
  id: 'world', title: 'World',
  dirty: () => documentState.dirty,
  beforeClose: () => confirmClose(), // boolean or Promise<boolean>
})
workspace.open('world')
```

```vue
<WorkspaceHost :workspace="workspace" v-slot="{ panel, visible, active }">
  <ExternalContent
    v-if="panel.id === 'world'"
    :mount="mountWorld"
    :visible="visible"
    :active="active"
  />
  <DocumentEditor v-else :document-id="panel.id" />
</WorkspaceHost>
```

Give the host a definite width/height and import the public stylesheet. Keep the
workspace and content factory references stable. All tabs in an opened group mount
once, including initially inactive tabs. Closed/inactive panels are retained and
hidden. Docking, floating and layout restoration keep keyed content under the same
DOM parent: they do not remount it. `unregister()` and host unmount dispose content.
Applications needing disposable documents should unregister after an accepted close.

`visible` means the selected tab of a placed group. Floating panels can cover other
visible content without pausing it. `active` identifies the focused panel; feed both
to native renderers. If the entire host is hidden by its parent, combine visibility
with your application's own host visibility. Exactly one application-owned simulation
can serve the retained world view. A world-only layout can be restored without
restarting it; this does not itself request browser fullscreen.

## Core API

| Method | Behavior |
| --- | --- |
| `register(definition)` | Unique stable ID, label and optional dirty/close getters; returns idempotent unregister. |
| `definitions()` | Registered view definitions, not persisted in snapshots. |
| `open(id)` | Adds a hidden view to the first group and activates it. Unknown IDs return false. |
| `activate(id)` | Selects the tab; floating groups move to the front. |
| `close(id)` | Async guard-aware close; concurrent requests for that ID are ignored. Returns acceptance. |
| `dock(id, groupId, position?, index?)` | Moves into a group or splits its edge. Center/index also reorders tabs. |
| `float(id, rect?)` | Moves one view to an internal floating group. |
| `moveFloating(groupId, rect)` | Changes floating bounds in CSS pixels. |
| `resizeSplit(id, ratio)` | Clamps finite ratios to 0.1–0.9. |
| `snapshot()` / `restore(value)` | Isolated JSON layout copy / transactional validated replacement. |
| `save(storage)` / `load(storage, migrate?)` | Explicit async persistence with an injected adapter. |
| `subscribe(fn)` / `notify()` | Change notification with unsubscribe; notify after external dirty/title changes. |

Dock positions are `center`, `left`, `right`, `top`, `bottom`. A split axis of
`horizontal` lays children left/right; `vertical` lays them top/bottom. Edge docking
into a floating group is rejected; center docking adds a tab to it. Empty groups
are removed and single-child splits collapse. Closing the final tab leaves an empty
workspace; reopen via application commands. Closing does not unregister the view.

Guard rejection leaves layout intact. Exceptions propagate from the core and emit
`error` from WorkspaceHost. Restoring layout while confirmation is pending invalidates
that pending approval. Layout restoration is not a document-close operation and does
not run guards: hidden content and application data remain retained. The application
should separately guard destructive document replacement.

## Versioned persistence

```ts
const storage = {
  load: () => JSON.parse(localStorage.getItem('my.workspace') ?? 'null'),
  save: snapshot => localStorage.setItem('my.workspace', JSON.stringify(snapshot)),
}
await workspace.save(storage)
await workspace.load(storage) // handle errors and retain the current layout
```

The version-1 schema contains `root` (tabs/splits or null), `floating` (ordered tab
groups and rectangles) and `active` (panel ID or null). Tab groups contain stable
IDs, ordered panel IDs and an active tab. Splits contain stable IDs, axis, ratio and
two children. Snapshots never contain component instances, callbacks or documents.

Register known views before restoring. Validation removes unknown and duplicate
panel references, chooses a valid active tab and collapses empty nodes. Invalid
schemas, duplicate node IDs, non-finite geometry, excessive depth/size and unsupported
versions reject the whole restore without changing the current layout. Version 1 is
the first format; there is no built-in older format to migrate. Supply an explicit
`load(storage, migrate)` callback for application/legacy formats; its output still
passes validation. Storage/network/quota errors propagate to the caller.

`measureWorkspace` derives actual rectangles from host dimensions. Split minima
are best-effort (140 px per immediate child); floating panels have 160×100 resize
minima. The host size wins when smaller. Floating saved bounds remain unchanged,
while visible bounds are clamped so controls remain reachable. No browser storage
is touched by the library automatically. The demo saves only on request, separately
from document state. Restoring persisted layout after a reload does not restore text.

## Keyboard, pointer and modal behavior

- Tabs: Left/Right, Home/End activate; Alt+Left/Right reorder; Delete requests close.
- Drag a tab to another tab for reorder/grouping, or to an edge drop target to split.
- Use the group selector to move tabs without dragging; split and float/dock buttons
  are keyboard accessible. Floating Move/Resize controls accept arrow keys (10 px,
  Shift+arrow 40 px) as well as pointer dragging.
- Separators use arrow keys and Home/End, expose orientation/current value and support
  pointer capture. Pointer cancellation and unmount clean up gestures.
- All user-facing workspace labels can be supplied through `labels`, including the
  dirty indicator. Titles and application document text remain consumer-owned.
- Docking has no motion animation; legacy windows retain reduced-motion support.

`DesktopDialog` uses the browser's modal `<dialog>` top layer, native focus containment
and inert background. Props: `open`, `title`, optional `closeLabel` and command `registry`.
It emits `update:open`, `interaction-start`, `interaction-end`; it suspends registry
shortcuts and restores prior focus. This modal blocks its entire browser document,
not just one embedded workspace. Keep one active application-owned dialog at a time;
nested modal ownership is not provided. Wire interaction events to Studio's gameplay
input gate and release pointer lock, just as with menus. A DOM dialog cannot stop an
unrelated global game listener. The demo uses it for asynchronous document-close guards.

## Shared controls and theme

The first prioritized reusable controls are `DesktopButton` (normal/primary/toggle,
standard disabled/form attributes), `SettingsGroup` (native collapsible details),
`StatusBar` (polite status region), `DesktopDialog`, and workspace tabs/separators.
Existing phase-2 menus/toolbars remain shared. Controls inherit `--nd-*` tokens;
`--nd-control-padding` adds button density control. Native form inputs remain native
application content for now. A generic tree, notifications, tooltip service and
comprehensive field library are not included in this phase; they need concrete
consumer requirements rather than copying Agency-specific widgets.

## Examples, validation and migration

The interactive lab's **Probar paneles y pestañas** view demonstrates a native canvas,
Vue document, properties, live inputs, guarded close, world-only mode, floating tools,
keyboard docking, saved layout and compact-host recovery. The packed consumer fixture
also mounts both Vue content and an external native canvas using only public exports,
under the minimal Vue/Pinia and Agency/Vuetify dependency profiles.

To migrate, register stable view IDs, move document state out of window positions,
render views through WorkspaceHost slots, pass lifecycle flags, connect commands to
workspace actions, and inject storage last. Keep existing WindowHost tools separate
until deliberately migrated. Actual Agency/Studio production migration is not part
of this library change. No automatic WindowState-to-layout converter is provided.

Unit tests cover layout invariants, malformed snapshots, isolation, persistence and
async guards. Chromium browser tests cover real drag/drop, keyboard operations,
modal dismissal, canvas identity, retained documents and small bounds. Native browser
accessibility semantics are used, but screen-reader/Firefox/Safari combinations are
not certified. HTML drag/drop is desktop-oriented; touch users can use explicit
controls instead. The optional detached browser-view adapter is documented in [phase 4](phase-four.md).
