<script setup lang="ts">
import type { TreeNode } from '../core/forms'
import { computed, reactive, watch } from 'vue'
const props = defineProps<{ nodes: TreeNode[]; selected?: string; label: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const closed = reactive(new Set<string>())
const rows = computed(() => {
  const result: { node: TreeNode; depth: number }[] = []
  function visit(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      result.push({ node, depth })
      if (node.children?.length && !closed.has(node.id)) visit(node.children, depth + 1)
    }
  }
  visit(props.nodes, 0)
  return result
})
watch(
  () => [props.selected, props.nodes] as const,
  ([id]) => {
    function reveal(nodes: TreeNode[]): boolean {
      return nodes.some((node) => {
        if (node.id === id) return true
        if (node.children && reveal(node.children)) {
          closed.delete(node.id)
          return true
        }
        return false
      })
    }
    reveal(props.nodes)
  },
)
function activate(node: TreeNode) {
  if (node.disabled) return
  if (node.selectable !== false) emit('select', node.id)
  else if (node.children?.length) {
    if (closed.has(node.id)) closed.delete(node.id)
    else closed.add(node.id)
  }
}
function toggle(id: string) {
  if (closed.has(id)) closed.delete(id)
  else closed.add(id)
}
function key(event: KeyboardEvent, index: number) {
  const row = rows.value[index]
  let next = index
  if (event.key === 'ArrowDown') next = Math.min(rows.value.length - 1, index + 1)
  else if (event.key === 'ArrowUp') next = Math.max(0, index - 1)
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = rows.value.length - 1
  else if (event.key === 'ArrowRight') {
    closed.delete(row.node.id)
    return
  } else if (event.key === 'ArrowLeft') {
    closed.add(row.node.id)
    return
  } else return
  event.preventDefault()
  ;((event.currentTarget as HTMLElement).parentElement?.children[next] as HTMLElement)?.focus()
}
</script>
<template>
  <div class="nd-tree" role="tree" :aria-label="label">
    <button
      v-for="(row, index) in rows"
      :key="row.node.id"
      type="button"
      role="treeitem"
      :data-node-id="row.node.id"
      :aria-level="row.depth + 1"
      :aria-selected="row.node.id === selected"
      :aria-expanded="row.node.children?.length ? !closed.has(row.node.id) : undefined"
      :disabled="row.node.disabled"
      :style="{ paddingLeft: 10 + row.depth * 16 + 'px' }"
      @click="activate(row.node)"
      @keydown="key($event, index)"
    >
      <span
        class="nd-tree-icon"
        @click.stop="row.node.children?.length ? toggle(row.node.id) : activate(row.node)"
      >
        <span
          v-if="row.node.children?.length"
          class="nd-tree-triangle"
          :class="{ expanded: !closed.has(row.node.id) }"
          aria-hidden="true"
        ></span> </span
      ><span>{{ row.node.label }}</span>
    </button>
  </div>
</template>
<style scoped>
.nd-tree {
  overflow: auto;
  min-height: 0;
}
.nd-tree > button {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  text-align: left;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--nd-text, #ddd);
  padding: 7px 8px;
  font: inherit;
}
.nd-tree > button:hover {
  background: var(--nd-header, #393939);
}
.nd-tree > button[aria-selected='true'] {
  background: var(--nd-selection, #38516a);
}
.nd-tree-icon {
  width: 14px;
  flex: none;
}
.nd-tree > button:focus-visible {
  outline: 2px solid var(--nd-accent, #77a4cf);
  outline-offset: -2px;
}
</style>

<style scoped>
.nd-tree-triangle {
  display: inline-block;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 5px solid currentColor;
  transform-origin: 2px 4px;
}
.nd-tree-triangle.expanded {
  transform: rotate(90deg);
}
.nd-tree-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 16px;
}
</style>
