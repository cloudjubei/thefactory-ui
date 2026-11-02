import { useEffect, useState, type ReactNode } from 'react'

import { PARK_ANSWERS_COPY, type ParkAnswerView, type ParkAnswersView } from '../../../headless'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'

export type ParkAnswersProps = {
  view: ParkAnswersView
  /** Put another answer in front. */
  onSelect: (key: string) => void
  /** Send an answer, with its words as the person left them. */
  onSend: (answer: ParkAnswerView, note: string | undefined) => void
  /** Answer in the person's own words — offered when the stop takes words. */
  onOwnAnswer?: () => void
  /** What the answer in front needs beside its button — how a retry starts. */
  leadExtra?: ReactNode
  busy?: boolean
}

/**
 * A stop's answers, the one in front shown whole: its name (and "Manager's
 * pick"), what it does, why, and the words it sends — sent as they are, or
 * edited first. The other answers are one click away under "Or:"; carrying on
 * unchecked and the endings are quiet links under "Also:", and an ending asks
 * before it goes.
 */
export default function ParkAnswers({
  view,
  onSelect,
  onSend,
  onOwnAnswer,
  leadExtra,
  busy = false,
}: ParkAnswersProps) {
  const lead = view.lead
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(lead?.note ?? '')
  const [confirming, setConfirming] = useState<ParkAnswerView | undefined>()
  useEffect(() => {
    setEditing(false)
    setDraft(lead?.note ?? '')
  }, [lead?.key, lead?.note])
  if (!lead) return null

  const send = (answer: ParkAnswerView, note: string | undefined) =>
    answer.confirm ? setConfirming(answer) : onSend(answer, note)
  const leadNote = editing ? draft.trim() || undefined : lead.note

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {view.fromManager ? PARK_ANSWERS_COPY.heading : PARK_ANSWERS_COPY.headingPlain}
      </span>
      <div className="flex flex-col gap-2 rounded-lg border border-(--accent-primary)/50 bg-(--surface-raised) px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14.5px] font-semibold text-(--text-primary)">{lead.label}</span>
          {lead.pick && view.fromManager ? <PickTag /> : null}
        </div>
        <span className="text-[12.5px] leading-snug text-(--text-secondary)">{lead.does}</span>
        {lead.why ? (
          <span className="text-[12.5px] leading-snug text-(--text-muted)">{lead.why}</span>
        ) : null}
        {lead.note ? (
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-(--text-muted)">
              {lead.noteLabel}
            </span>
            {editing ? (
              <Textarea
                aria-label={lead.noteLabel}
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            ) : (
              <blockquote className="m-0 max-w-[82ch] whitespace-pre-wrap rounded-r-md border-l-[3px] border-(--accent-primary)/60 bg-(--surface-base) px-2.5 py-2 text-[13px] leading-relaxed text-(--text-primary)">
                {lead.note}
              </blockquote>
            )}
          </div>
        ) : null}
        {leadExtra}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={lead.confirm ? 'danger' : 'primary'}
            disabled={busy}
            onClick={() => send(lead, leadNote)}
          >
            {lead.note ? PARK_ANSWERS_COPY.send : lead.label}
          </Button>
          {lead.note ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing((v) => !v)}>
              {editing ? PARK_ANSWERS_COPY.cancel : PARK_ANSWERS_COPY.editFirst}
            </Button>
          ) : null}
        </div>
      </div>

      {view.others.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] text-(--text-muted)">{PARK_ANSWERS_COPY.or}</span>
          {view.others.map((answer) => (
            <Button
              key={answer.key}
              size="sm"
              variant="secondary"
              disabled={busy}
              title={answer.does}
              onClick={() => onSelect(answer.key)}
            >
              {answer.label}
            </Button>
          ))}
        </div>
      ) : null}

      {confirming ? (
        <div
          role="alertdialog"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) px-3 py-2.5 text-(--status-stuck-soft-fg)"
        >
          <span className="flex-[1_1_260px] text-[13px]">{confirming.confirm?.text}</span>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(undefined)}>
            {PARK_ANSWERS_COPY.cancel}
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => {
              setConfirming(undefined)
              onSend(confirming, undefined)
            }}
          >
            {confirming.confirm?.label}
          </Button>
        </div>
      ) : view.minor.length > 0 || onOwnAnswer ? (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-(--text-muted)">
          {view.minor.length > 0 ? <span>{PARK_ANSWERS_COPY.also}</span> : null}
          {view.minor.map((answer) => (
            <button
              key={answer.key}
              type="button"
              disabled={busy}
              title={answer.does}
              onClick={() => send(answer, answer.note)}
              className={`font-medium hover:underline ${answer.confirm ? 'text-(--status-stuck-soft-fg)' : 'text-(--accent-primary)'}`}
            >
              {answer.label}
            </button>
          ))}
          {view.minor.length > 0 && onOwnAnswer ? <span aria-hidden>·</span> : null}
          {onOwnAnswer ? (
            <button
              type="button"
              disabled={busy}
              onClick={onOwnAnswer}
              className="font-medium text-(--accent-primary) hover:underline"
            >
              {PARK_ANSWERS_COPY.ownAnswer}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PickTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-(--accent-primary)/50 bg-(--accent-soft-bg) px-2 py-px text-[10.5px] font-semibold text-(--accent-primary)">
      {PARK_ANSWERS_COPY.pick}
    </span>
  )
}
