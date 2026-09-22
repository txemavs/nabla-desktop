<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import type { CommandRegistry, CommandContext } from '../core/commands'
const props = defineProps<{
  registry: CommandRegistry
  commands: string[]
  context?: CommandContext
  label: string
}>()
const emit = defineEmits<{ error: [error: unknown] }>()
const revision = ref(0)
const stop = props.registry.subscribe(() => revision.value++)
onBeforeUnmount(stop)
async function run(id: string) {
  try {
    await props.registry.execute(id, props.context)
  } catch (error) {
    emit('error', error)
  }
}
</script>
<template>
  <div class="desktop-command-toolbar" role="group" :aria-label="label" :data-revision="revision">
    <template v-for="id in commands" :key="id"
      ><button
        v-if="registry.get(id) && (registry.get(id)?.visible?.() ?? true)"
        :disabled="!registry.available(id, context)"
        :aria-pressed="registry.get(id)?.checked?.()"
        @click="run(id)"
      >
        {{ registry.get(id)?.label }}
      </button></template
    >
  </div>
</template>
