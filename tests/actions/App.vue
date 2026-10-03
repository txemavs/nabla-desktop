<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  ContextMenu, CommandToolbar, DesktopButton, MenuBar, createCommandRegistry, menuLabels,
} from '@nabla/desktop'
import '@nabla/desktop/style.css'
const registry = createCommandRegistry()
const target = ref('a')
const tool = ref('single')
const alive = ref(true)
const permission = ref(true)
const mounted = ref(true)
const spanish = ref(false)
const output = ref('')
const ownership = ref(0)
const failures = ref(0)
const actions = ref<InstanceType<typeof ContextMenu>>()
const context = computed(() => ({ target: { type: 'item', id: target.value } }))
const labels = computed(() => spanish.value ? menuLabels.es : menuLabels.en)
registry.register({
  id: 'inspect', label: 'Inspect', shortcut: 'i',
  enabled: current => alive.value && permission.value && current.target?.id === 'a',
  execute: current => { output.value = `inspect:${current.target?.id}` },
})
registry.register({ id: 'advanced', label: 'Advanced details', execute: () => {} })
registry.register({
  id: 'hidden', label: 'Only for B', visible: current => current.target?.id === 'b',
  execute: () => {},
})
registry.register({
  id: 'fail', label: 'Fail', execute: async () => { throw Error('Expected failure') },
})
registry.register({
  id: 'slow', label: 'Slow', execute: () => new Promise(resolve => setTimeout(resolve, 150)),
})
for (const id of ['single', 'multiple', 'none']) {
  registry.register({
    id, label: id, radioGroup: 'tools', checked: () => tool.value === id,
    execute: () => { tool.value = id },
  })
}
const items = [
  { command: 'inspect' }, { command: 'advanced' }, { command: 'hidden' },
  { label: 'Tools', children: ['single', 'multiple', 'none'].map(command => ({ command })) },
  { command: 'fail' }, { command: 'slow' },
]
function removeObject() {
  alive.value = false
  registry.notify()
}
function revokePermission() {
  permission.value = false
  registry.notify()
}
function cancelOpening() {
  void actions.value?.openAt(10, 10)
  actions.value?.close()
}
function openAtEdge() {
  void actions.value?.openAt(innerWidth - 1, innerHeight - 1)
}
let detach: (() => void) | undefined
onMounted(() => { detach = registry.attachShortcuts(document.body, () => context.value) })
onBeforeUnmount(() => detach?.())
</script>
<template>
  <MenuBar :registry="registry" :menus="[{ id: 'object', label: 'Object', items }]"
    :context="context" :labels="labels" />
  <CommandToolbar :registry="registry" :commands="['inspect', 'single', 'multiple', 'none', 'slow']"
    :context="context" label="Working actions" />
  <ContextMenu v-if="mounted" ref="actions" :registry="registry" :items="items"
    :context="context" :labels="labels" show-trigger inline
    @interaction-start="ownership++" @interaction-end="ownership--" @error="failures++">
    <button id="target">Object {{ target }}</button>
  </ContextMenu>
  <button id="retarget" @click="target = 'b'">Retarget</button>
  <button id="remove" @click="removeObject">Remove object</button>
  <button id="permission" @click="revokePermission">Revoke permission</button>
  <button id="unmount" @click="mounted = false">Unmount</button>
  <DesktopButton id="spanish" @click="spanish = true">Español</DesktopButton>
  <button id="edge" @click="openAtEdge">Edge</button>
  <button id="cancel-open" @click="cancelOpening">Cancel opening</button>
  <output id="result">{{ output }}</output>
  <output id="ownership">{{ ownership }}</output>
  <output id="errors">{{ failures }}</output>
</template>
