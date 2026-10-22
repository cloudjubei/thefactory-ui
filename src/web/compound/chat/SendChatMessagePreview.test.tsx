import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { sendChatMessageView } from '../../../headless/utils/sendChatMessageView'
import { getChatContextKey } from 'thefactory-tools/utils'
import type { PendingToolGrant } from '../../../headless/utils/chatTypes'
import ApprovalPanel from './ApprovalPanel'
import SendChatMessageCard from './SendChatMessageCard'
import SendChatMessagePreview from './SendChatMessagePreview'
import ToolCallCard from './ToolCall/ToolCallCard'
import { renderToolPreview } from './toolPreviews/renderToolPreview'

const targetChatId = getChatContextKey({ type: 'PROJECT', projectId: 'proj-backend' } as never)

const detail = {
  targetChatId,
  targetProjectId: 'proj-backend',
  targetTitle: 'Release prep',
  targetLabel: 'chat "Release prep" in project proj-backend',
}

const args = {
  chatId: targetChatId,
  projectId: 'proj-backend',
  message: 'Please **add** the `sendChatMessage` tool.',
  awaitReply: false,
}

const grantDetail = { tool: 'sendChatMessage', args, detail }

const render = (
  input: Parameters<typeof sendChatMessageView>[0],
  extra: Partial<Parameters<typeof SendChatMessagePreview>[0]> = {},
) => renderToStaticMarkup(<SendChatMessagePreview view={sendChatMessageView(input)} {...extra} />)

describe('SendChatMessagePreview', () => {
  it('shows the chat title from targetTitle, the project from host lookup, and the sender', () => {
    const html = render(
      { args, detail: grantDetail },
      {
        project: { title: 'TheFactory Backend', iconKey: 'robot' },
        sourceChatTitle: 'Group planning',
        onOpenTarget: () => {},
      },
    )
    expect(html).toContain('TheFactory Backend')
    expect(html).toContain('· Release prep')
    expect(html).toContain('href="overseer://projects/proj-backend"')
    expect(html).toMatch(/<strong[^>]*>add<\/strong>/)
    expect(html).toContain('<code')
    // onAccent keeps fenced/inline code readable on the accent bubble.
    expect(html).toContain('bg-white/20')
    expect(html).toContain('text-(--text-inverted)')
    expect(html).toContain('Sent by the agent in Group planning, on your behalf')

    const withLink = render(
      {
        args: {
          ...args,
          message: 'See [docs](https://example.com) for details.',
        },
        detail: grantDetail,
      },
      { project: { title: 'TheFactory Backend' } },
    )
    // Links on the accent use inverted colour, not accent-primary (dark-on-blue).
    expect(withLink).toContain('decoration-white/50')
    expect(html).not.toContain('data-testid="scm-toggle"')
    expect(html).not.toContain('data-testid="scm-incomplete"')
    expect(html).not.toContain('data-testid="scm-outcome"')
  })

  it('folds a long message behind "Show more" and unfolds it', () => {
    const lines = Array.from({ length: 30 }, (_, i) => `Paragraph line ${i}`)
    const message = lines.join('\n')
    const folded = render({ args: { ...args, message }, detail: grantDetail })
    expect(folded).toContain('data-testid="scm-toggle"')
    expect(folded).toContain('Show more')
    expect(folded).toContain('aria-expanded="false"')
    expect(folded).toContain('Paragraph line 0')
    expect(folded).not.toContain('Paragraph line 29')

    const open = render(
      { args: { ...args, message }, detail: grantDetail },
      { defaultExpanded: true },
    )
    expect(open).toContain('Show less')
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('Paragraph line 29')
  })

  it('badges awaitReply, held and agentStarted from real (compatible) result fields', () => {
    const delivered = render({
      args: { ...args, awaitReply: true },
      detail: grantDetail,
      resultType: 'success',
      result: {
        delivered: true,
        held: false,
        agentStarted: true,
        chatTitle: 'Release prep',
        awaitingReply: true,
      },
    })
    expect(delivered).toContain('data-testid="scm-await-reply"')
    expect(delivered).toContain('Waits for reply')
    expect(delivered).not.toContain('data-testid="scm-held"')
    expect(delivered).toContain('data-testid="scm-agent-started"')
    expect(delivered).toContain('Started a run')

    const held = render({
      args,
      detail: grantDetail,
      resultType: 'success',
      result: {
        delivered: false,
        held: true,
        agentStarted: false,
        chatTitle: 'Release prep',
        awaitingReply: false,
      },
    })
    expect(held).toContain('data-testid="scm-held"')
    expect(held).toContain('Held until the chat is free')
    expect(held).not.toContain('data-testid="scm-agent-started"')
  })

  it('falls back to what is known plus the raw payload when fields are missing', () => {
    const html = render({ args: { note: 'no target, no message' } })
    expect(html).toContain('data-testid="scm-incomplete"')
    expect(html).toContain('Raw payload')
    expect(html).toContain('(no message text)')
    expect(html).toContain('a chat')
    expect(html).not.toContain('Unknown project')
    expect(html).not.toContain('href="overseer://')
    expect(render({ args: 42 })).toContain('data-testid="scm-incomplete"')
  })

  it('shows the outcome and the way into the target chat once decided', () => {
    const sent = renderToStaticMarkup(
      <SendChatMessagePreview
        view={sendChatMessageView({
          args,
          detail: grantDetail,
          resultType: 'success',
          result: { delivered: true },
        })}
        onOpenTarget={() => {}}
      />,
    )
    expect(sent).toContain('data-testid="scm-outcome"')
    expect(sent).toContain('Sent')
    expect(sent).toContain('data-testid="scm-open-target"')
    expect(sent).toContain('Open target chat')

    const denied = renderToStaticMarkup(
      <SendChatMessagePreview
        view={sendChatMessageView({
          args,
          detail: grantDetail,
          resultType: 'not_allowed',
          result: { reason: 'You declined this.' },
        })}
        onOpenTarget={() => {}}
      />,
    )
    expect(denied).toContain('Not sent — you declined')
    expect(denied).toContain('You declined this.')
    expect(denied).toContain('data-testid="scm-open-target"')
  })

  it('names the target as plain text, never a dead link, when nothing can open it', () => {
    const sent = renderToStaticMarkup(
      <SendChatMessagePreview
        view={sendChatMessageView({
          args,
          detail: grantDetail,
          resultType: 'success',
          result: { delivered: true },
        })}
      />,
    )
    expect(sent).toContain('Release prep')
    expect(sent).not.toContain('data-testid="scm-target-link"')
    expect(sent).not.toContain('data-testid="scm-open-target"')
  })

  it('is the preview the tool registry renders for sendChatMessage', () => {
    const html = renderToStaticMarkup(
      <>
        {renderToolPreview({
          toolCall: {
            name: 'mcp__thefactory__sendChatMessage',
            arguments: args,
          } as never,
          resultType: 'require_confirmation',
        })}
      </>,
    )
    expect(html).toContain('data-testid="send-chat-message-preview"')
    // Without host detail, the card names the target from the chat context id.
    expect(html).toContain('Project Chat')
    expect(html).toContain('Please')
  })

  it('routes the target link through the host', () => {
    const html = renderToStaticMarkup(
      <>
        {renderToolPreview({
          toolCall: {
            name: 'sendChatMessage',
            arguments: {
              projectId: 'proj-backend',
              message: 'hi',
            },
          } as never,
          resultType: 'success',
          result: { delivered: true },
          hooks: {
            onResourceLink: () => {},
          },
        })}
      </>,
    )
    expect(html).toContain('href="overseer://projects/proj-backend"')
    expect(html).toContain('data-testid="scm-open-target"')
  })
})

describe('SendChatMessageCard', () => {
  it('links the target only when the host routes overseer:// links', () => {
    const view = sendChatMessageView({
      args,
      detail: grantDetail,
      resultType: 'success',
      result: { delivered: true },
    })
    const routed = renderToStaticMarkup(
      <SendChatMessageCard view={view} onResourceLink={() => {}} />,
    )
    expect(routed).toContain('href="overseer://projects/proj-backend"')
    expect(routed).toContain('data-testid="scm-open-target"')
    expect(renderToStaticMarkup(<SendChatMessageCard view={view} />)).not.toContain(
      'data-testid="scm-target-link"',
    )
  })

  it("names the sender from the dock's chat, or from the ask's chat id", () => {
    const view = sendChatMessageView({
      args,
      detail: grantDetail,
      sourceChatContextId: getChatContextKey({ type: 'GENERAL' } as never),
    })
    expect(renderToStaticMarkup(<SendChatMessageCard view={view} />)).toContain(
      'Sent by the agent in General Chat, on your behalf',
    )
    expect(
      renderToStaticMarkup(<SendChatMessageCard view={view} sourceChatTitle="Ops planning" />),
    ).toContain('Sent by the agent in Ops planning, on your behalf')
  })
})

describe('ToolCallCard — sendChatMessage', () => {
  it('names the sender on the inline row from the chat it is in', () => {
    const toolCall = { name: 'sendChatMessage', arguments: args } as never
    expect(
      renderToStaticMarkup(
        <ToolCallCard
          toolCall={toolCall}
          resultType="require_confirmation"
          sourceChatTitle="Ops planning"
        />,
      ),
    ).toContain('Sent by the agent in Ops planning, on your behalf')
  })
})

describe('ApprovalPanel — sendChatMessage', () => {
  it('uses the shared tool-ask card with await-reply, scopes, sender and decided line', () => {
    const grant = {
      id: 'g1',
      chatRunner: 'cli',
      label: 'sendChatMessage',
      toolName: 'mcp__thefactory__sendChatMessage',
      args: { ...args, awaitReply: true },
      detail: grantDetail,
      alwaysAllowScopes: ['chat'],
      chatContextId: getChatContextKey({ type: 'GENERAL' } as never),
      decide: async () => {},
    } as unknown as PendingToolGrant
    const html = renderToStaticMarkup(
      <ApprovalPanel
        grant={grant}
        chatTitle="Group planning"
        onResourceLink={() => {}}
        onDecideLater={() => {}}
      />,
    )
    // Shared tool-ask card, not the removed dedicated panel.
    expect(html).not.toContain('data-testid="send-chat-message-preview"')
    // SSR escapes quotes in the targetLabel headline.
    expect(html).toContain('Message chat &quot;Release prep&quot; in project proj-backend')
    expect(html).toContain('Chats')
    expect(html).toContain('Sent by the agent in Group planning, on your behalf')
    expect(html).toContain('Wait for their reply before carrying on')
    // No duplicate "Waits for reply" status line beside the switch.
    expect(html).not.toContain('>Waits for reply<')
    expect(html).toContain('Just this once')
    expect(html).toContain('Always in this chat')
    expect(html).toContain('Send')
    expect(html).toContain('Not now')
    expect(html).toContain('Decide later')
    expect(html).toContain('href="overseer://projects/proj-backend"')
  })
})
