import { useState } from 'react'

import { CHAT_CHANGES_DOCK_COPY } from '../../../headless/utils/chatChangesDockConstants'
import type { ChatChangesBarView } from '../../../headless/utils/chatChangesDockTypes'
import { OPEN_CHANGES_NOTICE_COPY } from '../../../headless/utils/openChangesNoticeConstants'
import { IconFile } from '../../icons'
import { Button } from '../../primitives/Button'
import { TONE_CHIP, TONE_TEXT } from './signoff'

export type ChatChangesBarProps = {
  view: ChatChangesBarView
  /**
   * One line, under a question or an approval that holds the message box: the
   * decision stays in reach without squeezing what the agent waits on.
   */
  compact?: boolean
  /**
   * A phone-wide chat: one row — what waits and what the checks said on the
   * left, Review on the right — the whole row opening the review, where Discard
   * lives.
   */
  narrow?: boolean
  onReview: () => void
  onDiscard: () => void
}

/**
 * The decision on the chat's open changes, docked above the message box while
 * they wait: how many files, what the checks said, whether they still fit the
 * checkout, how long they have waited — Discard (confirmed) and Review, which
 * opens the full review beside or over the chat.
 */
export function ChatChangesBar({
  view,
  compact = false,
  narrow = false,
  onReview,
  onDiscard,
}: ChatChangesBarProps) {
  const [confirming, setConfirming] = useState(false)
  const verdict = view.verdict ? (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE_CHIP[view.verdict.tone]}`}
    >
      {view.verdict.label}
    </span>
  ) : null

  if (narrow) {
    const rest = [view.waited, view.unfit].filter((part): part is string => part !== undefined)
    return (
      <div className="shrink-0 px-2.5 pb-1.5 pt-1.5" data-chat-changes-bar="narrow">
        <button
          type="button"
          onClick={onReview}
          className={`flex w-full items-center gap-2 rounded-xl border border-(--border-default) bg-(--surface-raised) pl-3 pr-2 text-left hover:bg-(--surface-hover) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) ${
            compact ? 'min-h-10 py-1' : 'min-h-13 py-2'
          }`}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13.5px] font-semibold text-(--text-primary)">
              {view.shortTitle}
              {compact && view.verdict ? (
                <span className={`font-normal ${TONE_TEXT[view.verdict.tone]}`}>
                  {` · ${view.verdict.label}`}
                </span>
              ) : null}
            </span>
            {!compact && (view.verdict || rest.length > 0) ? (
              <span className="truncate text-[11.5px] text-(--text-secondary)">
                {view.verdict ? (
                  <span className={TONE_TEXT[view.verdict.tone]}>{view.verdict.label}</span>
                ) : null}
                {rest.length > 0 ? (
                  <span
                    className={
                      view.overdue || view.unfit ? 'text-(--status-on_hold-soft-fg)' : undefined
                    }
                  >
                    {`${view.verdict ? ' · ' : ''}${rest.join(' · ')}`}
                  </span>
                ) : null}
              </span>
            ) : null}
          </span>
          <span className="btn btn-primary btn-sm shrink-0" aria-hidden>
            {CHAT_CHANGES_DOCK_COPY.review}
          </span>
        </button>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="shrink-0 px-3 pb-1.5 pt-1.5" data-chat-changes-bar="compact">
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-raised) py-1 pl-2.5 pr-1">
          <IconFile className="h-3.5 w-3.5 shrink-0 text-(--text-secondary)" />
          <span className="min-w-0 truncate text-[12.5px] font-medium text-(--text-primary)">
            {view.title}
          </span>
          {verdict}
          <Button size="sm" variant="ghost" className="ml-auto shrink-0" onClick={onReview}>
            {CHAT_CHANGES_DOCK_COPY.review}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="shrink-0 px-3 pb-2 pt-2" data-chat-changes-bar="">
      <div className="flex flex-col gap-1.5 rounded-xl border border-(--border-default) bg-(--surface-raised) px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <IconFile className="h-4 w-4 shrink-0 text-(--text-secondary)" />
          <span className="text-[13.5px] font-semibold text-(--text-primary)">{view.title}</span>
          {verdict}
          {view.unfit ? (
            <span className="text-[12.5px] text-(--status-on_hold-soft-fg)">{view.unfit}</span>
          ) : null}
          {view.waited ? (
            <span
              className={`text-[12.5px] tabular-nums ${
                view.overdue ? 'text-(--status-on_hold-soft-fg)' : 'text-(--text-secondary)'
              }`}
            >
              {view.waited}
            </span>
          ) : null}
          {confirming ? null : (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!view.canDiscard}
                onClick={() => setConfirming(true)}
              >
                {view.busy === 'discarding'
                  ? OPEN_CHANGES_NOTICE_COPY.discarding
                  : OPEN_CHANGES_NOTICE_COPY.discard}
              </Button>
              <Button size="sm" onClick={onReview}>
                {CHAT_CHANGES_DOCK_COPY.review}
              </Button>
            </div>
          )}
        </div>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-(--text-primary)">
              {OPEN_CHANGES_NOTICE_COPY.confirmDiscard}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                {OPEN_CHANGES_NOTICE_COPY.keep}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setConfirming(false)
                  onDiscard()
                }}
              >
                {OPEN_CHANGES_NOTICE_COPY.discard}
              </Button>
            </div>
          </div>
        ) : null}
        {view.error ? (
          <span className="text-[12px] text-(--status-stuck-fg)">{view.error}</span>
        ) : null}
      </div>
    </div>
  )
}
