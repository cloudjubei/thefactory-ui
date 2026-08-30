import { useState } from 'react'
import { Button } from '../../primitives/Button'
import { Textarea } from '../../primitives/Textarea'
import Surface from '../../primitives/Surface'
import { IconChat } from '../../icons'
import { canSubmitAnswer } from '../../../headless/utils/agentQuestions'
import {
  QUESTION_ANSWER_PLACEHOLDER,
  QUESTION_CARD_SUBTITLE,
  QUESTION_CARD_TITLE,
  QUESTION_DECLINE_LABEL,
  QUESTION_SUBMIT_LABEL,
} from '../../../headless/utils/agentQuestionConstants'
import type { PendingQuestionGrant } from '../../../headless/utils/chatTypes'

export type AgentQuestionCardProps = {
  /** The parked `askUser` action — its parsed question and its answer channel. */
  grant: PendingQuestionGrant
  /** Blocks answering while the host is busy (e.g. a send is in flight). */
  disabled?: boolean
}

function formatRaw(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * A mid-run question from the agent, rendered inline in the chat. Deliberately
 * not a permission prompt: the run is parked waiting for *text*, so the card
 * offers a free-text answer (pre-fillable from the agent's suggested options)
 * and a decline that hands the decision back to the agent.
 */
export default function AgentQuestionCard({ grant, disabled }: AgentQuestionCardProps) {
  const { question, context, options, raw } = grant.question
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the answer.')
      setBusy(false)
    }
  }

  const locked = busy || disabled === true

  return (
    <Surface className="p-3 flex flex-col gap-3" style={{ borderColor: 'var(--accent-primary)' }}>
      <div className="flex items-start gap-2">
        <IconChat className="w-4 h-4 mt-0.5 shrink-0 text-(--accent-primary)" />
        <div className="min-w-0 flex flex-col">
          <span className="text-sm font-semibold">{QUESTION_CARD_TITLE}</span>
          <span className="text-[12px] text-(--text-secondary)">{QUESTION_CARD_SUBTITLE}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm whitespace-pre-wrap wrap-break-word">{question}</p>
        {context ? (
          <p className="text-[12px] text-(--text-secondary) whitespace-pre-wrap wrap-break-word">
            {context}
          </p>
        ) : null}
        {raw !== undefined ? (
          <pre className="font-mono text-xs whitespace-pre-wrap wrap-break-word max-h-40 overflow-auto text-(--text-secondary)">
            {formatRaw(raw)}
          </pre>
        ) : null}
      </div>

      {options && options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={answer === option ? 'secondary' : 'outline'}
              disabled={locked}
              onClick={() => setAnswer(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      ) : null}

      <Textarea
        rows={3}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={QUESTION_ANSWER_PLACEHOLDER}
        aria-label={question}
        disabled={locked}
      />

      {error ? <p className="text-[12px] text-red-500">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={locked}
          onClick={() => void run(() => grant.decide('deny'))}
        >
          {QUESTION_DECLINE_LABEL}
        </Button>
        <Button
          size="sm"
          loading={busy}
          disabled={locked || !canSubmitAnswer(answer)}
          onClick={() => void run(() => grant.answer(answer))}
        >
          {QUESTION_SUBMIT_LABEL}
        </Button>
      </div>
    </Surface>
  )
}
