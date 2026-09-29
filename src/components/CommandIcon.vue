<script setup lang="ts">
defineProps<{ name: string }>()
const paths: Record<string, string> = {
  close: 'M6 6l12 12 M18 6 6 18',
  settings: 'M9 3h6l1 4 4 1v6l-4 1-1 5H9l-1-5-4-1V8l4-1Z M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  help: 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  copy: 'M8 8h12v13H8Z M16 8V3H3v13h5',
  trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  cursor: 'M12 2v20 M2 12h20 M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  target: 'M12 3v5 M12 16v5 M3 12h5 M16 12h5 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  move: 'M12 2v20 M2 12h20 M8 6l4-4 4 4 M8 18l4 4 4-4 M6 8l-4 4 4 4 M18 8l4 4-4 4',
  rotate: 'M4 10a8 8 0 1 1 2 8 M4 3v7h7',
  undo: 'M9 5 3 11l6 6 M3 11h11a6 6 0 0 1 6 6',
  redo: 'm15 5 6 6-6 6 M21 11H10a6 6 0 0 0-6 6',
  play: 'm8 4 12 8-12 8Z',
  stop: 'M5 5h14v14H5Z',
  select: 'M5 3v17l5-5 4 6 3-2-4-6h7Z',
  origin: 'm12 3 9 9-9 9-9-9Z',
  toCursor: 'M3 12h15 M13 7l5 5-5 5 M21 4v16',
}
</script>
<template>
  <svg
    v-if="paths[name]"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    aria-hidden="true"
  >
    <path :d="paths[name]" /></svg
  ><span v-else aria-hidden="true">{{ name }}</span>
</template>
