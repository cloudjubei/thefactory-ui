import { useState, type ReactNode } from 'react'

import { QUESTION_PARK_LABEL } from '../../../headless/utils/agentQuestionConstants'
import { useStuckCard } from '../../../headless/hooks/useStuckCard'
import { STUCK_CARD_COPY } from '../../../headless/utils/stuckCardConstants'
import type { StuckCardAnswer } from '../../../headless/utils/stuckCardTypes'
import type { PendingQuestionGrant } from '../../../headless/utils/chatTypes'
import { IconChat } from '../../icons'
import { Button } from '../../primitives/Button'
import ReferenceTextarea from '../files/ReferenceTextarea'
import RichText from '../files/RichText'

/** `rows` — an answer a row, each saying what it does; `buttons` — one row of buttons; `folded` — buttons, the evidence behind a tap. */
export type StuckCardLayout = 'rows' | 'buttons' | 'folded'

export type StuckCardProps = {
  /** The parked question, carrying the evidence and its answer channel. */
  grant: PendingQuestionGrant
  /** Set it aside, still waiting: it folds to a "Still waiting" row. */
  onPark?: () => void
  /** The pager over several open asks, shown in the header. */
  pager?: ReactNode
  layout?: StuckCardLayout
}

function AnswerRow({
  answer,
  disabled,
  action,
  onPress,
}: {
  answer: StuckCardAnswer
  disabled: boolean
  action: string
  onPress: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className="flex w-full items-center gap-2.5 rounded-lg border border-(--border-default) bg-(--surface-raised) px-3 py-2.5 text-left hover:border-(--accent-primary) hover:bg-(--accent-soft-bg) disabled:opacity-60"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-(--text-primary)">{answer.label}</span>
        <span className="text-[12px] text-(--text-secondary)">{answer.detail}</span>
      </span>
      <span className="shrink-0 text-[12px] font-semibold text-(--accent-primary)">{action}</span>
    </button>
  )
}

/**
 * The host paused a turn going nowhere and asks the person what next, taking
 * the composer's place as a question does: the evidence of what it kept doing,
 * and Continue, Give it a hint or Stop. Stop asks first. It waits as long as it
 * takes, on every model.
 */
export default function StuckCard({ grant, onPark, pager, layout = 'rows' }: StuckCardProps) {
  const card = useStuckCard(grant)
  const [evidenceOpen, setEvidenceOpen] = useState(layout !== 'folded')
  const { view } = card
  if (!view) return null
  const [continueAnswer, hintAnswer, stopAnswer] = view.answers as [
    StuckCardAnswer,
    StuckCardAnswer,
    StuckCardAnswer,
  ]
  const locked = card.busy

  const hintBox = (
    <div className="flex items-end gap-2 rounded-lg border border-(--accent-primary) p-2 pl-3">
      <div className="min-w-0 flex-1">
        <ReferenceTextarea
          rows={2}
          value={card.hint}
          onChange={card.setHint}
          placeholder={STUCK_CARD_COPY.hintPlaceholder}
          ariaLabel={hintAnswer.label}
          disabled={locked}
        />
      </div>
      <Button
        size="sm"
        loading={card.busy}
        disabled={locked || !card.canSendHint}
        onClick={card.sendHint}
      >
        {STUCK_CARD_COPY.hintSend}
      </Button>
    </div>
  )
  const stopConfirm = (
    <div className="flex flex-col gap-2 rounded-lg border border-(--status-stuck-soft-border) bg-(--status-stuck-soft-bg) p-3">
      <span className="text-[13px] font-semibold text-(--status-stuck-soft-fg)">
        {STUCK_CARD_COPY.stopAsk}
      </span>
      <span className="text-[12px] text-(--text-secondary)">{stopAnswer.detail}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="danger" disabled={locked} onClick={card.sendStop}>
          {stopAnswer.label}
        </Button>
        <Button size="sm" variant="ghost" disabled={locked} onClick={card.keepWaiting}>
          {STUCK_CARD_COPY.keep}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="overflow-hidden rounded-xl border-[1.5px] border-(--status-stuck-soft-border) bg-(--surface-raised) shadow-sm">
      <div className="flex items-center gap-2 bg-(--status-stuck-soft-bg) px-3.5 py-2 text-[12.5px] font-semibold text-(--status-stuck-soft-fg)">
        <IconChat className="h-4 w-4 shrink-0" />
        <span className="flex-1">{view.title}</span>
        {pager}
      </div>
      <div className="flex flex-col gap-3 p-3.5">
        <div className="text-[15px] leading-snug font-semibold whitespace-pre-wrap wrap-break-word text-(--text-primary)">
          <RichText text={view.question} />
        </div>
        {view.context ? (
          <p className="m-0 text-[13px] leading-relaxed text-(--text-secondary)">{view.context}</p>
        ) : null}
        {card.stopAsked ? null : evidenceOpen ? (
          <div className="flex min-w-0 flex-col gap-1 rounded-md border border-(--border-subtle) bg-(--surface-overlay) px-2.5 py-2">
            <span className="text-[11px] font-semibold text-(--text-muted)">
              {STUCK_CARD_COPY.evidence}
            </span>
            {view.evidence.map((line) => (
              <code
                key={line}
                className="font-mono text-[12px] whitespace-pre-wrap wrap-anywhere text-(--text-secondary)"
              >
                {line}
              </code>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="self-start text-[12.5px] font-medium text-(--accent-primary)"
            onClick={() => setEvidenceOpen(true)}
          >
            {STUCK_CARD_COPY.evidence}
          </button>
        )}

        {card.stopAsked ? (
          stopConfirm
        ) : layout === 'rows' ? (
          <div className="flex flex-col gap-1.5">
            <AnswerRow
              answer={continueAnswer}
              action={STUCK_CARD_COPY.go}
              disabled={locked}
              onPress={card.sendContinue}
            />
            {card.hintOpen ? (
              hintBox
            ) : (
              <AnswerRow
                answer={hintAnswer}
                action={STUCK_CARD_COPY.hintOpen}
                disabled={locked}
                onPress={card.openHint}
              />
            )}
            <AnswerRow
              answer={stopAnswer}
              action={STUCK_CARD_COPY.stopOpen}
              disabled={locked}
              onPress={card.askStop}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" disabled={locked} onClick={card.sendContinue}>
                {continueAnswer.label}
              </Button>
              <Button size="sm" variant="secondary" disabled={locked} onClick={card.openHint}>
                {hintAnswer.label}
              </Button>
              <Button size="sm" variant="ghost" disabled={locked} onClick={card.askStop}>
                {stopAnswer.label}
              </Button>
            </div>
            {card.hintOpen ? hintBox : null}
          </div>
        )}

        {card.error ? (
          <p className="m-0 text-[12px] text-(--status-stuck-soft-fg)">{card.error}</p>
        ) : null}

        {onPark && !card.stopAsked ? (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-(--border-subtle) pt-2.5">
            <Button size="sm" variant="ghost" disabled={locked} onClick={onPark}>
              {QUESTION_PARK_LABEL}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
