import { useState, type ReactNode } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatInput from './ChatInput'
import type { AppNote } from '../../../headless/utils/appNotesTypes'

vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))
vi.mock('react-native', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  ScrollView: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Image: () => null,
  TextInput: ({
    value,
    onChangeText,
    accessibilityLabel,
  }: {
    value: string
    onChangeText: (value: string) => void
    accessibilityLabel: string
  }) => (
    <textarea
      aria-label={accessibilityLabel}
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
    />
  ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    disabled,
  }: {
    children?: ReactNode
    onPress?: () => void
    accessibilityLabel?: string
    disabled?: boolean
  }) => (
    <button aria-label={accessibilityLabel} onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
}))
vi.mock('../../icons', () => ({
  IconAttach: () => null,
  IconMic: () => null,
  IconSend: () => null,
}))
vi.mock('../files/FileMentionsTextarea', () => ({ default: () => null }))
vi.mock('../../primitives/Modal', () => ({ Modal: () => null }))
vi.mock('../../primitives/Button', () => ({ Button: () => null }))
vi.mock('./DictationWave', () => ({ default: () => null }))
vi.mock('./ChatUploadStrip', () => ({ default: () => null }))
vi.mock('./ChatVideoAttachment', () => ({ default: () => null }))
vi.mock('./VideoAttachmentCard', () => ({ default: () => null }))

afterEach(cleanup)

const pick: AppNote = {
  id: 'a',
  projectId: 'p',
  comment: 'Original',
  targets: [{ kind: 'element', selector: '#a', outerHtml: '<p>A</p>' }],
}

describe('native app notes send', () => {
  it('holds note-only drafts while busy even when text queueing is enabled', () => {
    const send = vi.fn()
    const change = vi.fn()
    const view = render(
      <ChatInput
        value=""
        onChange={() => {}}
        onSend={send}
        appNotes={[pick]}
        onChangeAppNotes={change}
        isThinking
        queueWhileThinking
      />,
    )
    const button = view.getByLabelText('Add to pending messages') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(send).not.toHaveBeenCalled()
    expect(change).not.toHaveBeenCalled()
    expect(view.getByLabelText('Comment on app selection 1')).toBeTruthy()
  })

  it('edits and removes real cards before forwarding note-only context', async () => {
    const send = vi.fn()
    const show = vi.fn()
    function Composer() {
      const [notes, setNotes] = useState<AppNote[]>([
        pick,
        { ...pick, id: 'b', targets: [{ kind: 'element', selector: '#b', outerHtml: '<p>B</p>' }] },
      ])
      return (
        <ChatInput
          value=""
          onChange={() => {}}
          onSend={send}
          appNotes={notes}
          onChangeAppNotes={setNotes}
          onShowApp={show}
        />
      )
    }
    const view = render(<Composer />)
    fireEvent.click(view.getByText('Show app'))
    expect(show).toHaveBeenCalledOnce()
    fireEvent.change(view.getByLabelText('Comment on app selection 1'), {
      target: { value: 'Updated comment' },
    })
    fireEvent.click(view.getByLabelText('Remove app selection 2'))
    expect(view.queryByLabelText('Comment on app selection 2')).toBeNull()
    await act(async () => fireEvent.click(view.getByLabelText('Send message')))
    expect(send).toHaveBeenCalledWith('', [], {
      reason: 'user',
      appNotes: [{ ...pick, comment: 'Updated comment' }],
    })
    expect(view.queryByLabelText('Comment on app selection 1')).toBeNull()
  })

  it('preserves new picks and comment edits without restoring removed picks after a pending send', async () => {
    let resolve!: () => void
    const send = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )
    const change = vi.fn()
    const unchanged = { ...pick, id: 'unchanged' }
    const removed = { ...pick, id: 'removed' }
    const submitted = [pick, unchanged, removed]
    const props = {
      value: '',
      onChange: vi.fn(),
      onSend: send,
      onChangeAppNotes: change,
      clearOnSend: true,
    }
    const view = render(<ChatInput {...props} appNotes={submitted} />)
    fireEvent.click(view.getByLabelText('Send message'))
    expect(change).not.toHaveBeenCalled()
    const edited = { ...pick, comment: 'Edited during send' }
    const added = { ...pick, id: 'new' }
    view.rerender(<ChatInput {...props} appNotes={[edited, unchanged, added]} />)
    await act(async () => resolve())
    expect(send).toHaveBeenCalledWith('', [], { reason: 'user', appNotes: submitted })
    expect(change).toHaveBeenLastCalledWith([edited, added])
  })

  it('clears unchanged notes after a successful asynchronous send', async () => {
    let resolve!: () => void
    const send = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )
    const change = vi.fn()
    const view = render(
      <ChatInput
        value=""
        onChange={() => {}}
        onSend={send}
        appNotes={[pick]}
        onChangeAppNotes={change}
        clearOnSend
      />,
    )
    fireEvent.click(view.getByLabelText('Send message'))
    expect(change).not.toHaveBeenCalled()
    await act(async () => resolve())
    expect(change).toHaveBeenCalledWith([])
  })
})
