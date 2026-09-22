import { createApp, h, ref, onMounted, onUnmounted } from 'vue'
import { createPinia } from 'pinia'
import { defineWindowsStore, WindowHost, WorkspaceHost, ExternalContent } from '@nabla/desktop'
import '@nabla/desktop/style.css'
import { createWorkspace } from '@nabla/desktop/core'
const app = createApp({
  setup() {
    const store = defineWindowsStore('consumer')()
    store.setMaximizePolicy('background')
    const counts = {},
      disposed = {}
    store.register('world', {
      title: 'World',
      x: 20,
      y: 20,
      width: 280,
      height: 210,
      keepAlive: true,
    })
    store.register('tool', {
      title: 'Tools',
      x: 380,
      y: 70,
      width: 250,
      height: 200,
    })
    store.register('lazy', { title: 'Lazy', open: false, keepAlive: true })
    const Content = {
      props: ['id'],
      setup(props) {
        const value = ref('')
        onMounted(() => {
          counts[props.id] = (counts[props.id] ?? 0) + 1
        })
        onUnmounted(() => {
          disposed[props.id] = (disposed[props.id] ?? 0) + 1
        })
        return () =>
          h('textarea', {
            'aria-label': `${props.id} document`,
            value: value.value,
            onInput: (e) => {
              value.value = e.target.value
            },
          })
      },
    }
    const workspace = createWorkspace()
    workspace.register({ id: 'canvas', title: 'Native view' })
    workspace.register({ id: 'document', title: 'Vue document' })
    workspace.open('canvas')
    workspace.open('document')
    let nativeMounts = 0
    const mountNative = (element) => {
      const canvas = document.createElement('canvas')
      element.append(canvas)
      nativeMounts++
      return {
        resize: (w, h) => {
          canvas.width = w
          canvas.height = h
        },
        setVisible: (v) => {
          canvas.dataset.visible = String(v)
        },
        dispose: () => canvas.remove(),
      }
    }
    window.workspaceTest = {
      workspace,
      get mounts() {
        return nativeMounts
      },
    }
    window.desktopTest = { store, counts, disposed }
    return () => [
      h(
        'div',
        {
          id: 'packed-workspace',
          style: 'position:absolute;left:40px;top:650px;width:720px;height:420px',
        },
        [
          h(
            WorkspaceHost,
            { workspace },
            {
              default: ({ panel, visible, active }) =>
                panel.id === 'canvas'
                  ? h(ExternalContent, { mount: mountNative, visible, active })
                  : h(Content, { id: 'packed-doc' }),
            },
          ),
        ],
      ),
      h(
        'div',
        {
          id: 'container',
          style: 'margin:40px;width:720px;height:480px;border:2px solid red',
        },
        [
          h(
            WindowHost,
            { store, insets: { top: 24, left: 8, right: 8, bottom: 8 } },
            { default: ({ window }) => h(Content, { id: window.id }) },
          ),
        ],
      ),
    ]
  },
})
app.use(createPinia())
// Agency profile adds its UI framework without making it a Desktop dependency.
if (import.meta.env.VITE_AGENCY_PROFILE === '1') {
  const { createVuetify } = await import('vuetify')
  app.use(createVuetify())
}
app.mount('#app')
