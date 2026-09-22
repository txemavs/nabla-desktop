<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import CommandMenu from './CommandMenu.vue'
import type { CommandRegistry, CommandContext, MenuItem } from '../core/commands'
const props = defineProps<{
  registry: CommandRegistry
  items: MenuItem[]
  context?: CommandContext
}>()
const emit = defineEmits<{
  'interaction-start': []
  'interaction-end': []
  error: [error: unknown]
}>()
const visible = ref(false),
  popup = ref<HTMLElement | null>(null),
  list = ref<InstanceType<typeof CommandMenu> | null>(null)
let release: (() => void) | undefined
let original: HTMLElement | null = null
async function open(event: MouseEvent) {
  event.preventDefault()
  if (!visible.value) {
    release = props.registry.suspendShortcuts()
    emit('interaction-start')
  }
  original = document.activeElement as HTMLElement
  visible.value = true
  await nextTick()
  if (popup.value) {
    popup.value.style.left = `${Math.min(event.clientX, Math.max(8, innerWidth - 290))}px`
    popup.value.style.top = `${Math.min(event.clientY, Math.max(8, innerHeight - popup.value.offsetHeight - 12))}px`
    popup.value.showPopover()
    const box = popup.value.getBoundingClientRect()
    popup.value.style.top = `${Math.min(event.clientY, Math.max(8, innerHeight - box.height - 12))}px`
  }
  list.value?.focusFirst()
}
function close(focus = true) {
  if (!visible.value) return
  visible.value = false
  release?.()
  release = undefined
  emit('interaction-end')
  if (focus) original?.focus()
}
function outside(e: PointerEvent) {
  if (!popup.value?.contains(e.target as Node)) close(false)
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside)
  release?.()
})
</script>
<template>
  <div class="desktop-context-region" @contextmenu="open"><slot /></div>
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
      :context="context"
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
</style>
