<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  useWindowsStore,
  WindowHost,
  type MaximizePolicy,
  MenuBar,
  CommandToolbar,
  ContextMenu,
  createCommandRegistry,
  type DesktopMenu,
} from '@nabla/desktop'
import World from './World.vue'
import Notes from './Notes.vue'
import WorkspaceLab from './WorkspaceLab.vue'
const workspaceMode = ref(false)
const desktop = useWindowsStore()
const shell = ref<HTMLElement | null>(null)
const theme = ref('dark')
const commands = createCommandRegistry()
const context = computed(() => ({ scope: desktop.activeWindowId ?? undefined }))
let unbind: (() => void) | undefined
const color = ref('#529ddd'),
  height = ref(90),
  grid = ref(true),
  compact = ref(false)
const events = ref<string[]>([])
let next = 1
const windows = computed(() => [...desktop.windows.values()])
const active = computed(() => desktop.windows.get(desktop.activeWindowId ?? ''))
function log(message: string) {
  events.value.unshift(message)
  events.value = events.value.slice(0, 12)
}
function reset() {
  desktop.clear()
  desktop.setMaximizePolicy('exclusive')
  compact.value = false
  color.value = '#529ddd'
  height.value = 90
  grid.value = true
  desktop.register('world', {
    title: 'Vista del mundo',
    x: 15,
    y: 15,
    width: 740,
    height: 525,
    keepAlive: true,
  })
  desktop.register('properties', { title: 'Propiedades', width: 285, height: 375, x: 470, y: 65 })
  desktop.register('notes', {
    title: 'Cuaderno',
    width: 350,
    height: 300,
    x: 65,
    y: 180,
    open: false,
    keepAlive: true,
  })
  events.value = ['Escritorio preparado']
}
reset()
function open(id: string) {
  desktop.openWindow(id)
  log(`Abrir: ${desktop.windows.get(id)?.title}`)
}
function temporary() {
  const id = `tool-${next++}`
  desktop.register(id, {
    title: `Ventana temporal ${next - 1}`,
    width: 300,
    height: 210,
    closeBehavior: 'dispose',
  })
  log('Creada una ventana temporal')
}
function policy(event: Event) {
  desktop.setMaximizePolicy((event.target as HTMLSelectElement).value as MaximizePolicy)
}
watch(
  () => desktop.activeWindowId,
  (id) => {
    if (id) log(`Foco: ${desktop.windows.get(id)?.title}`)
  },
)

commands.register({
  id: 'world',
  label: 'Vista del mundo',
  shortcut: 'Mod+1',
  execute: () => open('world'),
})
commands.register({
  id: 'notes',
  label: 'Cuaderno',
  shortcut: 'Mod+2',
  execute: () => open('notes'),
})
commands.register({ id: 'properties', label: 'Propiedades', execute: () => open('properties') })
commands.register({
  id: 'temporary',
  label: 'Nueva ventana',
  shortcut: 'Mod+Shift+n',
  execute: temporary,
})
commands.register({
  id: 'grid',
  label: 'Mostrar rejilla',
  shortcut: 'g',
  checked: () => grid.value,
  execute: () => {
    grid.value = !grid.value
  },
})
commands.register({
  id: 'maximize',
  label: 'Maximizar activa',
  enabled: () => !!active.value?.open,
  execute: () => {
    if (active.value) desktop.maximizeWindow(active.value.id)
  },
})
commands.register({ id: 'reset', label: 'Reiniciar demo', execute: reset })
const menus: DesktopMenu[] = [
  {
    id: 'file',
    label: 'Archivo',
    items: [
      { command: 'temporary' },
      { command: 'notes' },
      { separator: true },
      { command: 'reset' },
    ],
  },
  {
    id: 'view',
    label: 'Ver',
    items: [
      { command: 'world' },
      { command: 'properties' },
      { command: 'grid' },
      { command: 'maximize' },
      { label: 'Abrir herramienta', children: [{ command: 'notes' }, { command: 'temporary' }] },
    ],
  },
]
watch([grid, () => desktop.activeWindowId, () => active.value?.open], () => commands.notify())
onMounted(() => {
  unbind = commands.attachShortcuts(
    shell.value!,
    () => context.value,
    (error) => log(String(error)),
  )
})
onBeforeUnmount(() => unbind?.())
function menuStart() {
  if (document.pointerLockElement) void document.exitPointerLock()
  log('Menú abierto · atajos suspendidos')
}
</script>
<template>
  <div ref="shell" class="lab" :class="{ 'light-theme': theme === 'light' }" tabindex="-1">
    <header class="topbar">
      <a class="brand" href="./"><span>▽</span> Nabla <b>Desktop</b></a
      ><span class="pill">Laboratorio · Fase 4</span
      ><button class="reset" @click="workspaceMode = !workspaceMode">
        {{ workspaceMode ? 'Ventanas y menús' : 'Probar paneles y pestañas' }}</button
      ><button class="reset" @click="reset">Reiniciar demo</button>
    </header>
    <div v-show="!workspaceMode" class="demo-menubar">
      <MenuBar
        :registry="commands"
        :menus="menus"
        :context="context"
        @interaction-start="menuStart"
        @error="log(String($event))"
      /><CommandToolbar
        :registry="commands"
        :commands="['notes', 'grid']"
        :context="context"
        label="Herramientas"
      />
    </div>
    <div v-show="!workspaceMode" class="layout">
      <aside class="sidebar">
        <p class="eyebrow">ABRE Y PRUEBA</p>
        <h1>Tu espacio<br />de trabajo.</h1>
        <p class="intro">Ventanas reales, controles conectados y estado compartido.</p>
        <div class="launchers">
          <button @click="open('world')">
            ▧ <span>Vista del mundo<small>Lienzo externo sin Vue</small></span></button
          ><button @click="open('properties')">
            ☷ <span>Propiedades<small>Edita el bloque en directo</small></span></button
          ><button @click="open('notes')">
            ▤ <span>Cuaderno<small>Conserva lo que escribes</small></span></button
          ><button @click="temporary">
            ＋ <span>Ventana temporal<small>Se elimina al cerrar</small></span>
          </button>
        </div>
        <div class="settings">
          <label for="theme">Tema</label
          ><select id="theme" v-model="theme">
            <option value="dark">Gris Agency</option>
            <option value="light">Claro</option>
          </select>
          <label for="policy">Al maximizar</label
          ><select id="policy" :value="desktop.maximizePolicy" @change="policy">
            <option value="background">Mundo al fondo + herramientas</option>
            <option value="exclusive">Ventana maximizada al frente</option></select
          ><label class="check"
            ><input type="checkbox" v-model="compact" /> Contenedor pequeño</label
          >
        </div>
        <details>
          <summary>Qué puedes comprobar</summary>
          <p>
            Arrastra la cabecera o los bordes. Minimiza y recupera desde la barra inferior. Cierra
            el cuaderno y ábrelo otra vez.
          </p>
          <p>
            El selector cambia la política del escritorio. El contenedor pequeño prueba que las
            ventanas se ajusten al espacio disponible.
          </p>
        </details>
        <p class="scope">
          Las ventanas son de Desktop. Los controles y el lienzo son contenido de esta demo; los
          menús y atajos comparten comandos. Pestañas y docking llegarán en las siguientes fases.
        </p>
      </aside>
      <main class="main">
        <div class="workspace-heading">
          <div><span class="live-dot"></span> Escritorio interactivo</div>
          <span
            >{{ windows.filter((w) => w.open).length }} abiertas ·
            {{ active?.title ?? 'Sin foco' }}</span
          >
        </div>
        <div class="workspace" :class="{ compact }" data-testid="workspace">
          <ContextMenu
            :registry="commands"
            :items="[{ command: 'properties' }, { command: 'grid' }, { command: 'maximize' }]"
            :context="context"
            @interaction-start="menuStart"
            ><WindowHost :store="desktop" v-slot="{ window: win }">
              <World
                v-if="win.id === 'world'"
                :color="color"
                :height="height"
                :grid="grid"
                :active="win.open && !win.minimized && !workspaceMode"
                :focused="desktop.activeWindowId === win.id"
                @select="open('properties')"
              />
              <div v-else-if="win.id === 'properties'" class="content">
                <p class="eyebrow">BLOQUE SELECCIONADO</p>
                <h2>Edificio de prueba</h2>
                <label for="height"
                  >Altura <output>{{ height }} m</output></label
                ><input id="height" type="range" min="30" max="150" v-model.number="height" /><label
                  for="color"
                  >Color de fachada</label
                >
                <div class="color-row">
                  <input id="color" type="color" v-model="color" /><code>{{ color }}</code>
                </div>
                <label class="check"
                  ><input type="checkbox" v-model="grid" /> Mostrar rejilla</label
                >
                <p class="hint">Estos controles modifican la vista del mundo inmediatamente.</p>
              </div>
              <Notes v-else-if="win.id === 'notes'" />
              <div v-else class="content">
                <p class="eyebrow">VENTANA DESECHABLE</p>
                <h2>Una herramienta más</h2>
                <p>
                  Muévela, cámbiale el tamaño y ciérrala. Desaparecerá del registro y de la barra
                  inferior.
                </p>
                <button @click="desktop.closeWindow(win.id)">Cerrar y eliminar</button>
              </div>
            </WindowHost></ContextMenu
          >
        </div>
        <nav class="taskbar" aria-label="Ventanas">
          <button
            v-for="win in windows"
            :key="win.id"
            :class="{
              selected: desktop.activeWindowId === win.id,
              dim: !win.open || win.minimized,
            }"
            @click="open(win.id)"
          >
            {{ win.title }}
            <small>{{ !win.open ? 'cerrada' : win.minimized ? 'minimizada' : '' }}</small>
          </button>
        </nav>
        <section class="activity">
          <span class="eyebrow">ACTIVIDAD REAL</span><output>{{ events[0] }}</output>
          <details>
            <summary>Ver historial</summary>
            <ol>
              <li v-for="(event, i) in events" :key="i">{{ event }}</li>
            </ol>
          </details>
        </section>
      </main>
    </div>
    <WorkspaceLab v-show="workspaceMode" :shown="workspaceMode" />
    <footer>
      Arrastra · Redimensiona · Minimiza · Reabre
      <span>{{
        workspaceMode
          ? 'Guarda la distribución con el botón superior. El contenido no se guarda.'
          : 'Estado local de esta sesión. No se guarda al recargar.'
      }}</span>
    </footer>
  </div>
</template>
