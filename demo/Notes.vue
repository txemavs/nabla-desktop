<script setup lang="ts">
import { ref } from 'vue'
const text = ref(
  'Escribe aquí. Minimiza, cierra y vuelve a abrir: esta nota conserva su contenido mientras siga abierta la demo.',
)
</script>
<template>
  <div class="content note">
    <p class="eyebrow">CONTENIDO CONSERVADO</p>
    <h2>Tu cuaderno</h2>
    <textarea aria-label="Nota de prueba" v-model="text" />
    <p class="hint">La recarga del navegador reinicia la demo.</p>
  </div>
</template>
