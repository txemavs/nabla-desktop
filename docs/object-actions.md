# Shared object actions

Use one command registry for working toolbars, main menus, contextual actions and
shortcuts. Toolbars expose the commands needed for ordinary work directly.
Contextual menus expose the complete applicable set, including advanced actions.
A touch user should not have to open a contextual menu to complete ordinary work.

## Object identity and command state

`CommandContext` accepts `target: { type, id }` and an optional selection of the
same identity shape. Applications own the data and permissions. `enabled`,
`visible` and `checked` now receive that context; existing zero-argument callbacks
remain compatible. Use `registry.visible`, `available` and `checked` consistently.

```ts
registry.register({
  id: 'inspect',
  label: t('Inspect'),
  enabled: context => canInspect(context.target),
  execute: context => inspect(context.target),
})
```

Menus capture target/selection identities when opened. Retargeting the workspace
does not silently redirect an open menu. Predicates are evaluated again before
execution; the application must revalidate existence and permissions and notify
the registry when nonreactive state changes. Async backend writes must also enforce
permissions server-side. Do not pass mutable scene objects as identities.

## Mouse, keyboard and touch

`ContextMenu` retains its existing right-click behavior. `showTrigger` adds a
standard **All actions** button. `inline` opts out of the full-size region layout.
The focused region supports Shift+F10 and the context-menu key. The built-in button
supports native Enter/Space and touch activation.

```vue
<CommandToolbar :registry="registry" :context="context"
  :commands="['inspect', 'frame']" :label="t('Working actions')" />
<ContextMenu :registry="registry" :context="context" :items="allActions"
  show-trigger inline :labels="menuLabels.es">
  <ObjectSummary />
</ContextMenu>
```

For custom triggers, the `trigger` slot exposes `open(anchor)`, `close()` and
`expanded`. Supply a real button with `type="button"`, `aria-haspopup="menu"`
and `aria-expanded`. The component ref also exposes `openForAnchor(element)`,
`openAt(x, y, opener?)` and `close()`. These share positioning, focus restoration,
shortcut suspension and balanced interaction-start/end events.

```vue
<ContextMenu :registry="registry" :items="accountActions" inline>
  <template #trigger="{ open, expanded }">
    <button type="button" aria-haspopup="menu" :aria-expanded="expanded"
      @click="open($event.currentTarget)">{{ userName }}</button>
  </template>
</ContextMenu>
```

Account content is application-owned. This is the same component as any other
object action menu, not a separate account popup implementation.

## Exclusive choices and localization

Commands may declare `radioGroup` and `checked(context)` to render as
`menuitemradio` instead of a checkbox. Keep each group contiguous, separated from
other groups. The application's single selected value is the source of truth;
execute updates it. Desktop does not mutate domain state or automatically uncheck
other commands. Toolbars show the same value through `aria-pressed`.

Code, docs and default labels are English. `menuLabels.en` and `menuLabels.es`
provide the built-in application-menu and full-actions labels through `labels` on
MenuBar/ContextMenu. Translate application-owned command/submenu/toolbar labels
through the app's localization system. This change does not migrate unrelated UI.

Coarse-pointer controls use the inherited `--nd-touch-target` token (44px default).
Consumers should not add their own touch patches. Nonmodal inspectors and embedded
renderers continue to use DesktopDialog/ExternalContent and existing lifecycle
contracts; object actions do not create a new window or rendering system.

Run `test:actions` for browser coverage. The fixture demonstrates working toolbars
and full contextual actions with English defaults and Spanish presentation labels.
It uses the built distribution, not source aliases. Set `DESKTOP_PACKAGE_ROOT`
to an extracted package root to run the same browser suite against a tarball.
