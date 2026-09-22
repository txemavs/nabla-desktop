import { createDetachedHost } from '@nabla/desktop/core'
let state = { value: 1 },
  listener
const errors = [],
  closed = []
let mounts = 0,
  disposes = 0,
  actions = 0
const host = createDetachedHost({
  maxWindows: 1,
  read: () => state,
  subscribe: (fn) => {
    listener = fn
    return () => {
      listener = undefined
    }
  },
  dispatch: (action) => {
    actions++
    state = { value: action.value }
    listener?.()
  },
  onError: (error) => errors.push(String(error)),
  onClose: (id, reason) => closed.push({ id, reason }),
})
const view = {
  title: 'Contract view',
  mount: (root, bridge) => {
    mounts++
    const doc = root.ownerDocument
    const output = doc.createElement('output')
    const input = doc.createElement('input')
    input.setAttribute('aria-label', 'Value')
    input.type = 'number'
    input.oninput = () => void bridge.dispatch({ value: Number(input.value) })
    root.append(output, input)
    window.detachedTest.lastBridge = bridge
    return {
      update: (s) => {
        output.textContent = String(s.value)
        input.value = String(s.value)
        s.value = 999
      },
      dispose: () => {
        disposes++
        root.replaceChildren()
      },
      resize: (w, h) => {
        root.dataset.size = `${w},${h}`
      },
    }
  },
}
window.detachedTest = {
  host,
  view,
  errors,
  closed,
  get mounts() {
    return mounts
  },
  get disposes() {
    return disposes
  },
  get actions() {
    return actions
  },
  get state() {
    return state
  },
  set: (value) => {
    state = { value }
    listener?.()
  },
  get subscribed() {
    return !!listener
  },
}
document.querySelector('#open').onclick = () => {
  window.detachedTest.result = host.open('view', view)
}
document.querySelector('#bad').onclick = () => {
  window.detachedTest.result = host.open('bad', {
    title: 'Broken',
    mount: () => ({
      update() {
        throw Error('broken')
      },
      dispose() {
        disposes++
      },
    }),
  })
}
