<script setup lang="ts">
import { computed } from 'vue'
import { useWindowsStore } from '../stores/windows'
import WindowFrame from './WindowFrame.vue'
import type { WindowState } from '../types'

const props = withDefaults(
  defineProps<{
    /** Filter which windows to render. Defaults to all open windows. */
    filter?: (w: WindowState) => boolean
    /** Sort windows before rendering. Defaults to zIndex ascending. */
    sort?: (a: WindowState, b: WindowState) => number
  }>(),
  {
    filter: (w: WindowState) => w.open,
    sort: (a: WindowState, b: WindowState) => a.zIndex - b.zIndex,
  },
)

const windowsStore = useWindowsStore()

const visibleWindows = computed(() => {
  return [...windowsStore.windows.values()]
    .filter(props.filter)
    .sort(props.sort)
})

function handleClose(id: string) {
  windowsStore.closeWindow(id)
}
</script>

<template>
  <div class="window-host">
    <WindowFrame
      v-for="w in visibleWindows"
      :key="w.id"
      :window-id="w.id"
      :title="w.title"
      :icon="w.icon"
      @close="handleClose(w.id)"
    >
      <slot :window="w" :window-id="w.id">
        <div class="window-host__placeholder">
          Window: {{ w.id }}
        </div>
      </slot>
    </WindowFrame>
  </div>
</template>

<style scoped>
.window-host {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.window-host__placeholder {
  padding: 16px;
  color: #888;
  font-size: 14px;
}
</style>
