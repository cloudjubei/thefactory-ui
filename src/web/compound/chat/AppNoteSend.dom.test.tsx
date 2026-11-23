import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import ChatInput from './ChatInput'
import { useChatComposer } from '../../../headless/hooks/useChatComposer'
import type { AppNote } from '../../../headless/utils/appNotesTypes'
import type { ChatDraft } from '../../../headless/utils/chatDraftTypes'

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

const draftHarness = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const state: { draft: ChatDraft } = {
    draft: { text: '', attachments: [], pending: [], paused: false },
  }
  const sendMessage = vi.fn(async () => false)
  const uploads = {
    subscribe: () => () => {},
    getUploads: () => [],
    attach: () => {},
    stop: () => {},
    dismiss: () => {},
    retry: () => {},
  }
  return { listeners, state, sendMessage, uploads }
})

vi.mock('../../../headless/contexts/createChatsContext', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../headless/contexts/createChatsContext')>()
  return {
    ...actual,
    useChats: () =>
      ({
        getDraftState: () => draftHarness.state.draft,
        updateDraftState: (_ctx: unknown, fn: (prev: ChatDraft) => ChatDraft) => {
          const next = fn(draftHarness.state.draft)
          if (next === draftHarness.state.draft) return
          draftHarness.state.draft = next
          for (const listener of draftHarness.listeners) listener()
        },
        subscribeDraft: (_ctx: unknown, listener: () => void) => {
          draftHarness.listeners.add(listener)
          return () => {
            draftHarness.listeners.delete(listener)
          }
        },
        sendMessage: draftHarness.sendMessage,
        getChat: () => undefined,
        attachmentUploads: { forChat: () => draftHarness.uploads },
      }) as unknown as ReturnType<typeof actual.useChats>,
  }
})

const picks: AppNote[] = [
  {
    id: 'a',
    projectId: 'p',
    comment: 'Change this',
    targets: [{ kind: 'element', selector: '#a', outerHtml: '<p id="a">A</p>' }],
  },
]

describe('App notes send', () => {
  it('holds note-only drafts while busy even when text queueing is enabled', async () => {
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
          appNotes={picks}
          onChangeAppNotes={change}
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
    const renderDraft = (appNotes: AppNote[]) =>
      root.render(
        <ChatInput
          value=""
          onChange={() => {}}
          onSend={send}
          appNotes={appNotes}
          onChangeAppNotes={change}
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
    expect(send).toHaveBeenCalledWith('', [], { reason: 'user', appNotes: submitted })
    expect(change).toHaveBeenLastCalledWith([edited, added])
    await act(async () => root.unmount())
  })
  it('sends note-only context without flattening it and clears after success', async () => {
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
          appNotes={picks}
          onChangeAppNotes={change}
          clearOnSend
        />,
      ),
    )
    await act(async () =>
      rootNode
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    )
    expect(send).toHaveBeenCalledWith('', [], { reason: 'user', appNotes: picks })
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
          appNotes={picks}
          onChangeAppNotes={change}
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
          appNotes={picks}
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

  it('keeps notes when composer.send returns false and clearOnSend is set', async () => {
    let release!: (delivered: boolean) => void
    draftHarness.listeners.clear()
    draftHarness.sendMessage.mockReset()
    draftHarness.sendMessage.mockImplementation(
      () =>
        new Promise<boolean>((done) => {
          release = done
        }),
    )
    const note = picks[0]!
    draftHarness.state.draft = {
      text: 'Look at the renewal date.',
      attachments: [],
      appNotes: [note],
      pending: [],
      paused: false,
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    function Wired() {
      const composer = useChatComposer({ type: 'PROJECT', projectId: 'p1' })
      return (
        <ChatInput
          value={composer.text}
          onChange={composer.setText}
          onSend={composer.send}
          appNotes={composer.appNotes}
          onChangeAppNotes={composer.setAppNotes}
          attachments={composer.attachments}
          onChangeAttachments={composer.setAttachments}
          clearOnSend
        />
      )
    }
    await act(async () => {
      root.render(<Wired />)
    })
    expect(host.querySelector('[aria-label="Comment on app selection 1"]')).not.toBeNull()
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(draftHarness.sendMessage).toHaveBeenCalled()
    await act(async () => {
      release(false)
    })
    expect(draftHarness.state.draft.appNotes).toEqual([note])
    expect(host.querySelector('[aria-label="Comment on app selection 1"]')).not.toBeNull()
    await act(async () => root.unmount())
  })
})
