import { describe, expect, it, vi } from 'vitest'
import { attachOutsideDismiss } from './tooltipHelpers'

function keydown(key: string): Event {
  return Object.assign(new Event('keydown'), { key })
}

function setup(inside = false) {
  const target = new EventTarget()
  const onDismiss = vi.fn()
  const isInside = vi.fn(() => inside)
  const detach = attachOutsideDismiss(target, { isInside, onDismiss })
  return { target, onDismiss, isInside, detach }
}

describe('attachOutsideDismiss', () => {
  it('dismisses on a mousedown outside', () => {
    const { target, onDismiss, isInside } = setup(false)
    target.dispatchEvent(new Event('mousedown'))
    expect(isInside).toHaveBeenCalledWith(target)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps open on a mousedown inside', () => {
    const { target, onDismiss } = setup(true)
    target.dispatchEvent(new Event('mousedown'))
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('dismisses on Escape and ignores other keys', () => {
    const { target, onDismiss } = setup(true)
    target.dispatchEvent(keydown('Enter'))
    expect(onDismiss).not.toHaveBeenCalled()
    target.dispatchEvent(keydown('Escape'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('removes exactly the listeners it added', () => {
    const target = new EventTarget()
    const add = vi.spyOn(target, 'addEventListener')
    const remove = vi.spyOn(target, 'removeEventListener')
    const detach = attachOutsideDismiss(target, { isInside: () => false, onDismiss: () => {} })
    detach()
    expect(add.mock.calls.map((c) => c[0]).sort()).toEqual(['keydown', 'mousedown'])
    expect(remove.mock.calls.map((c) => [c[0], c[1]])).toEqual(
      expect.arrayContaining(add.mock.calls.map((c) => [c[0], c[1]])),
    )
    expect(remove).toHaveBeenCalledTimes(add.mock.calls.length)
  })

  it('stops listening once detached', () => {
    const { target, onDismiss, detach } = setup(false)
    detach()
    target.dispatchEvent(new Event('mousedown'))
    target.dispatchEvent(keydown('Escape'))
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('does not accumulate listeners across open/close cycles', () => {
    const target = new EventTarget()
    const onDismiss = vi.fn()
    for (let i = 0; i < 3; i += 1) {
      attachOutsideDismiss(target, { isInside: () => false, onDismiss })()
    }
    const detach = attachOutsideDismiss(target, { isInside: () => false, onDismiss })
    target.dispatchEvent(new Event('mousedown'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    detach()
  })
})
