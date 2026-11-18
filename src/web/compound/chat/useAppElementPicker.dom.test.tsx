import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { useAppElementPicker } from '../../../headless/hooks/useAppElementPicker'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('App picker lifecycle', () => {
  it('pushes active state, accepts repeated picks only while active and cancels on unmount', async () => {
    const root = createRoot(document.createElement('div'))
    const send = vi.fn()
    const onPick = vi.fn()
    let picker: ReturnType<typeof useAppElementPicker>
    function Harness({ active }: { active: boolean }) {
      picker = useAppElementPicker({ active, mountKey: 'app', send, onPick })
      return null
    }
    await act(async () => root.render(<Harness active />))
    expect(send).toHaveBeenLastCalledWith({ type: 'overseer:pick.set', payload: { active: true } })
    const payload = { selector: '#x', outerHtml: '<p id="x">X</p>' }
    picker!.receive('overseer:pick.selected', payload)
    picker!.receive('overseer:pick.selected', payload)
    picker!.receive('overseer:pick.selected', {})
    expect(onPick).toHaveBeenCalledTimes(2)
    await act(async () => root.render(<Harness active={false} />))
    picker!.receive('overseer:pick.selected', payload)
    expect(onPick).toHaveBeenCalledTimes(2)
    await act(async () => root.unmount())
    expect(send).toHaveBeenLastCalledWith({ type: 'overseer:pick.set', payload: { active: false } })
  })
})
