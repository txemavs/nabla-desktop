<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import CommandIcon from './CommandIcon.vue'
import type { CommandRegistry, CommandContext } from '../core/commands'
const props = defineProps<{
  registry: CommandRegistry
  commands: string[]
  context?: CommandContext
  label: string
  iconOnly?: boolean
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
        v-if="registry.visible(id, context)"
        type="button"
        :disabled="!registry.available(id, context)"
        :data-command="id"
        :title="registry.get(id)?.label"
        :aria-label="registry.get(id)?.label"
        :aria-pressed="registry.checked(id, context)"
        @click="run(id)"
      >
        <CommandIcon v-if="registry.get(id)?.icon" :name="registry.get(id)!.icon!" /><span
          v-if="!(iconOnly || registry.get(id)?.iconOnly) || !registry.get(id)?.icon"
          >{{ registry.get(id)?.label }}</span
        >
      </button></template
    >
  </div>
</template>
