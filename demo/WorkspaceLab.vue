<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'
import {
  createWorkspace,
  WorkspaceHost,
  DesktopButton,
  DesktopDialog,
  SettingsGroup,
  StatusBar,
  createCommandRegistry,
  type LayoutStorage,
} from '@nabla/desktop'
import World from './World.vue'
const props = defineProps<{ shown: boolean }>()
function markClean() {
  dirty.value = false
  message.value = 'Documento marcado sin cambios (demo)'
}
const workspace = createWorkspace(),
  commands = createCommandRegistry()
const height = ref(90),
  text = ref('Documento compartido entre pestañas y ventanas.'),
  dirty = ref(false),
  confirming = ref(false),
  compact = ref(false),
  message = ref('Distribución de trabajo preparada'),
  worldOnly = ref(false)
let resolveClose: ((value: boolean) => void) | undefined
const unregister = [
  workspace.register({ id: 'scene', title: 'Mundo' }),
  workspace.register({ id: 'properties', title: 'Propiedades' }),
  workspace.register({
    id: 'notes',
    title: 'Documento',
    dirty: () => dirty.value,
    beforeClose: () => {
      if (!dirty.value) return true
      confirming.value = true
      return new Promise<boolean>((resolve) => {
        resolveClose = resolve
      })
    },
  }),
  workspace.register({ id: 'activity', title: 'Actividad' }),
]
function decide(value: boolean) {
  confirming.value = false
  resolveClose?.(value)
  resolveClose = undefined
  if (value) dirty.value = false
}
watch(confirming, (value) => {
  if (!value && resolveClose) decide(false)
})
watch(dirty, () => workspace.notify())
function reset() {
  workspace.restore({
    version: 1,
    active: 'scene',
    root: {
      kind: 'split',
      id: 'main',
      axis: 'horizontal',
      ratio: 0.7,
      first: { kind: 'tabs', id: 'main-view', tabs: ['scene', 'notes'], active: 'scene' },
      second: {
        kind: 'split',
        id: 'side',
        axis: 'vertical',
        ratio: 0.6,
        first: { kind: 'tabs', id: 'inspector', tabs: ['properties'], active: 'properties' },
        second: { kind: 'tabs', id: 'log', tabs: ['activity'], active: 'activity' },
      },
    },
    floating: [],
  })
  message.value = 'Distribución restablecida'
  worldOnly.value = false
}
reset()
const storage: LayoutStorage = {
  load: () => {
    const raw = localStorage.getItem('nabla-desktop.workspace.v1')
    if (!raw) throw new Error('Todavía no hay una distribución guardada')
    return JSON.parse(raw)
  },
  save: (value) => localStorage.setItem('nabla-desktop.workspace.v1', JSON.stringify(value)),
}
async function save() {
  try {
    await workspace.save(storage)
    message.value = 'Distribución guardada en este navegador'
  } catch (e) {
    message.value = String(e)
  }
}
async function load() {
  try {
    await workspace.load(storage)
    message.value = 'Distribución recuperada'
    worldOnly.value = false
  } catch (e) {
    message.value = `No se cambió la distribución: ${String(e)}`
  }
}
let previous: ReturnType<typeof workspace.snapshot> | undefined
function immersive() {
  if (worldOnly.value && previous) {
    workspace.restore(previous)
    worldOnly.value = false
  } else {
    previous = workspace.snapshot()
    workspace.restore({
      version: 1,
      root: { kind: 'tabs', id: 'immersive', tabs: ['scene'], active: 'scene' },
      floating: [],
      active: 'scene',
    })
    worldOnly.value = true
  }
}
onBeforeUnmount(() => {
  decide(false)
  unregister.forEach((fn) => fn())
})
</script>
<template>
  <section class="workspace-lab">
    <div class="workspace-intro">
      <div>
        <p class="eyebrow">FASE 3 · ESPACIO DE TRABAJO</p>
        <h1>Un contenido. Muchas formas de trabajar.</h1>
        <p>
          Arrastra las pestañas al centro o a los bordes. Usa las flechas para dividir, ↗ para
          flotar y ⠿ para mover. Los separadores y controles también admiten el teclado.
        </p>
      </div>
    </div>
    <div class="workspace-tools">
      <DesktopButton @click="save">Guardar distribución</DesktopButton
      ><DesktopButton @click="load">Recuperar distribución</DesktopButton
      ><DesktopButton @click="reset">Restablecer paneles</DesktopButton
      ><DesktopButton :pressed="worldOnly" @click="immersive">Solo mundo</DesktopButton
      ><DesktopButton @click="workspace.open('notes')">Abrir documento</DesktopButton
      ><label><input v-model="compact" type="checkbox" /> Espacio pequeño</label>
    </div>
    <div class="workspace-lab-host" :class="{ compact }">
      <WorkspaceHost
        :workspace="workspace"
        :labels="{
          float: 'Hacer flotante',
          dock: 'Acoplar panel',
          close: 'Cerrar panel',
          resize: 'Redimensionar panel',
          move: 'Mover panel',
          left: 'Dividir a la izquierda',
          right: 'Dividir a la derecha',
          top: 'Dividir arriba',
          bottom: 'Dividir abajo',
          group: 'Pestañas del panel',
          moveTab: 'Mover pestaña a…',
          modified: 'Con cambios',
        }"
        @error="message = String($event)"
        v-slot="{ panel, visible, active }"
      >
        <World
          v-if="panel.id === 'scene'"
          color="#529ddd"
          :height="height"
          :grid="true"
          :active="visible && props.shown"
          :focused="active && props.shown"
          @select="workspace.open('properties')"
        />
        <div v-else-if="panel.id === 'properties'" class="content">
          <h2>Propiedades</h2>
          <SettingsGroup label="Edificio" open
            ><label for="workspace-height">Altura {{ height }} m</label
            ><input
              id="workspace-height"
              type="range"
              min="30"
              max="150"
              v-model.number="height" /></SettingsGroup
          ><SettingsGroup label="Aspecto"
            ><p>El contenido sigue siendo propiedad de la aplicación.</p></SettingsGroup
          >
        </div>
        <div v-else-if="panel.id === 'notes'" class="content">
          <h2>Documento</h2>
          <textarea
            aria-label="Documento del espacio de trabajo"
            v-model="text"
            @input="dirty = true"
          /><DesktopButton @click="markClean">Marcar sin cambios</DesktopButton>
          <p class="hint">
            Cerrar con cambios pide confirmación. Guardar la distribución no guarda documentos.
          </p>
        </div>
        <div v-else class="content">
          <h2>Actividad</h2>
          <p>{{ message }}</p>
          <p class="hint">
            El mundo conserva su lienzo al acoplar, flotar y cambiar de distribución.
          </p>
        </div>
      </WorkspaceHost>
    </div>
    <StatusBar label="Estado del espacio de trabajo">{{ message }}</StatusBar>
    <DesktopDialog
      :open="confirming"
      title="Cerrar documento con cambios"
      close-label="Cancelar cierre"
      :registry="commands"
      @update:open="confirming = $event"
      ><p>El documento tiene cambios. ¿Quieres cerrar este panel?</p>
      <div class="workspace-tools">
        <DesktopButton @click="decide(false)">Seguir editando</DesktopButton
        ><DesktopButton primary @click="decide(true)">Cerrar de todos modos</DesktopButton>
      </div></DesktopDialog
    >
  </section>
</template>
<style scoped>
.workspace-lab {
  padding: 24px;
  background: var(--nd-surface, #17191c);
  color: var(--nd-text, #ddd);
}
h1 {
  font-size: 26px;
  margin: 8px 0;
}
.workspace-intro {
  max-width: 850px;
  margin-bottom: 16px;
}
.workspace-intro p {
  line-height: 1.5;
}
.workspace-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}
.workspace-lab-host {
  height: 620px;
  width: 100%;
  border: 1px solid var(--nd-border, #444);
}
.workspace-lab-host.compact {
  width: min(440px, 100%);
  height: 410px;
}
textarea {
  box-sizing: border-box;
  width: 100%;
  height: 180px;
  background: var(--nd-header, #222);
  color: inherit;
  border: 1px solid var(--nd-border, #555);
  padding: 10px;
  font: inherit;
}
.content {
  height: 100%;
  box-sizing: border-box;
}
</style>
