import { describe, expect, it } from 'vitest'

import type { ChatMessageLike } from './chatTypes'
import { toolApprovalPreviewError, toolCallsAwaitingPreview } from './toolApprovalPreviews'

const toolRow = (toolCall: Record<string, unknown>): ChatMessageLike =>
  ({ role: 'tool', content: '', toolCall }) as unknown as ChatMessageLike

describe('toolCallsAwaitingPreview', () => {
  it('asks for a preview of each call waiting on an approval', () => {
    const messages = [
      toolRow({
        toolCallId: 'c1',
        name: 'writeFile',
        arguments: { path: 'a.ts' },
        approvalId: 'a1',
      }),
      toolRow({ toolCallId: 'c2', name: 'gitCommit', approvalId: 'a2' }),
    ]
    expect(toolCallsAwaitingPreview(messages, {})).toEqual([
      { toolCallId: 'c1', toolName: 'writeFile', args: { path: 'a.ts' } },
      { toolCallId: 'c2', toolName: 'gitCommit', args: undefined },
    ])
  })

  it('leaves out calls with no approval waiting', () => {
    const messages = [toolRow({ toolCallId: 'c1', name: 'readFile', arguments: {} })]
    expect(toolCallsAwaitingPreview(messages, {})).toEqual([])
  })

  it('leaves out rows that are not tool calls', () => {
    const messages: ChatMessageLike[] = [
      { role: 'assistant', content: 'hi' },
      {
        role: 'user',
        content: '',
        toolCall: { toolCallId: 'c1', name: 'writeFile', approvalId: 'a1' },
      } as unknown as ChatMessageLike,
    ]
    expect(toolCallsAwaitingPreview(messages, {})).toEqual([])
  })

  it('leaves out calls already asked for, whatever came back', () => {
    const messages = [
      toolRow({ toolCallId: 'c1', name: 'writeFile', approvalId: 'a1' }),
      toolRow({ toolCallId: 'c2', name: 'writeFile', approvalId: 'a2' }),
      toolRow({ toolCallId: 'c3', name: 'writeFile', approvalId: 'a3' }),
    ]
    const known = { c1: { status: 'pending' }, c2: { status: 'error', error: 'x' } }
    expect(toolCallsAwaitingPreview(messages, known)).toEqual([
      { toolCallId: 'c3', toolName: 'writeFile', args: undefined },
    ])
  })

  it('leaves out calls with no id or no name', () => {
    const messages = [
      toolRow({ toolCallId: '', name: 'writeFile', approvalId: 'a1' }),
      toolRow({ toolCallId: 'c2', name: '', approvalId: 'a2' }),
    ]
    expect(toolCallsAwaitingPreview(messages, {})).toEqual([])
  })

  it('asks once for a call the list shows twice', () => {
    const row = toolRow({ toolCallId: 'c1', name: 'writeFile', approvalId: 'a1' })
    expect(toolCallsAwaitingPreview([row, row], {})).toHaveLength(1)
  })
})

describe('toolApprovalPreviewError', () => {
  it('carries an error message', () => {
    expect(toolApprovalPreviewError(new Error('boom'))).toEqual({ status: 'error', error: 'boom' })
  })

  it('carries a thrown value that is not an error', () => {
    expect(toolApprovalPreviewError('offline')).toEqual({ status: 'error', error: 'offline' })
  })

  it('falls back to the value when an error has no message', () => {
    expect(toolApprovalPreviewError(new Error(''))).toEqual({ status: 'error', error: 'Error' })
  })
})
