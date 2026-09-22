import type { DetachedView } from '@nabla/desktop/core'
export interface InspectorState {
  height: number
  text: string
}
export type InspectorAction = { type: 'height'; value: number } | { type: 'text'; value: string }
/** This view owns DOM only. The original application owns documents and world state. */
export const inspector: DetachedView<InspectorState, InspectorAction> = {
  title: 'Nabla · Inspector independiente',
  width: 540,
  height: 640,
  mount(element, bridge) {
    const doc = element.ownerDocument
    const style = doc.createElement('style')
    style.textContent = `body{margin:0;background:#191b1e;color:#ddd;font:16px system-ui,sans-serif}main{padding:24px}h1{font-size:24px}label{display:block;margin:20px 0 8px}textarea{box-sizing:border-box;width:100%;height:200px;background:#25282c;border:1px solid #555;color:inherit;font:inherit;padding:12px}input{width:100%}button{padding:10px 16px;background:#30353b;color:#eee;border:1px solid #666;border-radius:4px;font:inherit;margin-top:20px}p{line-height:1.5;color:#aaa}:focus-visible{outline:2px solid #529ddd}`
    doc.head.append(style)
    const title = doc.createElement('h1')
    title.textContent = 'Inspector independiente'
    const hint = doc.createElement('p')
    hint.textContent =
      'Esta ventana controla el mismo mundo y documento. Al cerrarla, todo sigue en la ventana principal.'
    const label = doc.createElement('label')
    label.htmlFor = 'detached-height'
    label.textContent = 'Altura del edificio'
    const range = doc.createElement('input')
    range.id = 'detached-height'
    range.type = 'range'
    range.min = '30'
    range.max = '150'
    const output = doc.createElement('output')
    output.setAttribute('aria-live', 'polite')
    const docLabel = doc.createElement('label')
    docLabel.htmlFor = 'detached-document'
    docLabel.textContent = 'Documento compartido'
    const text = doc.createElement('textarea')
    text.id = 'detached-document'
    const back = doc.createElement('button')
    back.textContent = 'Volver a la ventana principal'
    const onHeight = () => void bridge.dispatch({ type: 'height', value: Number(range.value) })
    const onText = () => void bridge.dispatch({ type: 'text', value: text.value })
    const onReturn = () => bridge.returnToOwner()
    range.addEventListener('input', onHeight)
    text.addEventListener('input', onText)
    back.addEventListener('click', onReturn)
    element.append(title, hint, label, range, output, docLabel, text, back)
    return {
      update(state) {
        if (range.value !== String(state.height)) range.value = String(state.height)
        output.textContent = `${state.height} m`
        if (text.value !== state.text) text.value = state.text
      },
      setActive(value) {
        element.dataset.active = String(value)
      },
      setVisible(value) {
        element.dataset.visible = String(value)
      },
      dispose() {
        range.removeEventListener('input', onHeight)
        text.removeEventListener('input', onText)
        back.removeEventListener('click', onReturn)
        element.replaceChildren()
        style.remove()
      },
    }
  },
}
