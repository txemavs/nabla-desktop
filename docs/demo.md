# Interactive Desktop lab

The `demo/` app consumes the library's **built public entry points** and exported
stylesheet. It uses the same WindowHost/store as consumers; it does not implement
another window manager. The demo has no backend, authentication or external assets.

```sh
npm ci
npm run dev:demo
# Or build a static deployment:
npm run build:demo
```

Serve `demo-dist/` from any static host. Relative asset URLs allow deployment in a
subdirectory. No production hostname or server credentials belong in the repo.

## Try it

1. Change height/color/grid in Properties: the canvas updates immediately.
2. Click the block to reopen its Properties panel.
3. Drag and resize a window, maximize the world: it covers other windows by default.
4. Open Notes, type text, minimize/close it and reopen from the taskbar: content is
   retained through WindowHost's keep-alive policy.
5. Create a temporary window and close it: its registration and taskbar entry go away.
6. Select a smaller container to exercise host bounds; switch maximize policies.
7. Reset the demo to recreate its initial state. Reloading also resets the session.

The canvas is an inexpensive **2D test view**, not Nabla Engine. Its render loop
pauses while hidden and survives keep-alive close/reopen. Form controls, taskbar
and launchers are demo-owned content. MenuBar, ContextMenu, CommandToolbar and
ExternalContent come from Desktop. The canvas factory imports only the pure core
types and uses native DOM/canvas APIs; the notes view is a Vue consumer.

Use Archivo/Ver, the toolbar or shortcuts to execute shared commands. Right-click
the workspace for its context menu. Menus support arrows, Enter and Escape.
Typing `g` in Notes does not toggle the grid; pressing it with workspace focus
does. Select the light theme to exercise inherited tokens. Tabs are still deferred.

`npm run test:demo` builds the app, checks its Vue/TypeScript code and runs Chromium
checks for linked controls, note retention, minimization, disposable windows,
container resizing and reset. It requires Playwright Chromium (`npx playwright
install chromium`). Set `DEMO_SCREENSHOT` to save an optional desktop screenshot.
