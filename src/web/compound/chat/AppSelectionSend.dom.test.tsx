import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import ChatInput from './ChatInput'
import type { AppSelection } from '../../../headless/utils/appSelections'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  callback(0)
  return 0
})
vi.mock('../files/FileMentionsTextarea', () => ({
  default: () => <textarea aria-label="Message input" />,
}))
vi.mock('../../primitives/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))

const picks: AppSelection[] = [
  { id: 'a', projectId: 'p', selector: '#a', outerHtml: '<p id="a">A</p>', comment: 'Change this' },
]

describe('App selections send', () => {
  it('holds selection-only drafts while busy even when text queueing is enabled', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const send = vi.fn()
    const change = vi.fn()
    await act(async () =>
      root.render(
        <ChatInput
          value=""
          onChange={() => {}}
          onSend={send}
          appSelections={picks}
          onChangeAppSelections={change}
          isThinking
          queueWhileThinking
        />,
      ),
    )
    expect(host.querySelector('[aria-label="Add to pending messages"]')).toBeNull()
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(send).not.toHaveBeenCalled()
    expect(change).not.toHaveBeenCalled()
    expect(host.querySelector('[aria-label="Comment on app selection 1"]')).not.toBeNull()
    await act(async () => root.unmount())
  })

  it('preserves picks and edits made while an asynchronous send is pending', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    let resolve!: () => void
    const send = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )
    const change = vi.fn()
    const renderDraft = (appSelections: AppSelection[]) =>
      root.render(
        <ChatInput
          value=""
          onChange={() => {}}
          onSend={send}
          appSelections={appSelections}
          onChangeAppSelections={change}
          clearOnSend
        />,
      )
    const unchanged = { ...picks[0], id: 'unchanged' }
    const removed = { ...picks[0], id: 'removed' }
    const submitted = [picks[0], unchanged, removed]
    await act(async () => renderDraft(submitted))
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(change).not.toHaveBeenCalled()
    const edited = { ...picks[0], comment: 'Edited during send' }
    const added = { ...picks[0], id: 'new', comment: 'New pick during send' }
    await act(async () => renderDraft([edited, unchanged, added]))
    await act(async () => resolve())
    expect(send).toHaveBeenCalledWith('', [], { reason: 'user', appSelections: submitted })
    expect(change).toHaveBeenLastCalledWith([edited, added])
    await act(async () => root.unmount())
  })
  it('sends selection-only context without flattening it and clears after success', async () => {
    const rootNode = document.createElement('div')
    const root = createRoot(rootNode)
    const send = vi.fn()
    const change = vi.fn()
    await act(async () =>
      root.render(
        <ChatInput
          value=""
          onChange={() => {}}
          onSend={send}
          appSelections={picks}
          onChangeAppSelections={change}
          clearOnSend
        />,
      ),
    )
    await act(async () =>
      rootNode
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    expect(send).toHaveBeenCalledWith('', [], { reason: 'user', appSelections: picks })
    expect(change).toHaveBeenCalledWith([])
    await act(async () => root.unmount())
  })
  it('retains context after rejection and refuses to discard it into the text-only busy queue', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const send = vi.fn().mockRejectedValue(new Error('offline'))
    const change = vi.fn()
    await act(async () =>
      root.render(
        <ChatInput
          value=""
          onChange={() => {}}
          onSend={send}
          appSelections={picks}
          onChangeAppSelections={change}
          clearOnSend
        />,
      ),
    )
    await act(async () =>
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    expect(change).not.toHaveBeenCalled()
    expect(send).toHaveBeenCalledOnce()
    await act(async () =>
      root.render(
        <ChatInput
          value=""
          onChange={() => {}}
          onSend={send}
          appSelections={picks}
          isThinking
          queueWhileThinking
        />,
      ),
    )
    await act(async () =>
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    expect(send).toHaveBeenCalledOnce()
    await act(async () => root.unmount())
  })
})
