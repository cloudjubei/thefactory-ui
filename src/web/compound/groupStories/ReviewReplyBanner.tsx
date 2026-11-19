import { useState, type ReactNode } from 'react'

import {
  REVIEW_REPLY_BANNER_DEFAULT_LAYOUT,
  REVIEW_REPLY_TEXT as TEXT,
  type ReviewCommitsView,
  type ReviewReplyBannerLayout,
  type ReviewReplyView,
} from '../../../headless'
import { IconChat, IconCommit } from '../../icons'
import { Button } from '../../primitives/Button'
import Spinner from '../../primitives/Spinner'

/** How each tone of what was pushed since review reads. */
export const REVIEW_COMMITS_TONE_CLASS: Record<ReviewCommitsView['tone'], string> = {
  news: 'font-medium text-(--accent-primary)',
  warn: 'font-medium text-(--status-working-soft-fg)',
  quiet: 'text-(--text-muted)',
}

/** Who replied and when, then what was pushed since the last round, toned. */
export function ReviewReplyLine({ view }: { view: ReviewReplyView }) {
  return (
    <span className="min-w-0">
      <IconChat className="mr-1.5 inline size-3.5 align-[-3px] text-(--accent-primary)" />
      <span className="font-medium text-(--text-primary)">{view.who}</span>
      <span className="text-(--text-muted)"> · {view.when}</span>
      {view.commits ? (
        <>
          <span className="text-(--text-muted)"> · </span>
          <span className={REVIEW_COMMITS_TONE_CLASS[view.commits.tone]}>{view.commits.label}</span>
        </>
      ) : null}
    </span>
  )
}

/** What the reply says, cut to a few lines until opened, and how many files came with it. */
export function ReviewReplyText({
  view,
  expanded = false,
}: {
  view: ReviewReplyView
  expanded?: boolean
}) {
  const [open, setOpen] = useState(expanded)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="m-0 whitespace-pre-wrap break-words rounded-md border border-(--border-subtle) bg-(--surface-sunken) px-2.5 py-2 text-[12.5px] text-(--text-primary)">
        {open ? view.text : view.preview}
      </p>
      {view.cut || view.filesLabel ? (
        <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-(--text-secondary)">
          {view.cut ? (
            <button type="button" className="underline" onClick={() => setOpen((o) => !o)}>
              {open ? TEXT.showLess : TEXT.showAll}
            </button>
          ) : null}
          {view.filesLabel ? <span>{view.filesLabel}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

export type ReviewReplyBannerProps = {
  reply?: ReviewReplyView | undefined
  /** What was pushed since review, said alone while no reply waits. */
  commits?: ReviewCommitsView | undefined
  layout?: ReviewReplyBannerLayout
  /** What Start says while the round starts. */
  starting?: string | undefined
  /** The review run still going: it starts its next round itself, so the banner opens it. */
  onOpenRun?: (() => void) | undefined
  /** Open the paste box on the reply, as Next round does. */
  onStart: () => void
  onOpenChat?: (() => void) | undefined
  /** Start with the whole reply showing — for a fixed showcase state. */
  expanded?: boolean
}

/**
 * A reply waiting on the ticket's review, on top of its page: who replied and
 * when, what was pushed since the last round, what they wrote and its files,
 * and Start round N — or, while a review run holds the review, Open run.
 * As a strip above the page's parts, or a line under the header that opens.
 * Without a reply, what was pushed since review in one quiet line.
 */
export default function ReviewReplyBanner({
  reply,
  commits,
  layout = REVIEW_REPLY_BANNER_DEFAULT_LAYOUT,
  starting,
  onOpenRun,
  onStart,
  onOpenChat,
  expanded = false,
}: ReviewReplyBannerProps) {
  const [open, setOpen] = useState(expanded)
  if (!reply) {
    if (!commits) return null
    return (
      <p className="m-0 flex min-w-0 items-center gap-1.5 text-[12.5px]">
        <IconCommit className="size-3.5 shrink-0 text-(--text-muted)" />
        <span className={REVIEW_COMMITS_TONE_CLASS[commits.tone]}>{commits.label}</span>
      </p>
    )
  }
  const buttons: ReactNode = (
    <div className="flex flex-wrap items-center gap-1.5">
      {onOpenRun ? (
        <Button size="sm" variant="primary" onClick={onOpenRun}>
          {TEXT.openRun}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={starting !== undefined}
          aria-busy={starting !== undefined || undefined}
          onClick={onStart}
        >
          {starting !== undefined ? <Spinner size={12} /> : null}
          {starting ?? reply.startLabel}
        </Button>
      )}
      {onOpenChat ? (
        <Button size="sm" variant="secondary" onClick={onOpenChat}>
          {TEXT.openChat}
        </Button>
      ) : null}
    </div>
  )
  if (layout === 'line') {
    return (
      <section aria-label={reply.line} className="flex min-w-0 flex-col gap-2 text-[12.5px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <ReviewReplyLine view={reply} />
          <button
            type="button"
            className="text-[11.5px] text-(--text-secondary) underline"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? TEXT.hide : TEXT.show}
          </button>
          <span className="ml-auto">{buttons}</span>
        </div>
        {open ? <ReviewReplyText view={reply} expanded /> : null}
      </section>
    )
  }
  return (
    <section
      aria-label={reply.line}
      className="flex min-w-0 flex-col gap-2 rounded-lg p-3 text-[12.5px]"
      style={{
        background: 'var(--status-review-soft-bg)',
        border: '1px solid var(--status-review-soft-border)',
      }}
    >
      <ReviewReplyLine view={reply} />
      <ReviewReplyText view={reply} expanded={expanded} />
      {buttons}
    </section>
  )
}
