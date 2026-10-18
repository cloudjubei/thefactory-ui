import { useState, type ReactNode } from 'react'
import type {
  ProcessManagerBriefCard,
  ProcessManagerChatCard,
  ProcessManagerEscalationCard,
  ProcessManagerInterventionCard,
  ProcessManagerPreReadCard,
  ReferenceTarget,
  ResourceLink,
} from 'thefactory-tools/types'
import { useManagerCardStanding } from '../../../headless/hooks/useManagerCardStanding'
import type {
  ManagerInterventionStanding,
  ManagerPreReadStanding,
} from '../../../headless/utils/managerCardsTypes'
import type { ParkStanding } from '../../../headless/utils/processParkStandingTypes'
import {
  MANAGER_BRIEF_ANSWERS,
  MANAGER_BRIEF_HIDE_WORDS,
  MANAGER_BRIEF_SHOW_WORDS,
  MANAGER_BRIEF_STOPPED,
  MANAGER_BRIEF_TO_AGENT,
  MANAGER_BRIEF_TRIED,
  MANAGER_ESCALATION_FOUND,
  MANAGER_ESCALATION_HIDE_DETAIL,
  MANAGER_ESCALATION_RECOMMENDS,
  MANAGER_ESCALATION_SHOW_DETAIL,
  MANAGER_ESCALATION_TRIED,
  MANAGER_OUTCOME_DID,
  MANAGER_OUTCOME_HIDE_WORDS,
  MANAGER_OUTCOME_LEFT_YOU,
  MANAGER_OUTCOME_RESULT,
  MANAGER_OUTCOME_SHOW_WORDS,
  MANAGER_OUTCOME_STILL_OPEN,
  MANAGER_OUTCOME_WHY,
} from '../../../headless/utils/managerCardsConstants'
import {
  managerBriefView,
  managerEscalationView,
  managerOutcomeView,
} from '../../../headless/utils/managerCards'
import {
  IconAgent,
  IconCheck,
  IconChevronRight,
  IconClipboardCheck,
  IconWarningTriangle,
} from '../../icons'
import Markdown from '../Markdown'
import { CirclingNotice } from '../process/CirclingNotice'
import ParkClosureLine from './ParkClosureLine'

/** How a manager card renders references and in-app links in what it quotes. */
export type ManagerCardLinks = {
  renderReference?: (target: ReferenceTarget) => ReactNode | undefined
  onResourceLink?: (link: ResourceLink) => void
}

const CAPTION = 'text-[11px] font-semibold uppercase tracking-wide text-(--text-secondary)'

function Pill({ tone, children }: { tone: 'handled' | 'needs-you'; children: ReactNode }) {
  const style =
    tone === 'needs-you'
      ? {
          background: 'var(--status-on_hold-soft-bg)',
          color: 'var(--status-on_hold-soft-fg)',
          borderColor: 'var(--status-on_hold-soft-border)',
        }
      : {
          background: 'var(--status-empty-soft-bg)',
          color: 'var(--status-empty-soft-fg)',
          borderColor: 'var(--status-empty-soft-border)',
        }
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2 text-[11px] font-semibold leading-[18px] whitespace-nowrap"
      style={style}
    >
      {children}
    </span>
  )
}

function Quote({ text, links }: { text: string; links: ManagerCardLinks }) {
  return (
    <Markdown
      text={text}
      onResourceLink={links.onResourceLink}
      renderReference={links.renderReference}
      typedReferences
    />
  )
}

/** The line between manager turns: where the run stopped, and when. */
export function ManagerStopLine({ card }: { card: ProcessManagerBriefCard }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px] text-(--text-secondary)">
      <span className="h-px flex-1 bg-(--border-subtle)" />
      <span>{managerBriefView(card).stopLine}</span>
      <span className="h-px flex-1 bg-(--border-subtle)" />
    </div>
  )
}

/** The manager's brief as a grey one-line card, opening to what stopped, the answers it takes and what was tried. */
export function ManagerBriefCardView({
  card,
  words,
  defaultOpen = false,
  links,
}: {
  card: ProcessManagerBriefCard
  /** The brief as the agent got it. */
  words?: string
  defaultOpen?: boolean
  links: ManagerCardLinks
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [showWords, setShowWords] = useState(false)
  const view = managerBriefView(card)
  return (
    <div className="overflow-hidden rounded-[10px] border border-(--border-subtle) bg-(--surface-raised)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-(--text-secondary) hover:bg-(--surface-hover)"
      >
        <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-(--surface-overlay) text-(--text-secondary)">
          <IconAgent className="h-3 w-3" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="font-semibold text-(--text-primary)">{MANAGER_BRIEF_TO_AGENT}</b> ·{' '}
          {view.line}
        </span>
        <Pill tone="handled">{view.mode}</Pill>
        <IconChevronRight
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open ? (
        <div className="grid gap-3.5 border-t border-(--border-subtle) py-3 pr-3.5 pl-11 [grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr))]">
          {view.circling ? (
            <div className="col-span-full">
              <CirclingNotice view={view.circling} showHint={false} />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <div className={CAPTION}>{MANAGER_BRIEF_STOPPED}</div>
            <div className="text-[13px] leading-normal text-(--text-primary)">{view.stopped}</div>
            {view.failed.map((f) => (
              <code key={f} className="text-[11.5px] text-(--text-secondary)">
                {f}
              </code>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className={CAPTION}>{MANAGER_BRIEF_ANSWERS}</div>
            {view.answers.map((a) => (
              <div
                key={a.key}
                className="flex items-baseline gap-1.5 text-[12.5px] text-(--text-secondary)"
              >
                <code className="rounded bg-(--surface-overlay) px-1.5 text-[11.5px] text-(--text-primary)">
                  {a.key}
                </code>
                <span>{a.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className={CAPTION}>{MANAGER_BRIEF_TRIED}</div>
            <div className="text-[12.5px] leading-normal whitespace-pre-line text-(--text-secondary)">
              {view.tried}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-(--text-secondary)">
              <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-(--surface-overlay)">
                <span
                  className="h-full"
                  style={{
                    width: `${Math.round(view.triesShare * 100)}%`,
                    background: 'var(--status-on_hold-bg)',
                  }}
                />
              </span>
              <span className="font-mono">{view.tries}</span>
            </div>
            <div className="text-[11.5px] text-(--text-secondary)">{view.limits}</div>
          </div>
          {words ? (
            <div className="col-span-full flex flex-col gap-2">
              <button
                type="button"
                className="self-start text-[12.5px] text-(--accent-primary) hover:underline"
                onClick={() => setShowWords((s) => !s)}
              >
                {showWords ? MANAGER_BRIEF_HIDE_WORDS : MANAGER_BRIEF_SHOW_WORDS}
              </button>
              {showWords ? (
                <div className="text-[13px] text-(--text-primary)">
                  <Quote text={words} links={links} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** What came of a manager turn: headline, Handled or what needs you, why, what is still open, and the call it made. */
export function ManagerOutcomeCardView({
  card,
  standing,
  reply,
  at,
  links,
}: {
  card: ProcessManagerInterventionCard | ProcessManagerPreReadCard
  /** How the run has it now; without it the card reads as posted. */
  standing?: ManagerInterventionStanding | ManagerPreReadStanding
  /** What the agent said at the end of its turn. */
  reply?: string
  at?: string
  links: ManagerCardLinks
}) {
  const [showReply, setShowReply] = useState(false)
  const view = managerOutcomeView(card, standing)
  const needsYou = view.tone === 'needs-you'
  return (
    <div
      className="overflow-hidden rounded-xl border bg-(--surface-raised)"
      style={{
        borderColor: needsYou ? 'var(--status-on_hold-soft-border)' : 'var(--border-subtle)',
      }}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={
            needsYou
              ? {
                  background: 'var(--status-on_hold-soft-bg)',
                  color: 'var(--status-on_hold-soft-fg)',
                }
              : { background: 'var(--status-done-soft-bg)', color: 'var(--status-done-soft-fg)' }
          }
        >
          {needsYou ? (
            <IconClipboardCheck className="h-4 w-4" />
          ) : (
            <IconCheck className="h-4 w-4" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold text-(--text-primary)">
              {view.headline}
            </span>
            <Pill tone={view.tone}>{view.pill}</Pill>
            {at ? (
              <span className="ml-auto text-[11.5px] text-(--text-secondary)">{at}</span>
            ) : null}
          </div>
          <div className="text-[13px] leading-normal text-(--text-secondary)">
            <b className="font-semibold text-(--text-primary)">{MANAGER_OUTCOME_WHY}</b> {view.why}
          </div>
          {view.result ? (
            <div className="text-[13px] leading-normal text-(--text-secondary)">
              <b className="font-semibold text-(--text-primary)">{MANAGER_OUTCOME_RESULT}</b>{' '}
              {view.result}
            </div>
          ) : null}
          {view.closure ? <ParkClosureLine closure={view.closure} /> : null}
        </div>
      </div>
      {view.open.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-(--border-subtle) py-2.5 pr-3.5 pl-[54px]">
          <div className={CAPTION}>
            {view.tone === 'needs-you' ? MANAGER_OUTCOME_STILL_OPEN : MANAGER_OUTCOME_LEFT_YOU}
          </div>
          {view.open.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 text-[13px] text-(--text-primary)"
            >
              {item.settled || view.closure ? (
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--text-secondary)" />
              ) : (
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: 'var(--status-on_hold-bg)' }}
                />
              )}
              <div
                className={`min-w-0 flex-1 ${item.settled || view.closure ? 'text-(--text-secondary)' : ''}`}
              >
                <Quote text={item.text} links={links} />
                {item.settled ? (
                  <div className="mt-0.5 text-[12px] text-(--text-secondary)">{item.settled}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3.5 border-t border-(--border-subtle) py-2 pr-3.5 pl-[54px] text-[12px] text-(--text-secondary)">
        <span>
          {MANAGER_OUTCOME_DID}{' '}
          <code className="text-[11.5px] text-(--text-primary)">{view.did}</code>
        </span>
        {reply ? (
          <button
            type="button"
            className="text-[12.5px] text-(--accent-primary) hover:underline"
            aria-expanded={showReply}
            onClick={() => setShowReply((s) => !s)}
          >
            {showReply ? MANAGER_OUTCOME_HIDE_WORDS : MANAGER_OUTCOME_SHOW_WORDS}
          </button>
        ) : null}
      </div>
      {reply && showReply ? (
        <div className="border-t border-(--border-subtle) py-2.5 pr-3.5 pl-[54px] text-[13px] text-(--text-primary)">
          <Quote text={reply} links={links} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * A park the manager handed to the person: why it is theirs, what happened,
 * what it found and tried, what it recommends, and the run's live chip. Once
 * the run no longer waits at the park it is history: headed by how it was
 * closed, what the manager found folded away, and no chip to answer it from.
 */
export function ManagerEscalationCardView({
  card,
  standing,
  links,
  children,
}: {
  card: ProcessManagerEscalationCard
  /** Where the park stands now; without it the card reads as posted. */
  standing?: ParkStanding
  links: ManagerCardLinks
  /** The run's live chip, where the person answers it. */
  children?: ReactNode
}) {
  const [showDetail, setShowDetail] = useState(false)
  const view = managerEscalationView(card, standing)
  const closure = view.closure
  const detail = (
    <>
      <div className="flex flex-col gap-0.5 text-[13px] text-(--text-primary)">
        <b className="font-semibold">{MANAGER_ESCALATION_FOUND}</b>
        <Quote text={view.found} links={links} />
      </div>
      {view.tried.length > 0 ? (
        <div className="flex flex-col gap-1 text-[13px] text-(--text-secondary)">
          <b className="font-semibold text-(--text-primary)">{MANAGER_ESCALATION_TRIED}</b>
          {view.tried.map((t) => (
            <span key={t}>– {t}</span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5 text-[13px] text-(--text-primary)">
        <b className="font-semibold">{MANAGER_ESCALATION_RECOMMENDS}</b>
        <Quote text={view.recommendation} links={links} />
      </div>
    </>
  )
  if (closure) {
    return (
      <div className="overflow-hidden rounded-xl border border-(--border-subtle) bg-(--surface-raised)">
        <ParkClosureLine closure={closure} banner />
        <div className="flex flex-col gap-2 px-3.5 py-3">
          <div className="text-[13.5px] leading-snug font-semibold text-(--text-secondary)">
            {view.headline}
          </div>
          <div className="text-[13px] leading-normal whitespace-pre-line text-(--text-secondary)">
            {view.what}
          </div>
          <button
            type="button"
            aria-expanded={showDetail}
            className="self-start text-[12.5px] text-(--accent-primary) hover:underline"
            onClick={() => setShowDetail((s) => !s)}
          >
            {showDetail ? MANAGER_ESCALATION_HIDE_DETAIL : MANAGER_ESCALATION_SHOW_DETAIL}
          </button>
          {showDetail ? detail : null}
        </div>
      </div>
    )
  }
  return (
    <div
      className="overflow-hidden rounded-xl border-[1.5px] bg-(--surface-raised)"
      style={{ borderColor: 'var(--status-on_hold-bg)' }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-semibold"
        style={{
          background: 'var(--status-on_hold-soft-bg)',
          color: 'var(--status-on_hold-soft-fg)',
        }}
      >
        <IconWarningTriangle className="h-4 w-4" />
        {view.title}
      </div>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        <div className="text-[14.5px] leading-snug font-semibold text-(--text-primary)">
          {view.headline}
        </div>
        <div className="text-[13px] leading-normal whitespace-pre-line text-(--text-secondary)">
          {view.what}
        </div>
        {detail}
        {children}
      </div>
    </div>
  )
}

/**
 * A message's manager card drawn on its own — an outcome, or an escalation —
 * read live off the run it was posted for (`processRunId`), so what was
 * answered, settled or undone anywhere shows here at once. A brief is drawn by
 * its exchange.
 */
export function ManagerCardView({
  card,
  processRunId,
  at,
  reply,
  links,
  children,
}: {
  card: Exclude<ProcessManagerChatCard, ProcessManagerBriefCard>
  /** The run the card was posted for — the top-level run keeping the manager's record. */
  processRunId?: string
  at?: string
  /** What the agent said at the end of the turn the card reports on. */
  reply?: string
  links: ManagerCardLinks
  children?: ReactNode
}) {
  const live = useManagerCardStanding(card, processRunId)
  if (card.kind === 'escalation') {
    return (
      <ManagerEscalationCardView
        card={card}
        {...(live.kind === 'escalation' ? { standing: live.standing } : {})}
        links={links}
      >
        {children}
      </ManagerEscalationCardView>
    )
  }
  return (
    <ManagerOutcomeCardView
      card={card}
      {...(live.kind !== 'escalation' ? { standing: live.standing } : {})}
      {...(at ? { at } : {})}
      {...(reply ? { reply } : {})}
      links={links}
    />
  )
}
