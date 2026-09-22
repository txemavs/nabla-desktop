<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import {
  measureWorkspace,
  type Workspace,
  type LayoutRect,
  type PlacedGroup,
  type PlacedDivider,
  type DockPosition,
} from '../core/workspace'
const props = defineProps<{
  workspace: Workspace
  labels?: Partial<{
    float: string
    dock: string
    close: string
    resize: string
    move: string
    left: string
    right: string
    top: string
    bottom: string
    group: string
    modified: string
    moveTab: string
  }>
}>()
const emit = defineEmits<{
  error: [error: unknown]
  'interaction-start': []
  'interaction-end': []
}>()
const labels = computed(() => ({
  float: 'Float panel',
  dock: 'Dock panel',
  close: 'Close panel',
  resize: 'Resize panel',
  move: 'Move panel',
  left: 'Split left',
  right: 'Split right',
  top: 'Split above',
  bottom: 'Split below',
  group: 'Panel tabs',
  modified: 'Modified',
  moveTab: 'Move tab to group',
  ...props.labels,
}))
const root = ref<HTMLElement | null>(null),
  revision = ref(0),
  width = ref(0),
  height = ref(0),
  dragged = ref<string | null>(null)
let stop = props.workspace.subscribe(() => revision.value++),
  observer: ResizeObserver | undefined,
  cleanup: (() => void) | undefined
const uid = `nd-workspace-${Math.random().toString(36).slice(2)}`
const state = computed(() => {
  void revision.value
  return props.workspace.snapshot()
})
const panels = computed(() => {
  void revision.value
  return props.workspace.definitions()
})
const placed = computed(() => measureWorkspace(state.value, width.value, height.value))
const visibleGroups = computed(() => placed.value.groups)
const geometry = (r: LayoutRect, z?: number) => ({
  left: `${r.x}px`,
  top: `${r.y}px`,
  width: `${r.width}px`,
  height: `${r.height}px`,
  zIndex: z,
})
const tabId = (id: string) => `${uid}-tab-${encodeURIComponent(id)}`
const panelId = (id: string) => `${uid}-panel-${encodeURIComponent(id)}`
function panelGroup(id: string) {
  return placed.value.groups.find((g) => g.group.tabs.includes(id))
}
function panelStyle(id: string) {
  const g = panelGroup(id)
  return g
    ? geometry({ x: g.x, y: g.y + 72, width: g.width, height: Math.max(0, g.height - 72) }, g.z + 1)
    : {}
}
function visible(id: string) {
  return panelGroup(id)?.group.active === id
}
const mounted = new Set<string>()
const retained = computed(() => {
  for (const g of placed.value.groups) for (const id of g.group.tabs) mounted.add(id)
  return panels.value.filter((p) => mounted.has(p.id))
})
function title(id: string) {
  return panels.value.find((p) => p.id === id)?.title ?? id
}
function dirty(id: string) {
  return panels.value.find((p) => p.id === id)?.dirty?.() ?? false
}
async function activate(id: string, focus = false) {
  props.workspace.activate(id)
  if (focus) {
    await nextTick()
    document.getElementById(tabId(id))?.focus()
  }
}
async function close(id: string) {
  try {
    const closed = await props.workspace.close(id)
    if (closed && state.value.active) await activate(state.value.active, true)
  } catch (error) {
    emit('error', error)
  }
}
function keys(event: KeyboardEvent, g: PlacedGroup, id: string) {
  const index = g.group.tabs.indexOf(id)
  if (event.altKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()
    props.workspace.dock(
      id,
      g.group.id,
      'center',
      Math.max(0, Math.min(g.group.tabs.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1))),
    )
    return
  }
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % g.group.tabs.length
  else if (event.key === 'ArrowLeft') next = (index + g.group.tabs.length - 1) % g.group.tabs.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = g.group.tabs.length - 1
  else if (event.key === 'Delete') {
    event.preventDefault()
    void close(id)
    return
  } else return
  event.preventDefault()
  void activate(g.group.tabs[next], true)
}
function drop(g: PlacedGroup, position: DockPosition, index?: number) {
  if (dragged.value) props.workspace.dock(dragged.value, g.group.id, position, index)
  endDrag()
}
function endDrag() {
  if (dragged.value) {
    dragged.value = null
    emit('interaction-end')
  }
}
function beginDrag(event: DragEvent, id: string) {
  dragged.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  emit('interaction-start')
}
function docking(g: PlacedGroup, position: DockPosition) {
  const target = g.floating ? placed.value.groups.find((p) => !p.floating) : g
  if (target) props.workspace.dock(g.group.active, target.group.id, position)
  else if (g.floating) {
    const id = g.group.active
    const snapshot = props.workspace.snapshot()
    snapshot.root = g.group
    snapshot.floating = snapshot.floating.filter((f) => f.group.id !== g.group.id)
    props.workspace.restore(snapshot)
    props.workspace.activate(id)
  }
}
function gesture(event: PointerEvent, move: (e: PointerEvent) => void) {
  if (event.button !== 0) return
  event.preventDefault()
  cleanup?.()
  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
  emit('interaction-start')
  const finish = () => {
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', finish)
    target.removeEventListener('pointercancel', finish)
    target.removeEventListener('lostpointercapture', finish)
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
    cleanup = undefined
    emit('interaction-end')
  }
  cleanup = finish
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', finish)
  target.addEventListener('pointercancel', finish)
  target.addEventListener('lostpointercapture', finish)
}
function resize(event: PointerEvent, d: PlacedDivider) {
  const box = root.value!.getBoundingClientRect()
  gesture(event, (e) => {
    const position =
      d.axis === 'horizontal' ? e.clientX - box.left - d.parent.x : e.clientY - box.top - d.parent.y
    const size = d.axis === 'horizontal' ? d.parent.width : d.parent.height
    props.workspace.resizeSplit(d.id, position / Math.max(1, size - 6))
  })
}
function splitKeys(event: KeyboardEvent, d: PlacedDivider) {
  const keys = d.axis === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
  if (keys.includes(event.key)) {
    event.preventDefault()
    props.workspace.resizeSplit(d.id, d.ratio + (event.key === keys[0] ? -0.05 : 0.05))
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    props.workspace.resizeSplit(d.id, event.key === 'Home' ? 0.1 : 0.9)
  }
}
function floatingGesture(event: PointerEvent, g: PlacedGroup, resize = false) {
  props.workspace.activate(g.group.active)
  const x = event.clientX,
    y = event.clientY
  gesture(event, (e) => {
    const dx = e.clientX - x,
      dy = e.clientY - y
    props.workspace.moveFloating(
      g.group.id,
      resize
        ? {
            ...g,
            width: Math.min(width.value - g.x, g.width + dx),
            height: Math.min(height.value - g.y, g.height + dy),
          }
        : {
            ...g,
            x: Math.max(0, Math.min(width.value - g.width, g.x + dx)),
            y: Math.max(0, Math.min(height.value - g.height, g.y + dy)),
          },
    )
  })
}
function moveKeys(event: KeyboardEvent, g: PlacedGroup, resize = false) {
  const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight',
    vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown'
  if (!horizontal && !vertical) return
  event.preventDefault()
  const delta =
    (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) * (event.shiftKey ? 40 : 10)
  props.workspace.moveFloating(
    g.group.id,
    resize
      ? {
          ...g,
          width: g.width + (horizontal ? delta : 0),
          height: g.height + (vertical ? delta : 0),
        }
      : {
          ...g,
          x: Math.max(0, Math.min(width.value - g.width, g.x + (horizontal ? delta : 0))),
          y: Math.max(0, Math.min(height.value - g.height, g.y + (vertical ? delta : 0))),
        },
  )
}
onMounted(() => {
  observer = new ResizeObserver(() => {
    width.value = root.value!.clientWidth
    height.value = root.value!.clientHeight
  })
  observer.observe(root.value!)
})
watch(
  () => props.workspace,
  () => {
    stop()
    mounted.clear()
    stop = props.workspace.subscribe(() => revision.value++)
    revision.value++
  },
)
onBeforeUnmount(() => {
  cleanup?.()
  endDrag()
  stop()
  observer?.disconnect()
})
</script>
<template>
  <div ref="root" class="nd-workspace" :data-revision="revision">
    <div
      v-for="g in visibleGroups"
      :key="g.group.id"
      class="nd-group"
      :class="{ 'nd-floating': g.floating }"
      :style="geometry(g, g.z)"
      :data-group="g.group.id"
      @pointerdown="workspace.activate(g.group.active)"
    >
      <div
        role="tablist"
        :aria-label="labels.group"
        class="nd-tabs"
        @dragover.prevent
        @drop.prevent="drop(g, 'center')"
      >
        <button
          v-for="id in g.group.tabs"
          :id="tabId(id)"
          :key="id"
          role="tab"
          :aria-selected="g.group.active === id"
          :aria-controls="panelId(id)"
          :tabindex="g.group.active === id ? 0 : -1"
          draggable="true"
          @dragstart="beginDrag($event, id)"
          @dragend="endDrag"
          @dragover.prevent.stop
          @drop.prevent.stop="drop(g, 'center', g.group.tabs.indexOf(id))"
          @click="activate(id)"
          @keydown="keys($event, g, id)"
        >
          {{ title(id) }}<span v-if="dirty(id)" :aria-label="labels.modified"> ●</span>
        </button>
      </div>
      <div class="nd-panel-actions">
        <select
          v-if="visibleGroups.length > 1"
          :aria-label="labels.moveTab"
          value=""
          @change="workspace.dock(g.group.active, ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>{{ labels.moveTab }}</option>
          <option
            v-for="target in visibleGroups.filter((item) => item.group.id !== g.group.id)"
            :key="target.group.id"
            :value="target.group.id"
          >
            {{ title(target.group.active) }}
          </option>
        </select>
        <button
          v-if="g.floating"
          :aria-label="labels.move"
          :title="labels.move"
          @pointerdown.stop="floatingGesture($event, g)"
          @keydown="moveKeys($event, g)"
        >
          ⠿
        </button>
        <button
          :aria-label="g.floating ? labels.dock : labels.float"
          :title="g.floating ? labels.dock : labels.float"
          @click="g.floating ? docking(g, 'center') : workspace.float(g.group.active)"
        >
          {{ g.floating ? '▣' : '↗' }}
        </button>
        <template v-if="!g.floating"
          ><button
            v-for="(symbol, position) in { left: '←', right: '→', top: '↑', bottom: '↓' }"
            :key="position"
            :aria-label="labels[position]"
            :title="labels[position]"
            :disabled="g.group.tabs.length < 2"
            @click="docking(g, position)"
          >
            {{ symbol }}
          </button></template
        >
        <button :aria-label="labels.close" :title="labels.close" @click="close(g.group.active)">
          ×
        </button>
        <button
          v-if="g.floating"
          :aria-label="labels.resize"
          :title="labels.resize"
          @pointerdown.stop="floatingGesture($event, g, true)"
          @keydown="moveKeys($event, g, true)"
        >
          ◢
        </button>
      </div>
    </div>
    <!-- Keyed content lives outside the changing layout tree. Docking never remounts it. -->
    <section
      v-for="panel in retained"
      v-show="visible(panel.id)"
      :id="panelId(panel.id)"
      :key="panel.id"
      class="nd-panel-content"
      role="tabpanel"
      :aria-labelledby="tabId(panel.id)"
      :style="panelStyle(panel.id)"
      :data-panel="panel.id"
      tabindex="0"
      @focusin="workspace.activate(panel.id)"
      @pointerdown="workspace.activate(panel.id)"
    >
      <slot :panel="panel" :visible="visible(panel.id)" :active="state.active === panel.id" />
    </section>
    <div
      v-for="d in placed.dividers"
      :key="d.id"
      class="nd-divider"
      role="separator"
      tabindex="0"
      :aria-label="labels.resize"
      :aria-orientation="d.axis === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuenow="Math.round(d.ratio * 100)"
      :aria-valuemin="10"
      :aria-valuemax="90"
      :style="geometry(d, 2)"
      :class="d.axis"
      @pointerdown="resize($event, d)"
      @keydown="splitKeys($event, d)"
    />
    <template v-if="dragged"
      ><div
        v-for="g in visibleGroups"
        :key="g.group.id"
        class="nd-drop-grid"
        :style="geometry({ ...g, y: g.y + 72, height: Math.max(0, g.height - 72) }, 1000)"
        @dragover.prevent
      >
        <button
          v-for="pos in g.floating ? ['center'] : ['left', 'right', 'top', 'bottom', 'center']"
          :key="pos"
          :class="pos"
          @dragover.prevent
          @drop.prevent.stop="drop(g, pos as DockPosition)"
        >
          {{ pos === 'center' ? labels.dock : labels[pos as 'left'] }}
        </button>
      </div></template
    >
  </div>
</template>
<style scoped>
.nd-workspace {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: var(--nd-text, #e0e0e0);
  font: var(--nd-font-size, 14px) var(--nd-font, system-ui, sans-serif);
}
.nd-group,
.nd-panel-content,
.nd-divider,
.nd-drop-grid {
  position: absolute;
  box-sizing: border-box;
}
.nd-group {
  background: var(--nd-surface, #1e1e1e);
  border: 1px solid var(--nd-border, #444);
  overflow: hidden;
}
.nd-floating {
  box-shadow: 0 8px 24px #0007;
  border-color: var(--nd-accent, #529ddd);
}
.nd-tabs {
  display: flex;
  height: 36px;
  overflow: auto;
  background: var(--nd-header, #2d2d2d);
}
.nd-workspace button {
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  white-space: nowrap;
  padding: 6px 10px;
}
.nd-tabs button[aria-selected='true'] {
  background: var(--nd-surface, #1e1e1e);
  box-shadow: inset 0 -2px var(--nd-accent, #529ddd);
}
.nd-workspace button:hover {
  background: var(--nd-hover, #353535);
}
.nd-workspace button:disabled {
  opacity: 0.35;
  cursor: default;
}
.nd-panel-actions {
  height: 34px;
  display: flex;
  overflow: auto;
  gap: 2px;
  border-bottom: 1px solid var(--nd-border, #444);
}
.nd-panel-actions select {
  max-width: 140px;
  background: var(--nd-header, #2d2d2d);
  color: inherit;
  border: 1px solid var(--nd-border, #444);
  font: inherit;
}
.nd-panel-actions button {
  touch-action: none;
}
.nd-panel-content {
  overflow: auto;
  background: var(--nd-surface, #1e1e1e);
  border: 1px solid var(--nd-border, #444);
}
.nd-divider {
  touch-action: none;
  background: var(--nd-border, #444);
}
.nd-divider.horizontal {
  cursor: col-resize;
}
.nd-divider.vertical {
  cursor: row-resize;
}
.nd-workspace :focus-visible {
  outline: 2px solid var(--nd-accent, #529ddd);
  outline-offset: -2px;
}
.nd-drop-grid {
  display: grid;
  grid-template: 1fr 1fr 1fr / 1fr 1fr 1fr;
  background: #1119;
  gap: 4px;
  padding: 8px;
  pointer-events: none;
}
.nd-drop-grid button {
  pointer-events: auto;
  background: var(--nd-header, #2d2d2d);
  border: 1px dashed var(--nd-accent, #529ddd);
  overflow: hidden;
}
.nd-drop-grid .left {
  grid-area: 2/1;
}
.nd-drop-grid .right {
  grid-area: 2/3;
}
.nd-drop-grid .top {
  grid-area: 1/2;
}
.nd-drop-grid .bottom {
  grid-area: 3/2;
}
.nd-drop-grid .center {
  grid-area: 2/2;
}
</style>
