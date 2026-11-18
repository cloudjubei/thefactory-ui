import type { ReactNode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WebChatBody from './ChatBody'
import NativeChatBody from '../../../native/compound/chat/ChatBody'
import type { ChatInputProps } from './ChatInput'
import type { ChatPendingQueue } from '../../../headless/hooks/useChatComposer'

const probe = vi.hoisted(() => ({ input: {} as ChatInputProps }))
// Only the leaf composer is a probe: both real ChatBody adapters run their send routing.
vi.mock('./ChatInput', () => ({
  default: (props: ChatInputProps) => {
    probe.input = props
    return null
  },
}))
vi.mock('../../../native/compound/chat/ChatInput', () => ({
  default: (props: ChatInputProps) => {
    probe.input = props
    return null
  },
}))
vi.mock('./MessageList', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/MessageList', () => ({ default: () => null }))
vi.mock('./PendingMessagesStack', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/PendingMessagesStack', () => ({ default: () => null }))
vi.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))
vi.mock('react-native', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  ScrollView: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Pressable: () => null,
  useWindowDimensions: () => ({ width: 1000, height: 900 }),
  StyleSheet: { create: (styles: unknown) => styles },
}))
vi.mock('../../../native/icons', () => ({
  IconChevronLeft: () => null,
  IconChevronRight: () => null,
}))
vi.mock('../../../native/compound/chat/AgentQuestionCard', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/StuckCard', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/RemedyCard', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/CredentialCaptureCard', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/ApprovalPanel', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/HeldAgentMessagesStack', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/StillWaitingRow', () => ({ default: () => null }))
vi.mock('../../../native/compound/chat/ToolAskCard', () => ({ ToolAskDecidedRow: () => null }))
vi.mock('../../../native/compound/chat/ChatChangesBarConnected', () => ({
  ChatChangesBarConnected: () => null,
}))
vi.mock('../../../native/compound/chat/ChatChangesMarkerConnected', () => ({
  ChatChangesMarkerConnected: () => null,
}))
vi.mock('../../../headless/hooks/useChatOpenChanges', () => ({ useChatOpenChanges: () => ({}) }))
vi.mock('../../../headless/hooks/useChatDecidedAsks', () => ({ useChatDecidedAsks: () => [] }))
vi.mock('../../../headless/contexts/TicketLinksContext', () => ({
  ChatTicketLinksProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    disconnect() {}
  },
)
afterEach(cleanup)
const selections = [
  {
    id: 'pick',
    projectId: 'p',
    selector: '#renewal',
    outerHtml: '<p>Renewal</p>',
    comment: 'Fix date',
  },
]

describe('ChatBody app selection adapters', () => {
  for (const [name, Body] of [
    ['web', WebChatBody],
    ['native', NativeChatBody],
  ] as const) {
    it(`${name} forwards selection-only metadata and holds selections out of the text-only queue`, async () => {
      const send = vi.fn()
      const change = vi.fn()
      const show = vi.fn()
      const enqueue = vi.fn()
      const queue: ChatPendingQueue = {
        items: [],
        paused: false,
        sendNowMode: 'interrupts-turn',
        enqueue,
        pause: vi.fn(),
        sendNow: vi.fn(),
        remove: vi.fn(),
        edit: vi.fn(),
      }
      const props = {
        messages: [],
        liveState: { isSending: false, pendingAssistant: null, sendError: null },
        onSend: send,
        inputValue: '',
        onInputChange: vi.fn(),
        pendingQueue: queue,
        inputProps: { appSelections: selections, onChangeAppSelections: change, onShowApp: show },
      }
      const view = render(<Body {...props} />)
      expect(probe.input.appSelections).toBe(selections)
      expect(probe.input.onChangeAppSelections).toBe(change)
      expect(probe.input.onShowApp).toBe(show)
      expect(probe.input.isThinking).toBe(false)
      await act(async () => {
        await probe.input.onSend('', [], { reason: 'user', appSelections: selections })
      })
      expect(send).toHaveBeenCalledWith('', [], { reason: 'user', appSelections: selections })
      expect(enqueue).not.toHaveBeenCalled()
      send.mockClear()
      view.rerender(<Body {...props} liveState={{ ...props.liveState, isSending: true }} />)
      expect(probe.input.isThinking).toBe(true)
      expect(probe.input.queueWhileThinking).toBe(true)
      // Defence in depth: even a direct callback must never put structured context in a text queue.
      await act(async () => {
        await probe.input.onSend('', [], { appSelections: selections })
      })
      expect(send).toHaveBeenCalledWith('', [], { appSelections: selections })
      expect(enqueue).not.toHaveBeenCalled()
      send.mockClear()
      await act(async () => {
        await probe.input.onSend('Queued text', ['file.txt'], { reason: 'user' })
      })
      expect(enqueue).toHaveBeenCalledWith({ text: 'Queued text', attachments: ['file.txt'] })
      expect(send).not.toHaveBeenCalled()
    })
  }
})
