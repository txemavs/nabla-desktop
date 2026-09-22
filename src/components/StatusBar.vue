<script setup lang="ts">
defineProps<{ label?: string }>()
</script>
<template>
  <footer class="nd-status" role="status" :aria-label="label"><slot /></footer>
</template>
<style scoped>
.nd-status {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 10px;
  font: inherit;
  color: var(--nd-muted, #aaa);
  background: var(--nd-header, #2d2d2d);
  border-top: 1px solid var(--nd-border, #444);
}
</style>
