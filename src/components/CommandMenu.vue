<script setup lang="ts">
import { ref, onBeforeUnmount, computed, nextTick } from 'vue'
import type { CommandRegistry, CommandContext, MenuItem } from '../core/commands'
const props = defineProps<{
  registry: CommandRegistry
  items: MenuItem[]
  context?: CommandContext
}>()
const emit = defineEmits<{ close: [all?: boolean]; error: [error: unknown] }>()
const revision = ref(0),
  opened = ref<number | null>(null),
  root = ref<HTMLElement | null>(null)
const stop = props.registry.subscribe(() => revision.value++)
onBeforeUnmount(stop)
const items = computed(() => {
  void revision.value
  return props.items.filter(
    (i) =>
      !('command' in i) ||
      (props.registry.get(i.command)?.visible?.() ?? !!props.registry.get(i.command)),
  )
})
function command(id: string) {
  void revision.value
  return props.registry.get(id)
}
function enabled(id: string) {
  void revision.value
  return props.registry.available(id, props.context)
}
async function run(id: string) {
  try {
    const pending = props.registry.execute(id, props.context)
    emit('close', true)
    await pending
  } catch (error) {
    emit('error', error)
  }
}
function focusFirst() {
  root.value?.querySelector<HTMLButtonElement>(':scope > li > button:not(:disabled)')?.focus()
}
defineExpose({ focusFirst })
async function submenu(index: number) {
  opened.value = index
  await nextTick()
  root.value
    ?.querySelector<HTMLElement>(
      `:scope > li:nth-child(${index + 1}) .desktop-command-menu button:not(:disabled)`,
    )
    ?.focus()
}
function key(event: KeyboardEvent) {
  if ((event.target as HTMLElement).closest('[role="menu"]') !== root.value) return
  const buttons = [
    ...root.value!.querySelectorAll<HTMLButtonElement>(':scope > li > button:not(:disabled)'),
  ]
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    event.stopPropagation()
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length
    buttons[next]?.focus()
  }
  if (event.key === 'Escape' || event.key === 'ArrowLeft') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  }
  if (event.key === 'ArrowRight') {
    const item = (document.activeElement as HTMLElement)?.closest('li')
    const n = item ? [...root.value!.children].indexOf(item) : -1
    if (n >= 0 && 'children' in items.value[n]) {
      event.preventDefault()
      event.stopPropagation()
      void submenu(n)
    }
  }
}
function closeChild(index: number) {
  opened.value = null
  ;(root.value?.children[index]?.querySelector('button') as HTMLButtonElement)?.focus()
}
</script>
<template>
  <ul ref="root" role="menu" class="desktop-command-menu" @keydown="key">
    <li v-for="(item, index) in items" :key="index" role="none">
      <hr v-if="'separator' in item" role="separator" />
      <button
        v-else-if="'command' in item"
        :role="command(item.command)?.checked ? 'menuitemcheckbox' : 'menuitem'"
        :aria-checked="command(item.command)?.checked?.()"
        :disabled="!enabled(item.command)"
        @click="run(item.command)"
      >
        <span class="desktop-check">{{ command(item.command)?.checked?.() ? '✓' : '' }}</span
        ><span>{{ command(item.command)?.label }}</span
        ><kbd v-if="command(item.command)?.shortcut">{{ command(item.command)?.shortcut }}</kbd>
      </button>
      <template v-else
        ><button
          role="menuitem"
          aria-haspopup="menu"
          :aria-expanded="opened === index"
          @click="opened === index ? closeChild(index) : submenu(index)"
        >
          <span class="desktop-check" /><span>{{ item.label }}</span
          ><span class="desktop-chevron">›</span>
        </button>
        <div v-if="opened === index" class="desktop-submenu">
          <CommandMenu
            :registry="registry"
            :context="context"
            :items="item.children"
            @close="$event ? emit('close', true) : closeChild(index)"
            @error="emit('error', $event)"
          /></div
      ></template>
    </li>
  </ul>
</template>
