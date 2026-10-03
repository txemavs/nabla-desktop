<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { CommandRegistry, CommandContext, DesktopMenu } from '../core/commands'
import CommandMenu from './CommandMenu.vue'
import { menuLabels, type MenuLabels } from '../core/menu-labels'
import { snapshotCommandContext } from '../core/commands'
const props = defineProps<{
  registry: CommandRegistry
  menus: DesktopMenu[]
  context?: CommandContext
  labels?: MenuLabels
}>()
const emit = defineEmits<{
  'interaction-start': []
  'interaction-end': []
  error: [error: unknown]
}>()
const root = ref<HTMLElement | null>(null),
  popup = ref<HTMLElement | null>(null),
  list = ref<InstanceType<typeof CommandMenu> | null>(null),
  selected = ref<number | null>(null)
let release: (() => void) | undefined
const openedContext = ref<CommandContext>({})
async function open(index: number, focus = false) {
  const wasOpen = selected.value !== null
  selected.value = index
  openedContext.value = snapshotCommandContext(props.context)
  if (!wasOpen) {
    release = props.registry.suspendShortcuts()
    emit('interaction-start')
  }
  await nextTick()
  const button = root.value?.children[index] as HTMLElement
  if (!button || selected.value !== index) return
  const rect = button.getBoundingClientRect()
  if (popup.value) {
    popup.value.style.left = `${Math.min(rect.left, Math.max(8, innerWidth - 290))}px`
    popup.value.style.top = `${rect.bottom + 2}px`
    if (!popup.value.matches(':popover-open')) popup.value.showPopover()
  }
  if (focus) list.value?.focusFirst()
}
function close(focus = true) {
  const index = selected.value
  selected.value = null
  release?.()
  release = undefined
  if (index !== null) {
    emit('interaction-end')
    if (focus) (root.value?.children[index] as HTMLElement)?.focus()
  }
}
function outside(event: PointerEvent) {
  const target = event.target as Node
  if (!root.value?.contains(target) && !popup.value?.contains(target)) close(false)
}
function reportError(error: unknown) {
  emit('error', error)
}
function key(event: KeyboardEvent, index: number) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    void open(index, true)
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    const n =
      (index + (event.key === 'ArrowRight' ? 1 : props.menus.length - 1)) % props.menus.length
    ;(root.value?.children[n] as HTMLElement)?.focus()
    if (selected.value !== null) void open(n)
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  close(false)
})
</script>
<template>
  <nav ref="root" class="desktop-menu-bar" :aria-label="(labels ?? menuLabels.en).applicationMenu">
    <button
      v-for="(menu, index) in menus"
      :key="menu.id"
      type="button"
      :aria-expanded="selected === index"
      aria-haspopup="menu"
      @click="selected === index ? close() : open(index, true)"
      @keydown="key($event, index)"
    >
      {{ menu.label }}
    </button>
  </nav>
  <div
    v-if="selected !== null"
    ref="popup"
    popover="manual"
    class="desktop-menu-popup"
    @keydown.tab="close(false)"
  >
    <CommandMenu
      ref="list"
      :registry="registry"
      :items="menus[selected].items"
      :context="openedContext"
      :report-error="reportError"
      @close="close()"
      @error="emit('error', $event)"
    />
  </div>
</template>
