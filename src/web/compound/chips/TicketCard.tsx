import type { ReactNode } from 'react'
import {
  TICKET_CARD_DEFAULT_LAYOUT,
  TICKET_CARD_TEXT,
  ticketCardView,
  type TicketCardLayout,
  type TicketCardView,
  type TicketPreviewState,
} from '../../../headless'
import { IconJira } from '../../icons'
import Spinner from '../../primitives/Spinner'
import TicketStatusLozenge from './TicketStatusLozenge'

const keepInChip = (e: { stopPropagation: () => void }) => e.stopPropagation()

export type TicketKeyLinkProps = {
  ticketKey: string
  /** The ticket in Jira; without it the key is plain text. */
  url?: string | undefined
}

/** A ticket's key under Jira's mark, opening the ticket in a new tab when its link is known. */
export function TicketKeyLink({ ticketKey, url }: TicketKeyLinkProps) {
  const words = (
    <>
      <IconJira className="h-3.5 w-3.5 shrink-0 text-(--color-blue-500)" />
      <span className="font-mono text-[12px] font-semibold">{ticketKey}</span>
    </>
  )
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      title={TICKET_CARD_TEXT.open}
      onClick={keepInChip}
      className="inline-flex shrink-0 items-center gap-1.5 text-(--text-primary) no-underline hover:underline"
    >
      {words}
    </a>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-(--text-primary)">{words}</span>
  )
}

function OpenInJira({ open }: { open: NonNullable<TicketCardView['open']> }) {
  return (
    <a
      href={open.url}
      target="_blank"
      rel="noreferrer noopener"
      onClick={keepInChip}
      className="self-start text-[12px] font-medium text-(--accent-primary) hover:underline"
    >
      {open.label}
    </a>
  )
}

export type TicketCardProps = {
  view: TicketCardView
  layout?: TicketCardLayout
}

/**
 * A ticket at a glance, as a link's preview shows it: issue type, key, title,
 * status, priority, who holds it, and the way to it in Jira. `unfurl` reads
 * like a chat app's link preview, a bar down its side; `compact` is three
 * tight lines. Its text comes from Jira and stays plain text.
 */
export default function TicketCard({ view, layout = TICKET_CARD_DEFAULT_LAYOUT }: TicketCardProps) {
  const url = view.open?.url
  if (layout === 'compact') {
    return (
      <div className="flex w-72 max-w-full flex-col gap-1.5 text-[12.5px]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TicketKeyLink ticketKey={view.key} url={url} />
          {view.status ? <TicketStatusLozenge view={view.status} /> : null}
        </div>
        {view.title ? (
          <span className="line-clamp-2 break-words font-medium text-(--text-primary)">
            {view.title}
          </span>
        ) : null}
        <span className="break-words text-(--text-secondary)">
          {[view.issueType, ...view.facts.map((fact) => fact.value)].filter(Boolean).join(' · ')}
        </span>
        {view.open ? <OpenInJira open={view.open} /> : null}
      </div>
    )
  }
  return (
    <div className="flex w-80 max-w-full gap-2.5 text-[12.5px]">
      <span aria-hidden className="w-1 shrink-0 rounded-full bg-(--color-blue-500)" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <TicketKeyLink ticketKey={view.key} url={url} />
          {view.issueType ? (
            <span className="text-[11.5px] text-(--text-secondary)">{view.issueType}</span>
          ) : null}
        </div>
        {view.title ? (
          <span className="line-clamp-3 break-words text-[14px] leading-snug font-semibold text-(--text-primary)">
            {view.title}
          </span>
        ) : null}
        {view.status ? (
          <div className="flex">
            <TicketStatusLozenge view={view.status} />
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          {view.facts.map((fact) => (
            <div key={fact.label} className="flex gap-2.5 leading-normal">
              <span className="w-[74px] shrink-0 text-(--text-secondary)">{fact.label}</span>
              <span className="min-w-0 break-words text-(--text-primary)">{fact.value}</span>
            </div>
          ))}
        </div>
        {view.open ? <OpenInJira open={view.open} /> : null}
      </div>
    </div>
  )
}

function Standing({ ticketKey, url, children }: TicketKeyLinkProps & { children: ReactNode }) {
  return (
    <div className="flex w-72 max-w-full flex-col gap-1.5 text-[12.5px]">
      <TicketKeyLink ticketKey={ticketKey} url={url} />
      {children}
    </div>
  )
}

export type TicketPreviewPanelProps = TicketKeyLinkProps & {
  state: TicketPreviewState
  layout?: TicketCardLayout
}

/**
 * What hovering a ticket's chip shows, whatever the read has come to: a line
 * that it is being read, the ticket's card, or that it could not be read, the
 * key and its link still there.
 */
export function TicketPreviewPanel({ ticketKey, url, state, layout }: TicketPreviewPanelProps) {
  if (state.kind === 'ready') {
    return <TicketCard view={ticketCardView(state.preview)} {...(layout ? { layout } : {})} />
  }
  if (state.kind === 'failed') {
    return (
      <Standing ticketKey={ticketKey} url={url}>
        <span className="text-(--status-stuck-soft-fg)">{state.reason}</span>
      </Standing>
    )
  }
  return (
    <Standing ticketKey={ticketKey} url={url}>
      <span
        className="inline-flex items-center gap-2 text-(--text-secondary)"
        aria-busy="true"
        role="status"
      >
        <Spinner size={12} />
        {TICKET_CARD_TEXT.loading}
      </span>
    </Standing>
  )
}
