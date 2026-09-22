<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import type { CommandRegistry } from '../core'
const props = defineProps<{
  open: boolean
  title: string
  registry?: CommandRegistry
  closeLabel?: string
}>()
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
function request() {
  emit('update:open', false)
}
watch(
  () => props.open,
  async (open) => {
    await nextTick()
    if (open && props.open && dialog.value && !dialog.value.open) {
      previous = document.activeElement as HTMLElement
      dialog.value.showModal()
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
  >
    <header>
      <h2 :id="id">{{ title }}</h2>
      <button :aria-label="closeLabel ?? 'Close dialog'" @click="request">×</button>
    </header>
    <div class="nd-dialog-body"><slot /></div>
  </dialog>
</template>
<style scoped>
.nd-dialog {
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
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--nd-border, #444);
}
h2 {
  font-size: 1.15em;
  margin: 0;
}
header button {
  font: inherit;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  padding: 8px;
}
.nd-dialog-body {
  padding: 18px;
}
:deep(:focus-visible) {
  outline: 2px solid var(--nd-accent, #529ddd);
  outline-offset: 2px;
}
</style>
