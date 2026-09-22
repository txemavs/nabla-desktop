<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useWindowDrag } from '../composables/useWindowDrag'
import { useWindowsStore, type WindowsStore } from '../stores/windows'

const props = withDefaults(
  defineProps<{
    store?: WindowsStore
    windowId: string
    title?: string
    icon?: string
    noResize?: boolean
    noMove?: boolean
    noMax?: boolean
    noMin?: boolean
    noClose?: boolean
  }>(),
  {
    title: 'Window',
    noResize: false,
    noMove: false,
    noMax: false,
    noMin: false,
    noClose: false,
  },
)

const emit = defineEmits<{
  close: []
}>()

const windowsStore = props.store ?? useWindowsStore()
const bodyRef = ref<HTMLElement | null>(null)
const frameRef = ref<HTMLElement | null>(null)
const motionReady = ref(false)

const OPEN_Z = 100

const state = computed(() => windowsStore.windows.get(props.windowId))

const isActive = computed(() => windowsStore.activeWindowId === props.windowId)

const fillViewport = computed(() => !!state.value?.maximized)

const visible = computed(() => {
  const w = state.value
  if (!w?.open) return false
  if (w.minimized) return false
  return true
})

watch(
  isActive,
  () => {
    void nextTick(() => {
      if (isActive.value && visible.value && !frameRef.value?.contains(document.activeElement))
        bodyRef.value?.focus({ preventScroll: true })
    })
  },
  { immediate: true, flush: 'post' },
)

const frameClass = computed(() => ({
  'window-frame--active': isActive.value,
  'window-frame--maximized': fillViewport.value,
  'window-frame--motion': motionReady.value && !state.value?.introducing && !interacting.value,
}))

const frameStyle = computed(() => {
  const w = state.value
  if (!w) return {}
  if (fillViewport.value) {
    const { width, height, insets } = windowsStore.bounds
    const top = insets.top
    return {
      top: `${top}px`,
      left: `${insets.left}px`,
      width: `${Math.max(1, width - insets.left - insets.right)}px`,
      height: `${Math.max(1, height - top - insets.bottom)}px`,
      zIndex: windowsStore.maximizePolicy === 'background' ? 1 : OPEN_Z + w.zIndex,
      transform: 'none',
    }
  }
  return {
    left: `${w.x}px`,
    top: `${w.y}px`,
    width: `${w.width}px`,
    height: `${w.height}px`,
    zIndex: OPEN_Z + w.zIndex,
  }
})

let resizeCleanup: (() => void) | undefined
const interacting = ref(false)
let motionFrame = 0
onMounted(() => {
  motionFrame = requestAnimationFrame(() => {
    motionReady.value = true
  })
})
onBeforeUnmount(() => {
  cancelAnimationFrame(motionFrame)
  resizeCleanup?.()
})
function clampGeometry(x: number, y: number, width: number, height: number) {
  return windowsStore.fitGeometry({ x, y, width, height })
}

function onFramePointerDown() {
  windowsStore.focusWindow(props.windowId)
}

const { onPointerDown: onTitleDrag } = useWindowDrag(
  (dx, dy) => {
    const w = state.value
    if (!w || w.maximized || props.noMove) return
    const next = clampGeometry(w.x + dx, w.y + dy, w.width, w.height)
    windowsStore.updateGeometry(props.windowId, next)
  },
  () => {
    interacting.value = false
  },
)

function onTitlePointerDown(e: PointerEvent) {
  if (e.button !== 0 || props.noMove || state.value?.maximized) return
  interacting.value = true
  onTitleDrag(e)
}

function onTitleDoubleClick() {
  if (props.noMax) return
  windowsStore.toggleMaximize(props.windowId)
  focusBody()
}

function focusBody() {
  void nextTick(() => {
    bodyRef.value?.focus()
  })
}

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

function onResizePointerDown(edge: ResizeEdge, e: PointerEvent) {
  if (e.button !== 0 || props.noResize || fillViewport.value) return
  resizeCleanup?.()
  interacting.value = true
  e.stopPropagation()
  windowsStore.focusWindow(props.windowId)

  const w = state.value
  if (!w) return

  const startX = e.clientX
  const startY = e.clientY
  const origin = { x: w.x, y: w.y, width: w.width, height: w.height }
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)

  function onMove(ev: PointerEvent) {
    if (ev.pointerId !== e.pointerId) return
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    let { x, y, width, height } = origin

    if (edge.includes('e')) width = origin.width + dx
    if (edge.includes('w')) {
      width = origin.width - dx
      x = origin.x + dx
    }
    if (edge.includes('s')) height = origin.height + dy
    if (edge.includes('n')) {
      height = origin.height - dy
      y = origin.y + dy
    }

    const sized = clampGeometry(origin.x, origin.y, width, height)
    if (edge.includes('w')) x = origin.x + origin.width - sized.width
    if (edge.includes('n')) y = origin.y + origin.height - sized.height
    const next = clampGeometry(x, y, sized.width, sized.height)
    windowsStore.updateGeometry(props.windowId, next)
  }

  function onUp(ev: PointerEvent) {
    if (ev.pointerId !== e.pointerId) return
    if (el.hasPointerCapture(ev.pointerId)) el.releasePointerCapture(ev.pointerId)
    resizeCleanup?.()
  }

  resizeCleanup = () => {
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    el.removeEventListener('lostpointercapture', onUp)
    resizeCleanup = undefined
    interacting.value = false
  }
  el.addEventListener('lostpointercapture', onUp)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
}

function onMinimize() {
  windowsStore.minimizeWindow(props.windowId)
}

function onToggleMaximize() {
  windowsStore.toggleMaximize(props.windowId)
  focusBody()
}

function onClose() {
  emit('close')
}
</script>

<template>
  <div
    ref="frameRef"
    v-show="visible"
    class="window-frame"
    :data-window-id="windowId"
    :class="frameClass"
    :style="frameStyle"
    @pointerdown="onFramePointerDown"
    @focusin="windowsStore.activeWindowId !== windowId && onFramePointerDown()"
    role="region"
    :aria-label="title"
  >
    <header
      class="window-frame__header"
      @pointerdown="onTitlePointerDown"
      @dblclick="onTitleDoubleClick"
    >
      <div class="window-frame__title">
        <span v-if="icon" class="window-frame__icon">{{ icon }}</span>
        <span class="window-frame__title-text">{{ title }}</span>
      </div>
      <div class="window-frame__controls" @pointerdown.stop>
        <button
          v-if="!noMin"
          type="button"
          class="window-frame__btn"
          aria-label="Minimize"
          @click.stop="onMinimize"
        >
          <span class="window-frame__btn-icon">−</span>
        </button>
        <button
          v-if="!noMax"
          type="button"
          class="window-frame__btn"
          :aria-label="state?.maximized ? 'Restore' : 'Maximize'"
          @click.stop="onToggleMaximize"
        >
          <span class="window-frame__btn-icon">{{ state?.maximized ? '◱' : '□' }}</span>
        </button>
        <button
          v-if="!noClose"
          type="button"
          class="window-frame__btn window-frame__btn--close"
          aria-label="Close"
          @click.stop="onClose"
        >
          <span class="window-frame__btn-icon">×</span>
        </button>
      </div>
    </header>

    <div ref="bodyRef" class="window-frame__body" tabindex="-1">
      <slot />
    </div>

    <template v-if="!noResize && !fillViewport">
      <div
        v-for="edge in ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as ResizeEdge[]"
        :key="edge"
        class="window-frame__resize-handle"
        :class="`window-frame__resize-handle--${edge}`"
        @pointerdown="onResizePointerDown(edge, $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.window-frame {
  box-sizing: border-box;
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--nd-border, #666);
  background: var(--nd-surface, #1e1e1e);
  color: var(--nd-text, #e0e0e0);
  box-shadow:
    0 14px 28px rgba(0, 0, 0, 0.25),
    0 10px 10px rgba(0, 0, 0, 0.22);
  pointer-events: auto;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
}

.window-frame--maximized {
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
  box-shadow: none;
}

.window-frame--active {
  border-color: var(--nd-accent, #4a90d9);
}

.window-frame--motion {
  transition:
    left 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    top 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .window-frame--motion {
    transition: none;
  }
}

.window-frame__header {
  touch-action: none;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  box-sizing: border-box;
  padding: 0 4px 0 10px;
  flex-shrink: 0;
  cursor: default;
  user-select: none;
  border-bottom: 1px solid var(--nd-border, #444);
  background: var(--nd-header, #2d2d2d);
}

.window-frame__title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.window-frame__icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.window-frame__title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--nd-font-size, 13px);
  font-weight: 500;
}

.window-frame__controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.window-frame__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: none;
  background: transparent;
  color: inherit;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.window-frame__btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.window-frame__btn--close:hover {
  background: #e81123;
  color: #fff;
}

.window-frame__btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.window-frame__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--nd-surface, #1e1e1e);
  outline: none;
}

.window-frame__resize-handle {
  touch-action: none;
  position: absolute;
  z-index: 2;
}

.window-frame__resize-handle--n,
.window-frame__resize-handle--s {
  left: 8px;
  right: 8px;
  height: 6px;
  cursor: ns-resize;
}

.window-frame__resize-handle--n {
  top: -3px;
}
.window-frame__resize-handle--s {
  bottom: -3px;
}

.window-frame__resize-handle--e,
.window-frame__resize-handle--w {
  top: 8px;
  bottom: 8px;
  width: 6px;
  cursor: ew-resize;
}

.window-frame__resize-handle--e {
  right: -3px;
}
.window-frame__resize-handle--w {
  left: -3px;
}

.window-frame__resize-handle--ne,
.window-frame__resize-handle--nw,
.window-frame__resize-handle--se,
.window-frame__resize-handle--sw {
  width: 12px;
  height: 12px;
}

.window-frame__resize-handle--ne {
  top: -3px;
  right: -3px;
  cursor: nesw-resize;
}
.window-frame__resize-handle--nw {
  top: -3px;
  left: -3px;
  cursor: nwse-resize;
}
.window-frame__resize-handle--se {
  bottom: -3px;
  right: -3px;
  cursor: nwse-resize;
}
.window-frame__resize-handle--sw {
  bottom: -3px;
  left: -3px;
  cursor: nesw-resize;
}
</style>
