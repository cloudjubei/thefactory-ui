import { useMemo, type ReactNode } from 'react'
import { View } from 'react-native'
import {
  TicketLinksProvider,
  ticketStatusMoveView,
  ticketStoryProposalView,
  type TicketCardLayout,
  type TicketPreviewState,
  type TicketStatusMoveLayout,
  type TicketStoryProposalLayout,
} from 'thefactory-ui/headless'
import Markdown from '../../src/native/compound/Markdown'
import TicketStatusMoveCard from '../../src/native/compound/chat/TicketStatusMoveCard'
import TicketStoryProposalCard from '../../src/native/compound/chat/TicketStoryProposalCard'
import ToolCallCard from '../../src/native/compound/chat/ToolCall/ToolCallCard'
import { TicketPreviewPanel } from '../../src/native/compound/chips/TicketCard'
import TicketLinkChip from '../../src/native/compound/chips/TicketLinkChip'
import RichText from '../../src/native/compound/files/RichText'
import { TICKET_CARD_TEXT } from '../../src/headless/utils/ticketCardConstants'
import {
  MOVE_ARGS,
  MOVE_COMMENT,
  MOVE_LONG_RESULT,
  MOVE_REFUSAL,
  MOVE_RESULT,
  NOT_A_TICKET_MESSAGE,
  STORY_PROPOSAL_ARGS,
  STORY_PROPOSAL_CREATED,
  STORY_PROPOSAL_LONG_ARGS,
  STORY_PROPOSAL_MANY_ARGS,
  STORY_PROPOSAL_REFUSAL,
  TICKET_SITE_URL,
  TICKET_IN_PROGRESS,
  TICKET_LONG_TITLE,
  TICKET_MESSAGE,
  fakeTicketLinks,
  type FakeTicketRead,
} from '../scenes/ticketLinkFixtures'
import type { NativeView } from './views'

function InChat({ read, children }: { read?: FakeTicketRead; children: ReactNode }) {
  const links = useMemo(() => (read ? fakeTicketLinks(read) : undefined), [read])
  return <TicketLinksProvider value={links}>{children}</TicketLinksProvider>
}

const MOVE_ROWS: Record<
  string,
  { args?: Record<string, unknown>; result?: unknown; resultType: string; read?: FakeTicketRead }
> = {
  ask: { resultType: 'require_confirmation', read: 'ready' },
  'ask-target-only': { resultType: 'require_confirmation', read: 'reading' },
  moved: { result: MOVE_RESULT, resultType: 'success' },
  'moved-with-comment': {
    args: { ...MOVE_ARGS, comment: MOVE_COMMENT },
    result: MOVE_RESULT,
    resultType: 'success',
  },
  failed: { result: { error: MOVE_REFUSAL }, resultType: 'success' },
  old: { result: { ok: true }, resultType: 'success' },
  long: {
    args: { issueKey: 'ZNR-812', transition: 'Ready for release to production' },
    result: MOVE_LONG_RESULT,
    resultType: 'success',
  },
}

function StatusMove({ state, layout }: { state: string; layout: TicketStatusMoveLayout }) {
  const row = MOVE_ROWS[state] ?? MOVE_ROWS.moved!
  if (layout === 'line') {
    return (
      <View style={{ padding: 16 }}>
        <TicketStatusMoveCard
          layout="line"
          view={ticketStatusMoveView({
            args: row.args ?? MOVE_ARGS,
            result: row.result,
            resultType: row.resultType,
          })}
        />
      </View>
    )
  }
  return (
    <InChat read={row.read ?? 'ready'}>
      <View style={{ padding: 16 }}>
        <ToolCallCard
          toolCall={{
            toolCallId: 't-move',
            name: 'transitionJiraIssue',
            arguments: row.args ?? MOVE_ARGS,
          }}
          result={row.result}
          resultType={row.resultType}
        />
      </View>
    </InChat>
  )
}

const PREVIEW_STATES: Record<string, TicketPreviewState> = {
  loading: { kind: 'loading' },
  loaded: { kind: 'ready', preview: TICKET_IN_PROGRESS },
  long: { kind: 'ready', preview: TICKET_LONG_TITLE },
  failed: { kind: 'failed', reason: TICKET_CARD_TEXT.failed },
}

function TicketLink({ state, layout }: { state: string; layout: TicketCardLayout }) {
  const link = { key: TICKET_IN_PROGRESS.key, url: TICKET_IN_PROGRESS.url }
  const preview = PREVIEW_STATES[state]
  if (preview) {
    return (
      <View style={{ padding: 16 }}>
        <TicketPreviewPanel ticketKey={link.key} url={link.url} state={preview} layout={layout} />
      </View>
    )
  }
  if (state === 'sheet' || state === 'sheet-failed') {
    return (
      <InChat read={state === 'sheet' ? 'ready' : 'failed'}>
        <View style={{ padding: 16 }}>
          <TicketLinkChip link={link} layout={layout} initialOpen />
        </View>
      </InChat>
    )
  }
  const text = state === 'not-a-ticket' ? NOT_A_TICKET_MESSAGE : TICKET_MESSAGE
  return (
    <InChat {...(state === 'no-jira' ? {} : { read: 'ready' as const })}>
      <View style={{ padding: 16, gap: 16 }}>
        <RichText text={text} />
        <Markdown text={text} />
      </View>
    </InChat>
  )
}

const PROPOSALS: Record<
  string,
  { args: Record<string, unknown>; result?: unknown; resultType: string }
> = {
  ask: { args: STORY_PROPOSAL_ARGS, resultType: 'require_confirmation' },
  approved: { args: STORY_PROPOSAL_ARGS, result: STORY_PROPOSAL_CREATED, resultType: 'success' },
  refused: {
    args: STORY_PROPOSAL_ARGS,
    result: { error: STORY_PROPOSAL_REFUSAL },
    resultType: 'success',
  },
  long: { args: STORY_PROPOSAL_LONG_ARGS, resultType: 'require_confirmation' },
  many: { args: STORY_PROPOSAL_MANY_ARGS, resultType: 'require_confirmation' },
}

function StoryProposal({ state, layout }: { state: string; layout: TicketStoryProposalLayout }) {
  const call = PROPOSALS[state] ?? PROPOSALS.ask!
  return (
    <InChat read="ready">
      <View style={{ padding: 16 }}>
        <TicketStoryProposalCard
          layout={layout}
          onOpenGroupStory={() => undefined}
          view={ticketStoryProposalView({ ...call, siteUrl: TICKET_SITE_URL })}
        />
      </View>
    </InChat>
  )
}

/**
 * A Jira status move on a phone (`?state=ask`, `ask-target-only`, `moved`,
 * `moved-with-comment`, `failed`, `old` or `long`; `&layout=line` for the arrow
 * line) and a ticket link (`?state=message`, `not-a-ticket`, `no-jira`, `sheet`,
 * `sheet-failed`, `loading`, `loaded`, `long` or `failed`; `&layout=compact`), and
 * a ticket's proposed group story (`?state=ask`, `approved`, `refused`, `long` or
 * `many`; `&layout=steps`).
 * Fixed sample data: no Jira is read.
 */
export const TICKET_VIEWS: NativeView[] = [
  {
    id: 'ticket-status-move',
    title: 'A Jira status move',
    render: (address) => (
      <StatusMove
        state={address.get('state') ?? 'moved'}
        layout={address.get('layout') === 'line' ? 'line' : 'lozenges'}
      />
    ),
  },
  {
    id: 'ticket-story-proposal',
    title: 'A ticket’s proposed group story',
    render: (address) => (
      <StoryProposal
        state={address.get('state') ?? 'ask'}
        layout={address.get('layout') === 'steps' ? 'steps' : 'rows'}
      />
    ),
  },
  {
    id: 'ticket-link-chip',
    title: 'A Jira ticket link',
    render: (address) => (
      <TicketLink
        state={address.get('state') ?? 'message'}
        layout={address.get('layout') === 'compact' ? 'compact' : 'unfurl'}
      />
    ),
  },
]
