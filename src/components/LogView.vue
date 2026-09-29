<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LogEntry } from '../core/forms'
const props = defineProps<{
  entries: LogEntry[]
  labels?: {
    all: string
    info: string
    warning: string
    error: string
    clear: string
    filter: string
    log: string
  }
}>()
const emit = defineEmits<{ clear: [] }>()
const text = computed(
  () =>
    props.labels ?? {
      all: 'All activity',
      info: 'Information',
      warning: 'Warnings',
      error: 'Errors',
      clear: 'Clear',
      filter: 'Filter messages',
      log: 'Activity log',
    },
)
const filter = ref('all'),
  visible = computed(() =>
    props.entries.filter((e) => filter.value === 'all' || e.level === filter.value),
  )
</script>
<template>
  <section class="nd-log">
    <div class="nd-log-tools">
      <select v-model="filter" :aria-label="text.filter">
        <option value="all">{{ text.all }}</option>
        <option value="info">{{ text.info }}</option>
        <option value="warning">{{ text.warning }}</option>
        <option value="error">{{ text.error }}</option></select
      ><button @click="emit('clear')">{{ text.clear }}</button>
    </div>
    <div role="log" :aria-label="text.log">
      <div v-for="entry in visible" :key="entry.id" :class="'nd-log-' + entry.level">
        <time>{{ entry.time }}</time> {{ entry.message }}
      </div>
    </div>
  </section>
</template>
<style scoped>
.nd-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  background: var(--nd-surface, #262626);
  color: var(--nd-text, #ddd);
}
.nd-log-tools {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}
.nd-log [role='log'] {
  overflow: auto;
  font:
    12px/1.6 ui-monospace,
    monospace;
}
.nd-log time {
  color: var(--nd-muted, #888);
  margin-right: 10px;
}
.nd-log-error {
  color: #e6a39a;
}
.nd-log-warning {
  color: #d7be8a;
}
.nd-log select,
.nd-log button {
  font: inherit;
  background: var(--nd-header, #333);
  color: inherit;
  border: 1px solid var(--nd-border, #484848);
  border-radius: 3px;
}
</style>
