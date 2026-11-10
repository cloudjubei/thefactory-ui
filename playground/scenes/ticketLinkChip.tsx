import { useMemo, useState, type ReactNode } from 'react'
import {
  TICKET_CARD_LAYOUT_LABELS,
  TICKET_CARD_LAYOUTS,
  TICKET_CARD_TEXT,
  TicketLinksProvider,
  ticketChipView,
  type TicketCardLayout,
  type TicketPreview,
  type TicketPreviewState,
} from 'thefactory-ui/headless'
import {
  Markdown,
  RichText,
  SegmentedControl,
  TicketChip,
  TicketLinkChip,
  TicketPreviewPanel,
} from 'thefactory-ui/web'
import type { Scene, SceneState } from '../showcase/types'
import {
  NOT_A_TICKET_MESSAGE,
  TICKET_DONE,
  TICKET_IN_PROGRESS,
  TICKET_LONG_TITLE,
  TICKET_MESSAGE,
  TICKET_TO_DO,
  fakeTicketLinks,
  ticketUrl,
  type FakeTicketRead,
} from './ticketLinkFixtures'

const page = (node: ReactNode) => <div className="w-[640px] max-w-full p-4">{node}</div>
const phone = (node: ReactNode) => <div className="w-[390px] max-w-full p-4">{node}</div>

/** The made-up Jira the chat is bound to; with `read` left out the chat has no Jira at all. */
function InChat({ read, children }: { read?: FakeTicketRead; children: ReactNode }) {
  const links = useMemo(() => (read ? fakeTicketLinks(read) : undefined), [read])
  return <TicketLinksProvider value={links}>{children}</TicketLinksProvider>
}

/** The frame a hover card is drawn in, so a state can show the card without a hover. */
function Hovered({ children }: { children: ReactNode }) {
  return (
    <div className="inline-block rounded-md border border-(--border-subtle) bg-(--surface-overlay) p-3 shadow-lg">
      {children}
    </div>
  )
}

function Panel({ state, layout }: { state: TicketPreviewState; layout?: TicketCardLayout }) {
  return (
    <Hovered>
      <TicketPreviewPanel
        ticketKey={TICKET_IN_PROGRESS.key}
        url={TICKET_IN_PROGRESS.url}
        state={state}
        {...(layout ? { layout } : {})}
      />
    </Hovered>
  )
}

const ready = (preview: TicketPreview): TicketPreviewState => ({ kind: 'ready', preview })

/** A person's message and an agent's answer, as the chat draws each. */
function Messages({ text, read }: { text: string; read?: FakeTicketRead }) {
  return (
    <InChat {...(read ? { read } : {})}>
      <div className="flex flex-col gap-3 text-[14px] text-(--text-primary)">
        <div className="self-end rounded-2xl rounded-br-md border border-(--border-subtle) bg-(--surface-muted) px-3 py-1.5">
          <RichText text={text} />
        </div>
        <div className="rounded-2xl rounded-bl-md border border-(--border-subtle) bg-(--surface-base) px-3 py-1.5">
          <Markdown text={text} />
        </div>
      </div>
    </InChat>
  )
}

/** The two card layouts on one board, with the switch above them. */
function ChooseLayout() {
  const [layout, setLayout] = useState<TicketCardLayout>('unfurl')
  return (
    <div className="flex flex-col items-start gap-4">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={(next) => setLayout(next as TicketCardLayout)}
        options={TICKET_CARD_LAYOUTS.map((value) => ({
          value,
          label: TICKET_CARD_LAYOUT_LABELS[value],
        }))}
      />
      <Panel state={ready(TICKET_IN_PROGRESS)} layout={layout} />
      <InChat read="ready">
        <span className="text-[13px] text-(--text-secondary)">
          Rest on the chip to see it open:{' '}
          <TicketLinkChip
            link={{ key: TICKET_IN_PROGRESS.key, url: TICKET_IN_PROGRESS.url }}
            layout={layout}
          />
        </span>
      </InChat>
    </div>
  )
}

const LAYOUT_DESCRIPTIONS: Record<TicketCardLayout, string> = {
  unfurl:
    'The default that ships. Like a chat app’s link preview: a bar down its side, the type beside the key, the title large, then status, priority and assignee each on a labelled line.',
  compact:
    'Three tight lines: key and status, title, then type, priority and assignee run together. Smaller, and the labels are gone.',
}

const layoutStates: SceneState[] = TICKET_CARD_LAYOUTS.map((layout) => ({
  id: `layout-${layout}`,
  title: TICKET_CARD_LAYOUT_LABELS[layout],
  description: LAYOUT_DESCRIPTIONS[layout],
  render: () => page(<Panel state={ready(TICKET_IN_PROGRESS)} layout={layout} />),
}))

export const TICKET_LINK_CHIP_SCENES: Scene[] = [
  {
    id: 'ticket-link-chip',
    title: 'A Jira ticket link in a chat',
    component: 'TicketLinkChip',
    group: 'Chat',
    description:
      'A link to a ticket in a message, a person’s or an agent’s, written as [label](url) or bare, shows as the ticket chip in all three apps. A link counts only when it is /browse/KEY-123 on the Jira site the chat’s own scope is bound to, within the binding’s Jira projects; anything else stays a link. Resting on the chip (a press on a phone) shows the ticket’s preview, read the first time through that same binding and kept for the session. Fixed sample data: no Jira is read.',
    states: [
      {
        id: 'choose-layout',
        title: 'Pick a card layout',
        description: 'Unfurl or compact, switched on the board, with a live chip to rest on.',
        render: () => page(<ChooseLayout />),
      },
      ...layoutStates,
      {
        id: 'message',
        title: 'In a message',
        description:
          'A person’s message above, an agent’s below. The written link and the bare address are chips; the link to the spec stays a link. Rest on a chip for its preview.',
        render: () => page(<Messages text={TICKET_MESSAGE} read="ready" />),
      },
      {
        id: 'preview-loading',
        title: 'Preview: reading the ticket',
        description: 'Shown from the moment the card opens until the read answers.',
        render: () => page(<Panel state={{ kind: 'loading' }} />),
      },
      {
        id: 'preview-loaded',
        title: 'Preview: read',
        render: () => page(<Panel state={ready(TICKET_IN_PROGRESS)} />),
      },
      {
        id: 'preview-to-do',
        title: 'Preview: to do, nobody assigned',
        description: 'A grey lozenge; no priority to show, and the assignee line says so.',
        render: () => page(<Panel state={ready(TICKET_TO_DO)} />),
      },
      {
        id: 'preview-done',
        title: 'Preview: done',
        render: () => page(<Panel state={ready(TICKET_DONE)} />),
      },
      {
        id: 'preview-long-title',
        title: 'Preview: a long title, a status with no category',
        description:
          'The title folds to three lines. A status whose category Jira did not name keeps the neutral pill.',
        render: () => page(<Panel state={ready(TICKET_LONG_TITLE)} />),
      },
      {
        id: 'preview-failed',
        title: 'Preview: could not be read',
        description:
          'The chip stays a plain chip that opens the ticket; the card says the read failed. The next hover tries again.',
        render: () => page(<Panel state={{ kind: 'failed', reason: TICKET_CARD_TEXT.failed }} />),
      },
      {
        id: 'message-failed',
        title: 'In a message, Jira not answering',
        description: 'Rest on a chip: the card says it could not read the ticket.',
        render: () => page(<Messages text={TICKET_MESSAGE} read="failed" />),
      },
      {
        id: 'not-a-ticket',
        title: 'Links that are not a ticket here',
        description:
          'Another site with the same path, a board on the right site, a host that only starts the same, and another Jira site: each stays what it was, a link or plain text.',
        render: () => page(<Messages text={NOT_A_TICKET_MESSAGE} read="ready" />),
      },
      {
        id: 'no-jira',
        title: 'A chat with no Jira',
        description: 'With no Jira bound to the chat’s scope, every link stays a link.',
        render: () => page(<Messages text={TICKET_MESSAGE} />),
      },
      {
        id: 'chip-family',
        title: 'The same lozenge on the existing ticket chip',
        description:
          'The ticket chip on stories and sprint lists shows its status with the same lozenge, coloured when the category is known.',
        render: () =>
          page(
            <div className="flex flex-wrap items-center gap-3">
              {[TICKET_TO_DO, TICKET_IN_PROGRESS, TICKET_DONE, TICKET_LONG_TITLE].map((ticket) => (
                <TicketChip
                  key={ticket.key}
                  layout="split"
                  view={ticketChipView({
                    key: ticket.key,
                    status: ticket.status,
                    statusCategory: ticket.statusCategory,
                    title: ticket.summary,
                    url: ticketUrl(ticket.key),
                  })}
                />
              ))}
            </div>,
          ),
      },
      {
        id: 'message-phone',
        title: 'In a message, on a phone',
        description:
          'The small-screen width. The mobile app has no hover: a press opens the preview in a sheet, with Open in Jira inside.',
        render: () => phone(<Messages text={TICKET_MESSAGE} read="ready" />),
      },
      {
        id: 'preview-phone',
        title: 'Preview, on a phone',
        render: () => phone(<Panel state={ready(TICKET_LONG_TITLE)} />),
      },
    ],
  },
]
