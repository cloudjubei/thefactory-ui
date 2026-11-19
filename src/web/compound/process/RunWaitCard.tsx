import { useState } from 'react'

import { PROCESS_RUN_WAIT_COPY, PROCESS_WAIT_NOTE_MAX_CHARS } from '../../../headless'
import type {
  ProcessRunWaitView,
  ProcessWaitConfirmView,
} from '../../../headless/utils/processRunWaitTypes'
import type { ProcessWaitAction } from 'thefactory-tools/types'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import Spinner from '../../primitives/Spinner'
import { Textarea } from '../../primitives/Textarea'
import ToneBadge from '../chips/ToneBadge'

export type RunWaitCardProps = {
  view: ProcessRunWaitView
  /** What the confirm before each action says; only a card that takes actions needs it. */
  confirmOf?: (action: ProcessWaitAction) => ProcessWaitConfirmView
  /** Take an action on the wait, with the person's note; without it the card only reports. */
  onDecide?: (action: ProcessWaitAction, note?: string) => Promise<boolean>
  /** Inside a leg's or a repo's card: smaller, framed by its tone. */
  compact?: boolean
  className?: string
  /** Start with this action's confirm open — for a fixed showcase state. */
  confirming?: ProcessWaitAction
}

/**
 * A run's wait for other work before its proof — on its run, on its group
 * leg, the same shape: what it waits for on which base, since when, that it
 * carries on by itself, each entry as git last read it, and Continue now and
 * Stop waiting while it waits (Wait again after either, until the run gets
 * there). Each asks first, with an optional note; the outcome shows at once.
 * Once settled it says how.
 */
export default function RunWaitCard({
  view,
  confirmOf,
  onDecide,
  compact = false,
  className = compact ? '' : 'mx-3 mt-3',
  confirming,
}: RunWaitCardProps) {
  const [asking, setAsking] = useState<ProcessWaitAction | undefined>(confirming)
  const [note, setNote] = useState('')
  const confirm = asking && confirmOf ? confirmOf(asking) : undefined
  const open = (action: ProcessWaitAction) => {
    setNote('')
    setAsking(action)
  }
  const send = () => {
    if (!asking || !onDecide) return
    const action = asking
    setAsking(undefined)
    void onDecide(action, note)
  }
  const tone = view.tone
  return (
    <section
      aria-label={PROCESS_RUN_WAIT_COPY.label}
      className={`flex min-w-0 flex-col ${compact ? 'gap-1 rounded-md px-2.5 py-2' : 'gap-1.5 rounded-xl px-4 py-3 sm:px-5'} ${className}`}
      style={{
        background: `color-mix(in srgb, var(--status-${tone}-soft-bg) 55%, var(--surface-raised))`,
        border: `1px solid var(--status-${tone}-soft-border)`,
      }}
    >
      {compact ? null : (
        <div className="flex items-center gap-2">
          <ToneBadge tone={tone}>{PROCESS_RUN_WAIT_COPY.label}</ToneBadge>
          {view.pending ? <Spinner size={12} /> : null}
        </div>
      )}
      <div
        className={`flex min-w-0 items-center gap-1.5 font-semibold leading-snug text-(--text-primary) ${compact ? 'text-[12px]' : 'text-[15px]'}`}
      >
        <span className="min-w-0 wrap-break-word">{view.headline}</span>
        {compact && view.pending ? <Spinner size={11} /> : null}
      </div>
      {view.meta.length > 0 ? (
        <div className={`text-(--text-secondary) ${compact ? 'text-[11px]' : 'text-[12.5px]'}`}>
          {view.meta.join(PROCESS_RUN_WAIT_COPY.separator)}
        </div>
      ) : null}
      {view.entries.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {view.entries.map((entry) => (
            <li
              key={entry.label}
              className={`flex min-w-0 flex-wrap items-baseline gap-x-2 ${compact ? 'text-[11px]' : 'text-[12px]'}`}
            >
              <span
                className="font-semibold"
                style={{
                  color: entry.onBase ? 'var(--status-done-soft-fg)' : 'var(--text-primary)',
                }}
              >
                {entry.label}
              </span>
              <span className="min-w-0 wrap-anywhere text-(--text-muted)">{entry.line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {view.note ? (
        <p
          className={`m-0 wrap-break-word italic text-(--text-secondary) ${compact ? 'text-[11px]' : 'text-[12px]'}`}
        >
          “{view.note}”
        </p>
      ) : null}
      {onDecide && view.actions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {view.actions.map((a, at) => (
            <Button
              key={a.action}
              size="sm"
              variant={at === 0 ? 'secondary' : 'ghost'}
              onClick={() => open(a.action)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}
      {confirm ? (
        <Modal isOpen onClose={() => setAsking(undefined)} title={confirm.title} size="sm">
          <div className="flex flex-col gap-3 text-[13px] text-(--text-secondary)">
            <p className="m-0">{confirm.body}</p>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-(--text-muted)">
                {confirm.noteLabel}
              </span>
              <Textarea
                rows={2}
                value={note}
                maxLength={PROCESS_WAIT_NOTE_MAX_CHARS}
                placeholder={confirm.notePlaceholder}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAsking(undefined)}>
                {confirm.cancel}
              </Button>
              <Button size="sm" variant="primary" onClick={send}>
                {confirm.confirm}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
