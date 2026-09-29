<script setup lang="ts">
import type { PropertySection } from '../core/forms'
import SettingsGroup from './SettingsGroup.vue'
import PropertyField from './PropertyField.vue'
defineProps<{ sections: PropertySection[] }>()
const emit = defineEmits<{ error: [error: unknown] }>()
async function run(execute: () => void | Promise<void>) {
  try {
    await execute()
  } catch (error) {
    emit('error', error)
  }
}
</script>
<template>
  <div class="nd-property-sheet">
    <SettingsGroup
      v-for="section in sections"
      :key="section.id"
      :label="section.label"
      :open="section.open ?? true"
    >
      <p v-if="section.note" class="nd-property-note">{{ section.note }}</p>
      <PropertyField
        v-for="field in section.fields"
        :key="field.id"
        :field="field"
        @error="emit('error', $event)"
      />
      <button
        v-for="action in section.actions"
        :id="action.id"
        :key="action.id"
        type="button"
        :disabled="action.disabled"
        @click="run(action.execute)"
      >
        {{ action.label }}
      </button>
      <slot :name="section.id" />
    </SettingsGroup>
  </div>
</template>
<style scoped>
.nd-property-sheet {
  font-size: 12px;
}
.nd-property-sheet :deep(.nd-settings) {
  margin: 0;
  border: 0;
  border-bottom: 1px solid var(--nd-border, #444);
  border-radius: 0;
}
.nd-property-sheet :deep(summary) {
  padding: 8px 10px;
  font-weight: 500;
}
.nd-property-sheet :deep(.nd-settings > div) {
  padding: 8px 10px;
}
.nd-property-sheet button {
  font: inherit;
  background: var(--nd-header, #373737);
  color: inherit;
  border: 1px solid var(--nd-border, #444);
  border-radius: 3px;
  padding: 6px 9px;
  margin: 3px;
}
.nd-property-note {
  color: var(--nd-muted, #aaa);
  line-height: 1.5;
}
</style>
