<script setup lang="ts">
defineProps<{ label: string; open?: boolean }>()
</script>
<template>
  <details class="nd-settings" :open="open">
    <summary>{{ label }}</summary>
    <div><slot /></div>
  </details>
</template>
<style scoped>
.nd-settings {
  border: 1px solid var(--nd-border, #444);
  border-radius: var(--nd-radius, 4px);
  margin: 8px 0;
  color: var(--nd-text, #eee);
  background: var(--nd-surface, #1e1e1e);
  font: inherit;
}
.nd-settings summary {
  padding: 10px;
  cursor: pointer;
  background: var(--nd-header, #2d2d2d);
}
.nd-settings > div {
  padding: 12px;
}
.nd-settings summary:focus-visible {
  outline: 2px solid var(--nd-accent, #529ddd);
  outline-offset: -2px;
}
</style>
