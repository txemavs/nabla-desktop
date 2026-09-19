import { describe, it, expect } from 'vitest'
import { VERSION } from '../index'
import type { WindowState } from '../types'

describe('@nabla/desktop', () => {
  it('exports VERSION constant', () => {
    expect(VERSION).toBe('0.0.1')
  })

  it('WindowState type is usable', () => {
    const state: WindowState = {
      id: 'test-window',
      title: 'Test Window',
      x: 100,
      y: 100,
      width: 800,
      height: 600,
      minimized: false,
      maximized: false,
      focused: true,
      zIndex: 1,
    }

    expect(state.id).toBe('test-window')
    expect(state.minimized).toBe(false)
    expect(state.focused).toBe(true)
  })
})
