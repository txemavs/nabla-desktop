import type { ContentFactory } from '@nabla/desktop/core'
/** Ordinary DOM/canvas code: no Vue, Pinia or Desktop window state. */
export function createCanvasContent(
  read: () => { height: number; color: string; grid: boolean },
  onSelect: () => void,
): ContentFactory {
  return (element) => {
    const canvas = document.createElement('canvas')
    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', 'Vista de prueba enlazada con Propiedades')
    element.append(canvas)
    let visible = false
    let frame = 0
    let rotation = 0
    let previous = 0
    let hit = { x: 0, y: 0, width: 0, height: 0 }
    function draw(time: number) {
      if (!visible) return
      const el = canvas
      const ctx = el.getContext('2d')!
      const width = el.clientWidth,
        height = el.clientHeight
      const ratio = Math.min(devicePixelRatio, 2)
      if (el.width !== Math.round(width * ratio) || el.height !== Math.round(height * ratio)) {
        el.width = Math.round(width * ratio)
        el.height = Math.round(height * ratio)
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.fillStyle = '#151a20'
      ctx.fillRect(0, 0, width, height)
      if (read().grid) {
        ctx.strokeStyle = '#283443'
        ctx.lineWidth = 1
        for (let x = -height; x < width + height; x += 45) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x + height, height)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x - height, height)
          ctx.stroke()
        }
      }
      rotation += Math.min(previous ? time - previous : 0, 50) * 0.00015
      previous = time
      const x = width * 0.3,
        y = height * 0.64,
        w = Math.min(135, width * 0.23),
        d = w * 0.4,
        h = read().height * 1.3
      ctx.fillStyle = '#0008'
      ctx.beginPath()
      ctx.ellipse(x + 35, y + 10, w, 22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = read().color
      ctx.fillRect(x - w / 2, y - h, w, h)
      ctx.fillStyle = '#ffffff40'
      ctx.beginPath()
      ctx.moveTo(x - w / 2, y - h)
      ctx.lineTo(x - w / 2 + d, y - h - d)
      ctx.lineTo(x + w / 2 + d, y - h - d)
      ctx.lineTo(x + w / 2, y - h)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#0006'
      ctx.beginPath()
      ctx.moveTo(x + w / 2, y - h)
      ctx.lineTo(x + w / 2 + d, y - h - d)
      ctx.lineTo(x + w / 2 + d, y - d)
      ctx.lineTo(x + w / 2, y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#86c7ff'
      ctx.lineWidth = 2
      ctx.strokeRect(x - w / 2 - 4, y - h - 4, w + 8, h + 8)
      ctx.fillStyle = '#90caf9'
      ctx.beginPath()
      ctx.arc(x + Math.cos(rotation) * w * 1.7, y + Math.sin(rotation) * 30, 5, 0, Math.PI * 2)
      ctx.fill()
      hit = { x: x - w / 2 - 10, y: y - h - d, width: w + d + 20, height: h + d + 15 }
      el.dataset.height = String(read().height)
      el.dataset.color = read().color
      frame = requestAnimationFrame(draw)
    }
    function select(event: MouseEvent) {
      const r = canvas.getBoundingClientRect()
      const x = event.clientX - r.left,
        y = event.clientY - r.top
      if (x >= hit.x && x <= hit.x + hit.width && y >= hit.y && y <= hit.y + hit.height) onSelect()
    }

    canvas.addEventListener('click', select)
    return {
      resize() {
        if (visible && !frame) frame = requestAnimationFrame(draw)
      },
      setVisible(value) {
        visible = value
        cancelAnimationFrame(frame)
        frame = 0
        previous = 0
        if (value) frame = requestAnimationFrame(draw)
      },
      setActive(value) {
        canvas.dataset.active = String(value)
      },
      dispose() {
        visible = false
        cancelAnimationFrame(frame)
        canvas.removeEventListener('click', select)
        canvas.remove()
      },
    }
  }
}
