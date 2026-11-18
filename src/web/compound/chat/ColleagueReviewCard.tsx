import { useState, type ReactNode } from 'react'
import { useTicketLinks } from '../../../headless/contexts/TicketLinksContext'
import { useColleagueReviewCall } from '../../../headless/hooks/useColleagueReviewCall'
import { reviewReplyToPost } from '../../../headless/utils/colleagueReviewCard'
import {
  COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
  COLLEAGUE_REVIEW_CARD_TEXT as TEXT,
} from '../../../headless/utils/colleagueReviewCardConstants'
import type {
  ColleagueReviewCardLayout,
  ColleagueReviewCardView,
  ColleagueReviewTool,
  ReviewFindingView,
  ReviewRoundView,
  ReviewWaitingOnView,
} from '../../../headless/utils/colleagueReviewCardTypes'
import { REVIEW_POST_TEXT } from '../../../headless/utils/colleagueReviewSourceConstants'
import { ticketChipView } from '../../../headless/utils/groupTickets'
import { ticketLinkOf } from '../../../headless/utils/ticketLinks'
import { IconChevron, IconExternalLink } from '../../icons'
import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Modal } from '../../primitives/Modal'
import Spinner from '../../primitives/Spinner'
import SegmentedControl from '../../primitives/SegmentedControl'
import { Textarea } from '../../primitives/Textarea'
import { CopyButton } from '../CopyButton'
import TicketChip from '../chips/TicketChip'
import TicketLinkChip from '../chips/TicketLinkChip'
import ToneBadge from '../chips/ToneBadge'

const LABEL = 'text-[10px] font-semibold tracking-wider text-(--text-muted) uppercase'
const MUTED = 'text-[12px] text-(--text-secondary)'
/** The person's own Drop and Given: as small as the reply's Copy, so a row stays one line. */
const OWNER_ACTION =
  'inline-flex h-7 shrink-0 items-center rounded border border-(--border-subtle) bg-(--surface-raised) px-2 text-[12px] text-(--text-secondary) hover:bg-(--surface-muted) hover:text-(--text-primary) focus:outline-none focus-visible:ring-2'

/** Which owner action has its note open, on which item. */
type NoteOpen = { kind: 'drop' | 'given'; id: string }

export type ColleagueReviewCardProps = {
  view: ColleagueReviewCardView
  layout?: ColleagueReviewCardLayout
  /** Drop a finding, with the person's note. Without it, Drop is not offered. */
  onDrop?: (findingId: string, note?: string) => void
  /** Mark a waited-on item given, with the person's note. Without it, Given is not offered. */
  onGiven?: (waitingOnId: string, note?: string) => void
  /** Post a round's reply in the group's Slack thread; `again` posts it a second time, `text` is the person's edit. Without it, Post in thread is not offered. */
  onPost?: (round: number, again: boolean, text?: string) => void
  /** Start with Post in thread's confirm open — for a fixed showcase state. */
  postConfirm?: boolean
  /** Start with this finding opened — for a fixed showcase state. */
  openFinding?: string
  /** Start with this note open — for a fixed showcase state. */
  noteOpen?: NoteOpen
  /** Start with the earlier rounds, or the summary's findings, opened — for a fixed showcase state. */
  expanded?: boolean
}

type Actions = Pick<ColleagueReviewCardProps, 'onDrop' | 'onGiven' | 'onPost' | 'postConfirm'> & {
  note: NoteOpen | undefined
  setNote: (note: NoteOpen | undefined) => void
  openFinding: string | undefined
}

/**
 * A ticket's colleague review on its review chat's tool rows, read live: the
 * round the call was about with its verdict, what became of each finding
 * since the round before, what the work waits on, and the drafted reply to
 * copy — or to post in the group's Slack thread after a confirm that shows
 * it, editable. On the latest round the person may drop a finding
 * or mark a wait given; what they did reads as theirs. Earlier rounds stay
 * folded.
 */
export default function ColleagueReviewCard({
  view,
  layout = COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT,
  onDrop,
  onGiven,
  onPost,
  postConfirm,
  openFinding,
  noteOpen,
  expanded = false,
}: ColleagueReviewCardProps) {
  const [note, setNote] = useState<NoteOpen | undefined>(noteOpen)
  if (view.kind === 'loading') return <p className={`m-0 ${MUTED}`}>{TEXT.loading}</p>
  if (view.kind === 'none') return <p className={`m-0 ${MUTED}`}>{view.line}</p>
  if (view.kind === 'failed') {
    return <p className="m-0 text-[12px] text-(--status-stuck-soft-fg)">{view.line}</p>
  }
  if (view.kind === 'refused') {
    return (
      <div className="flex min-w-0 flex-col gap-1 text-[12.5px]">
        <span className="font-medium text-(--status-stuck-soft-fg)">{view.line}</span>
        <ul className="m-0 flex list-disc flex-col gap-0.5 pl-4 text-(--text-secondary)">
          {view.errors.map((error) => (
            <li key={error} className="break-words">
              {error}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  const actions: Actions = { onDrop, onGiven, onPost, postConfirm, note, setNote, openFinding }
  return (
    <div className="@container flex min-w-0 flex-col gap-3 text-[12.5px]">
      {layout === 'rounds' ? (
        <RoundTabs view={view} actions={actions} />
      ) : layout === 'summary' ? (
        <Summary view={view} actions={actions} expanded={expanded} />
      ) : (
        <>
          <Header view={view} round={view.round} />
          <Notes view={view} />
          <RoundBody round={view.round} actions={actions} />
          <Earlier view={view} expanded={expanded} actions={actions} />
        </>
      )}
    </div>
  )
}

type ReviewShown = Extract<ColleagueReviewCardView, { kind: 'review' }>

function TicketOf({ view }: { view: ReviewShown }) {
  const site = useTicketLinks()?.site
  const link = view.ticketUrl ? ticketLinkOf(view.ticketUrl, site) : undefined
  return link ? (
    <TicketLinkChip link={link} />
  ) : (
    <TicketChip view={ticketChipView({ key: view.ticketKey, url: view.ticketUrl })} />
  )
}

function Verdict({ round }: { round: ReviewRoundView }) {
  return round.verdictLabel && round.verdictTone ? (
    <ToneBadge tone={round.verdictTone}>{round.verdictLabel}</ToneBadge>
  ) : (
    <span className="shrink-0 text-[11.5px] text-(--text-muted)">{TEXT.reviewing}</span>
  )
}

function Header({ view, round }: { view: ReviewShown; round: ReviewRoundView }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <TicketOf view={view} />
      <span className="font-semibold text-(--text-primary)">{round.title}</span>
      <Verdict round={round} />
      {round.files > 0 ? (
        <span className="shrink-0 text-[11.5px] text-(--text-muted)">
          {TEXT.files(round.files)}
        </span>
      ) : null}
    </div>
  )
}

function Notes({ view }: { view: ReviewShown }) {
  return (
    <>
      {view.laterNote ? <p className={`m-0 ${MUTED}`}>{view.laterNote}</p> : null}
      {view.actionError ? (
        <p role="alert" className="m-0 text-[12px] text-(--status-stuck-soft-fg)">
          {view.actionError}
        </p>
      ) : null}
    </>
  )
}

function RoundBody({ round, actions }: { round: ReviewRoundView; actions: Actions }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {round.groups.map((group) => (
        <section key={group.id} aria-label={group.label} className="flex min-w-0 flex-col gap-1">
          <span className={LABEL}>{group.label}</span>
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-md border border-(--border-subtle) p-0">
            {group.findings.map((finding, at) => (
              <FindingRow key={finding.id} finding={finding} divided={at > 0} actions={actions} />
            ))}
          </ul>
        </section>
      ))}
      {round.recorded && round.groups.length === 0 ? (
        <p className={`m-0 ${MUTED}`}>{TEXT.nothingFound}</p>
      ) : null}
      {round.waitingOn.length > 0 ? (
        <section aria-label={TEXT.waitingOn} className="flex min-w-0 flex-col gap-1">
          <span className={LABEL}>{TEXT.waitingOn}</span>
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-md border border-(--border-subtle) p-0">
            {round.waitingOn.map((item, at) => (
              <WaitingRow key={item.id} item={item} divided={at > 0} actions={actions} />
            ))}
          </ul>
        </section>
      ) : null}
      {round.reply ? <Reply round={round} reply={round.reply} actions={actions} /> : null}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <IconChevron
      className="size-3.5 shrink-0 text-(--text-muted) transition-transform"
      style={{ transform: `rotate(${open ? 90 : 0}deg)` }}
    />
  )
}

function FindingRow({
  finding,
  divided,
  actions,
}: {
  finding: ReviewFindingView
  divided: boolean
  actions: Actions
}) {
  const [open, setOpen] = useState(actions.openFinding === finding.id)
  const noting = actions.note?.kind === 'drop' && actions.note.id === finding.id
  const canDrop = finding.canDrop && actions.onDrop !== undefined
  return (
    <li className={divided ? 'border-t border-(--border-subtle)' : undefined}>
      <div className="flex min-w-0 items-start gap-2 px-2.5 py-1.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          className={`flex min-w-0 flex-1 items-start gap-2 text-left ${finding.saving ? 'opacity-60' : ''}`}
        >
          <span className="mt-0.5">
            <Chevron open={open} />
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 break-words text-(--text-primary)">{finding.title}</span>
            <span className="chip">{finding.kindLabel}</span>
            <ToneBadge tone={finding.tone}>{finding.stateLabel}</ToneBadge>
          </span>
        </button>
        {canDrop && !noting ? (
          <button
            type="button"
            className={OWNER_ACTION}
            onClick={(e) => {
              e.stopPropagation()
              actions.setNote({ kind: 'drop', id: finding.id })
            }}
          >
            {TEXT.drop}
          </button>
        ) : null}
      </div>
      {noting ? (
        <NoteConfirm
          confirm={TEXT.drop}
          onConfirm={(note) => {
            actions.setNote(undefined)
            actions.onDrop?.(finding.id, note)
          }}
          onCancel={() => actions.setNote(undefined)}
        />
      ) : null}
      {open ? (
        <div className="flex min-w-0 flex-col gap-1.5 px-2.5 pb-2 pl-8 text-(--text-secondary)">
          <p className="m-0 break-words whitespace-pre-wrap">{finding.detail}</p>
          {finding.note ? <p className="m-0 break-words italic">{finding.note}</p> : null}
          {finding.state !== 'dropped' ? <Evidence lines={finding.evidence} /> : null}
        </div>
      ) : null}
    </li>
  )
}

function Evidence({ lines }: { lines: readonly string[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={LABEL}>{TEXT.evidence}</span>
      {lines.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {lines.map((line) => (
            <li key={line} className="break-words font-mono text-[11.5px] text-(--text-primary)">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-[11.5px] text-(--text-muted)">{TEXT.noEvidence}</span>
      )}
    </div>
  )
}

function WaitingRow({
  item,
  divided,
  actions,
}: {
  item: ReviewWaitingOnView
  divided: boolean
  actions: Actions
}) {
  const noting = actions.note?.kind === 'given' && actions.note.id === item.id
  const canGive = item.canMarkGiven && actions.onGiven !== undefined
  return (
    <li className={divided ? 'border-t border-(--border-subtle)' : undefined}>
      <div
        className={`flex min-w-0 items-start gap-2 px-2.5 py-1.5 ${item.saving ? 'opacity-60' : ''}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-(--text-primary)">{item.who}</span>
            <ToneBadge tone={item.tone}>{item.stateLabel}</ToneBadge>
          </span>
          <span className="min-w-0 break-words text-(--text-secondary)">{item.what}</span>
          {item.note ? (
            <span className="min-w-0 break-words text-(--text-muted) italic">{item.note}</span>
          ) : null}
          {item.evidence.length > 0 ? (
            <span className="min-w-0 break-words font-mono text-[11.5px] text-(--text-muted)">
              {item.evidence.join(' · ')}
            </span>
          ) : null}
        </span>
        {canGive && !noting ? (
          <button
            type="button"
            className={OWNER_ACTION}
            onClick={(e) => {
              e.stopPropagation()
              actions.setNote({ kind: 'given', id: item.id })
            }}
          >
            {TEXT.given}
          </button>
        ) : null}
      </div>
      {noting ? (
        <NoteConfirm
          confirm={TEXT.given}
          onConfirm={(note) => {
            actions.setNote(undefined)
            actions.onGiven?.(item.id, note)
          }}
          onCancel={() => actions.setNote(undefined)}
        />
      ) : null}
    </li>
  )
}

function NoteConfirm({
  confirm,
  onConfirm,
  onCancel,
}: {
  confirm: string
  onConfirm: (note: string | undefined) => void
  onCancel: () => void
}) {
  const [note, setNote] = useState('')
  const done = () => onConfirm(note.trim() || undefined)
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2 pl-8"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        aria-label={TEXT.note}
        placeholder={TEXT.note}
        value={note}
        autoFocus
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') done()
          if (e.key === 'Escape') onCancel()
        }}
        className="h-7 min-w-0 flex-1 basis-[180px] text-[12px]"
      />
      <Button size="sm" variant="secondary" onClick={done}>
        {confirm}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        {TEXT.cancel}
      </Button>
    </div>
  )
}

function Reply({
  round,
  reply,
  actions,
}: {
  round: ReviewRoundView
  reply: string
  actions: Actions
}) {
  const { post } = round
  const shown = post?.posted?.text ?? reply
  const [confirming, setConfirming] = useState(Boolean(actions.postConfirm))
  const [typed, setTyped] = useState(shown)
  const onPost = post?.canPost ? actions.onPost : undefined
  const again = post?.posted !== undefined
  return (
    <section aria-label={TEXT.reply} className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className={LABEL}>{TEXT.reply}</span>
        {post?.posted ? (
          <a
            href={post.posted.permalink}
            target="_blank"
            rel="noreferrer noopener"
            title={new Date(post.posted.postedAt).toLocaleString()}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-w-0 flex-1 items-center gap-1 text-[11.5px] text-(--accent-primary) hover:underline"
          >
            <span className="truncate">{REVIEW_POST_TEXT.posted}</span>
            <IconExternalLink className="size-3 shrink-0" />
          </a>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11px] text-(--text-muted)">
            {onPost ? REVIEW_POST_TEXT.hintPost : TEXT.replyHint}
          </span>
        )}
        {onPost ? (
          <button
            type="button"
            className={`${OWNER_ACTION} gap-1 disabled:cursor-default disabled:opacity-70`}
            disabled={post?.posting}
            aria-busy={post?.posting || undefined}
            onClick={(e) => {
              e.stopPropagation()
              setTyped(shown)
              setConfirming(true)
            }}
          >
            {post?.posting ? <Spinner size={12} /> : null}
            {post?.posting
              ? REVIEW_POST_TEXT.posting
              : again
                ? REVIEW_POST_TEXT.postAgain
                : REVIEW_POST_TEXT.post}
          </button>
        ) : null}
        <CopyButton text={shown} label={TEXT.copy} title={TEXT.copy} />
      </div>
      {onPost ? (
        <PostConfirm
          open={confirming}
          again={again}
          reply={reply}
          typed={typed}
          onType={setTyped}
          onClose={() => setConfirming(false)}
          onPost={(text) => {
            setConfirming(false)
            onPost(round.n, again, text)
          }}
        />
      ) : null}
      <div className="max-h-[320px] overflow-y-auto rounded-md border border-(--border-subtle) bg-(--surface-raised) px-2.5 py-2 break-words whitespace-pre-wrap text-(--text-primary)">
        {shown}
      </div>
    </section>
  )
}

function PostConfirm({
  open,
  again,
  reply,
  typed,
  onType,
  onClose,
  onPost,
}: {
  open: boolean
  again: boolean
  /** The drafted reply: Post sends the person's text only when it differs. */
  reply: string
  typed: string
  onType: (text: string) => void
  onClose: () => void
  onPost: (text: string | undefined) => void
}) {
  const toPost = reviewReplyToPost(reply, typed)
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="md"
      title={again ? REVIEW_POST_TEXT.confirmAgainTitle : REVIEW_POST_TEXT.confirmTitle}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {REVIEW_POST_TEXT.cancel}
          </Button>
          <Button variant="primary" disabled={!toPost.canPost} onClick={() => onPost(toPost.text)}>
            {again ? REVIEW_POST_TEXT.confirmAgain : REVIEW_POST_TEXT.confirm}
          </Button>
        </div>
      }
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="m-0 text-sm text-(--text-secondary)">
          {again ? REVIEW_POST_TEXT.confirmAgainBody : REVIEW_POST_TEXT.confirmBody}
        </p>
        <Textarea
          aria-label={TEXT.reply}
          value={typed}
          onChange={(e) => onType(e.target.value)}
          rows={10}
          className="max-h-[50vh] min-h-[160px] resize-y text-[13px]"
        />
      </div>
    </Modal>
  )
}

function Disclosure({
  label,
  open,
  onToggle,
  children,
}: {
  label: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className="flex min-w-0 items-center gap-1.5 self-start text-left text-[12px] text-(--text-secondary) hover:text-(--text-primary)"
      >
        <Chevron open={open} />
        {label}
      </button>
      {open ? children : null}
    </div>
  )
}

const READ_ONLY = (actions: Actions): Actions => ({
  ...actions,
  onDrop: undefined,
  onGiven: undefined,
  onPost: undefined,
})

function EarlierRound({ round, actions }: { round: ReviewRoundView; actions: Actions }) {
  const [open, setOpen] = useState(false)
  return (
    <Disclosure
      open={open}
      onToggle={() => setOpen((v) => !v)}
      label={
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-(--text-primary)">{TEXT.roundTab(round.n)}</span>
          <Verdict round={round} />
          <span className="text-(--text-muted)">{round.summary}</span>
        </span>
      }
    >
      <div className="border-l-2 border-(--border-subtle) pl-3">
        <RoundBody round={round} actions={READ_ONLY(actions)} />
      </div>
    </Disclosure>
  )
}

function Earlier({
  view,
  expanded,
  actions,
}: {
  view: ReviewShown
  expanded: boolean
  actions: Actions
}) {
  const [open, setOpen] = useState(expanded)
  const earlier = view.rounds.filter((r) => r.n < view.round.n).reverse()
  if (earlier.length === 0) return null
  return (
    <div className="border-t border-(--border-subtle) pt-2">
      <Disclosure
        open={open}
        onToggle={() => setOpen((v) => !v)}
        label={TEXT.earlier(earlier.length)}
      >
        <div className="flex min-w-0 flex-col gap-2 pl-5">
          {earlier.map((round) => (
            <EarlierRound key={round.n} round={round} actions={actions} />
          ))}
        </div>
      </Disclosure>
    </div>
  )
}

function RoundTabs({ view, actions }: { view: ReviewShown; actions: Actions }) {
  const [shown, setShown] = useState(view.round.n)
  const round = view.rounds.find((r) => r.n === shown) ?? view.round
  const own = round.n === view.round.n
  return (
    <>
      <Header view={view} round={round} />
      {view.rounds.length > 1 ? (
        <SegmentedControl
          ariaLabel={TEXT.heading}
          size="sm"
          className="self-start"
          value={String(round.n)}
          onChange={(next) => setShown(Number(next))}
          options={view.rounds.map((r) => ({ value: String(r.n), label: TEXT.roundTab(r.n) }))}
        />
      ) : null}
      {own ? <Notes view={view} /> : null}
      <RoundBody round={round} actions={own ? actions : READ_ONLY(actions)} />
    </>
  )
}

function withoutReply(round: ReviewRoundView): ReviewRoundView {
  const { reply: _shownAbove, ...rest } = round
  return rest
}

function Summary({
  view,
  actions,
  expanded,
}: {
  view: ReviewShown
  actions: Actions
  expanded: boolean
}) {
  const [open, setOpen] = useState(expanded)
  const { round } = view
  const hasMore = round.groups.length > 0 || round.waitingOn.length > 0
  return (
    <>
      <Header view={view} round={round} />
      <p className="m-0 text-(--text-primary)">{round.summary}</p>
      <Notes view={view} />
      {round.reply ? <Reply round={round} reply={round.reply} actions={actions} /> : null}
      {hasMore ? (
        <Disclosure
          open={open}
          onToggle={() => setOpen((v) => !v)}
          label={open ? TEXT.hideAll : TEXT.showAll}
        >
          <RoundBody round={withoutReply(round)} actions={actions} />
          <Earlier view={view} expanded={false} actions={actions} />
        </Disclosure>
      ) : null}
    </>
  )
}

export type ColleagueReviewConnectedProps = {
  tool: ColleagueReviewTool
  args?: unknown
  result?: unknown
  resultType?: string
  layout?: ColleagueReviewCardLayout
}

/**
 * {@link ColleagueReviewCard} on a review tool's row: the review read live for
 * the round the call was about, the person's Drop and Given sent from it.
 */
export function ColleagueReviewConnected({
  tool,
  args,
  result,
  resultType,
  layout,
}: ColleagueReviewConnectedProps) {
  const { view, dropFinding, markGiven, postReply } = useColleagueReviewCall({
    tool,
    args,
    result,
    resultType,
  })
  return (
    <ColleagueReviewCard
      view={view}
      layout={layout ?? (tool === 'read' ? 'summary' : COLLEAGUE_REVIEW_CARD_DEFAULT_LAYOUT)}
      onDrop={dropFinding}
      onGiven={markGiven}
      onPost={postReply}
    />
  )
}
