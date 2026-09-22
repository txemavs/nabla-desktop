<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useWindowsStore, type WindowsStore } from '../stores/windows'
import WindowFrame from './WindowFrame.vue'
import type { WindowState, DesktopInsets } from '../types'

const props = withDefaults(
  defineProps<{
    store?: WindowsStore
    mode?: 'container' | 'viewport'
    insets?: Partial<DesktopInsets>
    filter?: (w: WindowState) => boolean
    sort?: (a: WindowState, b: WindowState) => number
  }>(),
  {
    mode: 'container',
    filter: () => true,
    sort: (a, b) => a.zIndex - b.zIndex,
  },
)
const windowsStore = props.store ?? useWindowsStore()
const root = ref<HTMLElement | null>(null)
const renderedWindows = computed(() =>
  [...windowsStore.windows.values()]
    .filter((w) => (w.open || (w.keepAlive && w.hasOpened)) && props.filter(w))
    .sort(props.sort),
)
let observer: ResizeObserver | undefined
function measure() {
  if (root.value)
    windowsStore.setBounds(root.value.clientWidth, root.value.clientHeight, props.insets)
}
onMounted(() => {
  observer = new ResizeObserver(measure)
  observer.observe(root.value!)
  measure()
})
watch(() => props.insets, measure, { deep: true })
onBeforeUnmount(() => observer?.disconnect())
</script>
<template>
  <div ref="root" class="window-host" :class="{ 'window-host--viewport': mode === 'viewport' }">
    <WindowFrame
      v-for="w in renderedWindows"
      :key="w.id"
      :store="windowsStore"
      :window-id="w.id"
      :title="w.title"
      :icon="w.icon"
      @close="windowsStore.closeWindow(w.id)"
    >
      <slot :window="w" :window-id="w.id">
        <div class="window-host__placeholder">Window: {{ w.id }}</div>
      </slot>
    </WindowFrame>
  </div>
</template>
<style scoped>
.window-host {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  pointer-events: none;
}
.window-host--viewport {
  position: fixed;
  inset: 0;
}
.window-host__placeholder {
  padding: 16px;
  color: #888;
  font-size: 14px;
}
</style>
