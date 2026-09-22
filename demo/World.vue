<script setup lang="ts">
import { ExternalContent } from '@nabla/desktop'
import { createCanvasContent } from './canvas-content'
const props = defineProps<{
  color: string
  height: number
  grid: boolean
  active: boolean
  focused?: boolean
}>()
const emit = defineEmits<{ select: [] }>()
const mount = createCanvasContent(
  () => props,
  () => emit('select'),
)
</script>
<template>
  <div class="world-view">
    <ExternalContent :mount="mount" :visible="active" :active="focused" />
    <div class="world-caption">
      <span class="eyebrow">CONTENIDO EXTERNO · SIN VUE</span>
      <h2>Un mundo, varias herramientas.</h2>
      <p>
        Cambia la altura y el color en Propiedades.<br />Haz clic en el bloque para abrir su panel.
      </p>
    </div>
    <div class="world-bottom">
      El lienzo se adapta a la ventana y pausa la animación al ocultarse.
    </div>
  </div>
</template>
