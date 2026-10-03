<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import CommandIcon from './CommandIcon.vue'
import type { CommandRegistry } from '../core'
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    icon?: string
    registry?: CommandRegistry
    closeLabel?: string
    modal?: boolean
    draggable?: boolean
  }>(),
  { modal: true },
)
const emit = defineEmits<{
  'update:open': [open: boolean]
  'interaction-start': []
  'interaction-end': []
}>()
const dialog = ref<HTMLDialogElement | null>(null)
const id = `nd-dialog-${Math.random().toString(36).slice(2)}`
let release: (() => void) | undefined,
  previous: HTMLElement | null = null,
  showing = false
function finish() {
  if (!showing) return
  showing = false
  release?.()
  release = undefined
  emit('interaction-end')
  if (previous?.isConnected) previous.focus()
}
function drag(event: PointerEvent) {
  if (!props.draggable || (event.target as HTMLElement).closest('button')) return
  const element = dialog.value!,
    rect = element.getBoundingClientRect()
  const dx = event.clientX - rect.left,
    dy = event.clientY - rect.top
  element.style.margin = '0'
  element.style.right = 'auto'
  element.style.bottom = 'auto'
  element.style.left = rect.left + 'px'
  element.style.top = rect.top + 'px'
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  const move = (e: PointerEvent) => {
    element.style.left = Math.max(0, Math.min(innerWidth - 100, e.clientX - dx)) + 'px'
    element.style.top = Math.max(0, Math.min(innerHeight - 40, e.clientY - dy)) + 'px'
  }
  const stop = () => {
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', stop)
    handle.removeEventListener('pointercancel', stop)
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', stop)
  handle.addEventListener('pointercancel', stop)
}
function request() {
  emit('update:open', false)
}
watch(
  () => props.open,
  async (open) => {
    await nextTick()
    if (open && props.open && dialog.value && !dialog.value.open) {
      previous = document.activeElement as HTMLElement
      if (props.modal === false) dialog.value.show()
      else dialog.value.showModal()
      showing = true
      release = props.registry?.suspendShortcuts()
      emit('interaction-start')
    } else if (!props.open) {
      dialog.value?.close()
      finish()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  dialog.value?.close()
  finish()
})
</script>
<template>
  <dialog
    ref="dialog"
    class="nd-dialog"
    :aria-labelledby="id"
    @cancel.prevent="request"
    @close="finish"
    @keydown.esc.prevent.stop="request"
  >
    <header @pointerdown="drag" :style="{ cursor: draggable ? 'move' : undefined }">
      <h2 :id="id"><CommandIcon v-if="icon" :name="icon" />{{ title }}</h2>
      <button :aria-label="closeLabel ?? 'Close dialog'" @click="request">
        <CommandIcon name="close" />
      </button>
    </header>
    <div class="nd-dialog-body"><slot /></div>
  </dialog>
</template>
<style scoped>
.nd-dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  height: fit-content;
  padding: 0;
  width: min(480px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  border: 1px solid var(--nd-border, #444);
  border-radius: var(--nd-radius, 4px);
  background: var(--nd-surface, #1e1e1e);
  color: var(--nd-text, #eee);
  font: var(--nd-font-size, 14px) var(--nd-font, system-ui, sans-serif);
  box-shadow: 0 20px 80px #0009;
}
.nd-dialog::backdrop {
  background: #0009;
}
.nd-dialog > header {
  background: var(--nd-titlebar, #202020);
  color: var(--nd-titlebar-text, #d0d0d0);
  height: 36px;
  box-sizing: border-box;
  gap: 8px;
  flex-shrink: 0;
  touch-action: none;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 12px;
  border-bottom: 1px solid var(--nd-border, #444);
}
h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  margin: 0;
}
.nd-dialog > header button {
  font: inherit;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  padding: 5px;
  display: grid;
  place-items: center;
}
.nd-dialog-body {
  padding: 18px;
}
:deep(:focus-visible) {
  outline: 2px solid var(--nd-accent, #529ddd);
  outline-offset: 2px;
}
</style>
