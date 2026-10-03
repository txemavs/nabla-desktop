<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import CommandMenu from './CommandMenu.vue'
import { snapshotCommandContext } from '../core/commands'
import type { CommandRegistry, CommandContext, MenuItem } from '../core/commands'
import { menuLabels, type MenuLabels } from '../core/menu-labels'

const props = defineProps<{
  registry: CommandRegistry
  items: MenuItem[]
  context?: CommandContext
  /** Opt-in built-in button; existing contextual regions retain their layout. */
  showTrigger?: boolean
  inline?: boolean
  labels?: MenuLabels
}>()
const emit = defineEmits<{
  'interaction-start': []
  'interaction-end': []
  error: [error: unknown]
}>()
const visible = ref(false)
const region = ref<HTMLElement | null>(null)
const popup = ref<HTMLElement | null>(null)
const list = ref<InstanceType<typeof CommandMenu> | null>(null)
const openedContext = ref<CommandContext>({})
let release: (() => void) | undefined
let original: HTMLElement | null = null
let revision = 0

async function openAt(x: number, y: number, opener?: HTMLElement) {
  const version = ++revision
  if (!visible.value) {
    release = props.registry.suspendShortcuts()
    emit('interaction-start')
  }
  original = opener ?? document.activeElement as HTMLElement
  openedContext.value = snapshotCommandContext(props.context)
  visible.value = true
  await nextTick()
  if (version !== revision || !popup.value) return
  const element = popup.value
  if (!element.matches(':popover-open')) element.showPopover()
  const box = element.getBoundingClientRect()
  element.style.left = `${Math.max(8, Math.min(x, innerWidth - box.width - 8))}px`
  element.style.top = `${Math.max(8, Math.min(y, innerHeight - box.height - 8))}px`
  list.value?.focusFirst()
}

function openForAnchor(anchor: HTMLElement) {
  const bounds = anchor.getBoundingClientRect()
  return openAt(bounds.left, bounds.bottom + 2, anchor)
}

function toggle(event: MouseEvent) {
  if (visible.value) close()
  else void openForAnchor(event.currentTarget as HTMLElement)
}

function contextmenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  void openAt(event.clientX, event.clientY)
}

function key(event: KeyboardEvent) {
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
  event.preventDefault()
  event.stopPropagation()
  void openForAnchor(event.target as HTMLElement)
}

function close(focus = true) {
  ++revision
  if (!visible.value) return
  visible.value = false
  release?.()
  release = undefined
  emit('interaction-end')
  if (focus && original?.isConnected) original.focus()
}

function outside(event: PointerEvent) {
  const target = event.target as Node
  if (!popup.value?.contains(target) && !region.value?.contains(target)) close(false)
}

function reportError(error: unknown) {
  emit('error', error)
}

function dismiss(event: KeyboardEvent) {
  if (!visible.value || event.defaultPrevented || event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  close()
}

defineExpose({ openAt, openForAnchor, close })
onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('keydown', dismiss)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('keydown', dismiss)
  close(false)
})
</script>
<template>
  <div
    ref="region"
    class="desktop-context-region"
    :class="{ 'desktop-context-inline': inline }"
    @contextmenu="contextmenu"
    @keydown="key"
  >
    <slot name="trigger" :open="openForAnchor" :close="close" :expanded="visible">
      <button
        v-if="showTrigger"
        type="button"
        class="desktop-action-trigger"
        aria-haspopup="menu"
        :aria-expanded="visible"
        @click="toggle"
      >{{ (labels ?? menuLabels.en).allActions }}</button>
    </slot>
    <slot />
  </div>
  <div
    v-if="visible"
    ref="popup"
    popover="manual"
    class="desktop-menu-popup"
    @keydown.tab="close(false)"
  >
    <CommandMenu
      ref="list"
      :registry="registry"
      :items="items"
      :context="openedContext"
      :report-error="reportError"
      @close="close()"
      @error="emit('error', $event)"
    />
  </div>
</template>
<style scoped>
.desktop-context-region {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.desktop-context-inline {
  display: inline-block;
  width: auto;
  height: auto;
}
</style>
