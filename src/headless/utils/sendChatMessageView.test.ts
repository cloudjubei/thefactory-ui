import { describe, expect, it } from 'vitest'
import { getChatContextKey } from 'thefactory-tools/utils'
import {
  chatTitleFromContextId,
  collapsedMessage,
  isSendChatMessageTool,
  sendChatMessageView,
} from './sendChatMessageView'

describe('isSendChatMessageTool', () => {
  it('recognises the tool, with or without an MCP prefix', () => {
    expect(isSendChatMessageTool('sendChatMessage')).toBe(true)
    expect(isSendChatMessageTool('mcp__thefactory__sendChatMessage')).toBe(true)
    expect(isSendChatMessageTool('writeFile')).toBe(false)
    expect(isSendChatMessageTool(undefined)).toBe(false)
  })
})

describe('sendChatMessageView', () => {
  it('reads the real args and host detail fields (targetTitle is the chat title)', () => {
    const chatId = getChatContextKey({ type: 'PROJECT', projectId: 'p1' } as never)
    const view = sendChatMessageView({
      args: {
        chatId,
        projectId: 'p1',
        message: '**Hi** there',
        awaitReply: true,
      },
      detail: {
        tool: 'sendChatMessage',
        args: {},
        detail: {
          targetChatId: chatId,
          targetProjectId: 'p1',
          targetTitle: 'Release prep',
          targetLabel: 'chat "Release prep" in project p1',
        },
      },
      sourceChatContextId: 'c1',
    })
    expect(view.target).toEqual({
      projectId: 'p1',
      chatContextId: chatId,
      chatTitle: 'Release prep',
      label: 'chat "Release prep" in project p1',
    })
    expect(view.message).toBe('**Hi** there')
    expect(view.awaitReply).toBe(true)
    expect(view.held).toBe(false)
    expect(view.agentStarted).toBe(false)
    expect(view.source.chatContextId).toBe('c1')
    expect(view.link).toBe('overseer://projects/p1')
    expect(view.missing).toEqual([])
    expect(view.outcome.status).toBe('awaiting')
  })

  it('does not read invented startRun / processId / toolResults fields', () => {
    const view = sendChatMessageView({
      args: {
        projectId: 'p',
        message: 'x',
        startRun: true,
        processId: 'story-default',
        toolResults: [{ toolName: 'runTests' }],
      },
    })
    expect(view.agentStarted).toBe(false)
    expect(view.awaitReply).toBe(false)
    expect(view.held).toBe(false)
  })

  it('names what is missing from a malformed payload and keeps the raw JSON', () => {
    const view = sendChatMessageView({ args: { foo: 1 } })
    expect(view.missing).toEqual(['target', 'message'])
    expect(view.raw).toContain('"foo": 1')
    expect(view.link).toBeUndefined()
    expect(sendChatMessageView({ args: 'not an object' }).missing).toEqual(['target', 'message'])
    expect(sendChatMessageView({}).missing).toEqual(['target', 'message'])
  })

  it('reads delivered + agentStarted without held (held means delivered:false)', () => {
    const view = sendChatMessageView({
      args: { projectId: 'p1', message: 'hi' },
      resultType: 'success',
      result: {
        delivered: true,
        held: false,
        chatTitle: 'Release prep',
        agentStarted: true,
        awaitingReply: true,
      },
    })
    expect(view.outcome).toEqual({ status: 'sent' })
    expect(view.held).toBe(false)
    expect(view.agentStarted).toBe(true)
    expect(view.awaitReply).toBe(true)
    expect(view.target.chatTitle).toBe('Release prep')

    const held = sendChatMessageView({
      args: { projectId: 'p1', message: 'hi' },
      resultType: 'success',
      result: {
        delivered: false,
        held: true,
        chatTitle: 'Release prep',
        agentStarted: false,
        awaitingReply: false,
      },
    })
    expect(held.held).toBe(true)
    expect(held.agentStarted).toBe(false)
    expect(held.outcome).toEqual({
      status: 'sent',
      detail: 'Held until the chat is free',
    })

    expect(sendChatMessageView({ resultType: 'require_confirmation' }).outcome.status).toBe(
      'awaiting',
    )
    expect(
      sendChatMessageView({ resultType: 'not_allowed', result: { reason: 'You declined' } })
        .outcome,
    ).toEqual({ status: 'denied', detail: 'You declined' })
    expect(sendChatMessageView({ resultType: 'errored', result: 'boom' }).outcome).toEqual({
      status: 'failed',
      detail: 'boom',
    })
  })
})

describe('collapsedMessage', () => {
  it('leaves a short message whole', () => {
    expect(collapsedMessage('short')).toBeUndefined()
  })

  it('folds a message past the line or character limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
    const folded = collapsedMessage(many, 600, 12)
    expect(folded?.endsWith('…')).toBe(true)
    expect(folded?.split('\n')).toHaveLength(12)
    const long = 'a'.repeat(1000)
    expect(collapsedMessage(long, 600, 12)).toHaveLength(601)
  })

  it('closes a code block the fold cuts through', () => {
    const code = ['Run this:', '```ts', ...Array.from({ length: 20 }, (_, i) => `f(${i})`), '```']
    const folded = collapsedMessage(code.join('\n'), 600, 12)
    expect(folded?.endsWith('…\n```')).toBe(true)
    const closed = ['```', 'x', '```', ...Array.from({ length: 20 }, (_, i) => `line ${i}`)]
    expect(collapsedMessage(closed.join('\n'), 600, 12)?.endsWith('…')).toBe(true)
  })
})

describe('chatTitleFromContextId', () => {
  const titles = (id: string) => (id === 'p1' ? 'Backend' : undefined)

  it("names a project's chat by its project", () => {
    const key = getChatContextKey({ type: 'PROJECT', projectId: 'p1' } as never)
    expect(chatTitleFromContextId(key, titles)).toBe('Backend Chat')
    expect(chatTitleFromContextId(key)).toBe('Project Chat')
  })

  it('names the general chat', () => {
    expect(chatTitleFromContextId(getChatContextKey({ type: 'GENERAL' } as never))).toBe(
      'General Chat',
    )
  })

  it('leaves an id that is not a chat key, or none, unnamed', () => {
    expect(chatTitleFromContextId('not/a/chat/key')).toBeUndefined()
    expect(chatTitleFromContextId(undefined)).toBeUndefined()
  })
})
