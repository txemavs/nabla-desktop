# Reusable application components (0.2)

Applications own their data and commands. Desktop owns presentation, keyboard/focus
behavior and window/workspace layout. No component imports an application model.

- `PropertyField` edits an application-owned value through a callback. It supports
  numeric limits, units, enumerations, read-only values, axis-style locks and inline
  validation errors. Asynchronous writes temporarily disable the control.
- `PropertySheet` renders stable, collapsible sections and associated actions.
- `SidebarTabs` supplies a vertical, keyboard-accessible settings navigation.
- `TreeView` renders generic categories and items without changing domain parents.
- `LogView` renders bounded application-provided messages with level filters.
- `DesktopDialog` supports optional nonmodal, draggable utility windows while
  retaining the original modal default and balanced input-ownership events.
- Commands may supply an icon and opt into icon-only toolbar presentation. Menus
  and toolbars share the same registry, availability checks and operation.

Use `FieldValue`, `PropertyField`, `PropertySection`, `TreeNode` and `LogEntry` from
`@nabla/desktop/core` for framework-independent presentation contracts. The Vue
components are exported from `@nabla/desktop`; import `@nabla/desktop/style.css` once.

```vue
<script setup lang="ts">
import { PropertySheet } from '@nabla/desktop'
import type { PropertySection } from '@nabla/desktop/core'
defineProps<{ sections: PropertySection[] }>()
</script>
<template><PropertySheet :sections="sections" /></template>
```

Keep expensive rendering/simulation objects outside Vue deep reactivity. Publish
small immutable UI snapshots via `shallowRef`, with callbacks to domain operations.
