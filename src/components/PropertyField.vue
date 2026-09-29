<script setup lang="ts">
import { ref } from 'vue'
import type { PropertyField } from '../core/forms'
const props = defineProps<{ field: PropertyField }>()
const emit = defineEmits<{ error: [error: unknown] }>()
const pending = ref(false),
  failure = ref('')
async function change(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.checkValidity()) {
    input.reportValidity()
    return
  }
  const value =
    props.field.type === 'checkbox'
      ? input.checked
      : props.field.type === 'number'
        ? input.valueAsNumber
        : input.value
  if (typeof value === 'number' && !Number.isFinite(value)) return
  pending.value = true
  failure.value = ''
  try {
    await props.field.change(value)
  } catch (error) {
    failure.value = String(error instanceof Error ? error.message : error)
    emit('error', error)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <div class="nd-property-field">
    <label :for="field.id"
      >{{ field.label }}<span v-if="field.unit"> · {{ field.unit }}</span></label
    >
    <div class="nd-property-control">
      <select
        v-if="field.type === 'select'"
        :id="field.id"
        :value="field.value"
        :disabled="field.disabled || field.readonly || pending"
        @change="change"
      >
        <option v-for="option in field.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <textarea
        v-else-if="field.type === 'textarea'"
        :id="field.id"
        :value="String(field.value)"
        :readonly="field.readonly"
        :disabled="field.disabled || pending"
        @change="change"
      />
      <input
        v-else
        :id="field.id"
        :type="field.type ?? 'text'"
        :value="field.value"
        :checked="field.type === 'checkbox' && !!field.value"
        :readonly="field.readonly || field.locked"
        :disabled="field.disabled || pending"
        :min="field.min"
        :max="field.max"
        :step="field.step ?? 'any'"
        :title="field.hint"
        :aria-invalid="!!(field.error || failure)"
        @change="change"
      />
      <button
        v-if="field.toggleLock"
        type="button"
        :aria-label="field.label + (field.locked ? ' · unlock' : ' · lock')"
        :aria-pressed="field.locked"
        :disabled="field.disabled"
        @click="field.toggleLock"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <rect x="5" y="9" width="10" height="8" rx="1" />
          <path :d="field.locked ? 'M7 9V6a3 3 0 0 1 6 0v3' : 'M7 9V6a3 3 0 0 1 6 0'" />
        </svg>
      </button>
    </div>
    <small v-if="field.error || failure" role="alert">{{ field.error || failure }}</small>
  </div>
</template>
<style scoped>
.nd-property-field {
  display: grid;
  grid-template-columns: minmax(85px, 1fr) minmax(80px, 1.2fr);
  align-items: center;
  gap: 8px;
  margin: 6px 0;
  font: inherit;
}
.nd-property-field > label {
  text-align: right;
  color: var(--nd-muted, #bbb);
  font-size: 12px;
}
.nd-property-control {
  display: flex;
  gap: 3px;
  min-width: 0;
}
.nd-property-control > input,
.nd-property-control > select,
.nd-property-control > textarea {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  background: var(--nd-input, #242424);
  color: var(--nd-text, #ddd);
  border: 1px solid var(--nd-border, #484848);
  border-radius: 3px;
  padding: 5px;
  font: inherit;
}
.nd-property-control > input[type='checkbox'] {
  width: auto;
}
.nd-property-control > button {
  background: transparent;
  color: inherit;
  border: 0;
  cursor: pointer;
}
.nd-property-field small {
  grid-column: 1/-1;
  color: #f6aaa0;
}
.nd-property-control :focus-visible {
  outline: 2px solid var(--nd-accent, #77a4cf);
}
</style>
