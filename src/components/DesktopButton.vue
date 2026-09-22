<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    pressed?: boolean
    primary?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { type: 'button' },
)
</script>
<template>
  <button
    class="nd-button"
    :class="{ 'nd-primary': primary }"
    :type="type"
    :aria-label="label"
    :aria-pressed="pressed"
  >
    <slot />
  </button>
</template>
<style scoped>
.nd-button {
  font: inherit;
  color: var(--nd-text, #eee);
  background: var(--nd-header, #2d2d2d);
  border: 1px solid var(--nd-border, #555);
  border-radius: var(--nd-radius, 4px);
  padding: var(--nd-control-padding, 7px 12px);
  cursor: pointer;
  min-height: 32px;
}
.nd-button:hover {
  background: var(--nd-hover, #353535);
}
.nd-button.nd-primary {
  border-color: var(--nd-accent, #529ddd);
}
.nd-button:focus-visible {
  outline: 2px solid var(--nd-accent, #529ddd);
  outline-offset: 2px;
}
.nd-button:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
