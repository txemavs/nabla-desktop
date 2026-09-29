<script setup lang="ts">
defineProps<{ tabs: { id: string; label: string }[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
function move(event: KeyboardEvent, index: number, tabs: { id: string; label: string }[]) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length
  emit('update:modelValue', tabs[next].id)
  ;((event.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement)?.focus()
}
</script>
<template>
  <div class="nd-sidebar-tabs">
    <nav role="tablist" aria-orientation="vertical">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.id"
        role="tab"
        :aria-selected="modelValue === tab.id"
        :tabindex="modelValue === tab.id ? 0 : -1"
        @click="emit('update:modelValue', tab.id)"
        @keydown="move($event, index, tabs)"
      >
        {{ tab.label }}
      </button>
    </nav>
    <section role="tabpanel"><slot :name="modelValue" /></section>
  </div>
</template>
<style scoped>
.nd-sidebar-tabs {
  display: flex;
  min-height: 0;
  height: 100%;
  color: var(--nd-text, #ddd);
}
nav {
  flex: 0 0 145px;
  padding: 8px 5px;
  background: var(--nd-surface, #292929);
  border-right: 1px solid var(--nd-border, #444);
}
nav button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 9px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
}
nav button[aria-selected='true'] {
  background: var(--nd-header, #444);
}
section {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 12px;
}
button:focus-visible {
  outline: 2px solid var(--nd-accent, #77a4cf);
}
</style>
