<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { mountExternalContent, type ContentFactory } from '../core/content'
const props = withDefaults(
  defineProps<{ mount: ContentFactory; visible?: boolean; active?: boolean }>(),
  { visible: true, active: true },
)
const emit = defineEmits<{ error: [error: unknown] }>()
const element = ref<HTMLElement | null>(null)
let mounted: ReturnType<typeof mountExternalContent> | undefined
function create() {
  mounted?.dispose()
  mounted = undefined
  if (!element.value) return
  try {
    mounted = mountExternalContent(element.value, props.mount, {
      visible: props.visible,
      active: props.active,
    })
  } catch (error) {
    emit('error', error)
  }
}
onMounted(create)
watch(() => props.mount, create)
watch(
  () => [props.visible, props.active],
  () => mounted?.update({ visible: props.visible, active: props.active }),
)
onBeforeUnmount(() => mounted?.dispose())
</script>
<template><div ref="element" class="desktop-external-content" /></template>
<style scoped>
.desktop-external-content {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
