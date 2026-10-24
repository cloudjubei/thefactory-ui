import { useState, type ReactNode } from 'react'
import { Button } from '../../primitives/Button'
import RichText from '../files/RichText'
import ReferenceTextarea from '../files/ReferenceTextarea'
import { useCanonicalizeReferences } from '../../../headless/contexts/ReferenceRenderingContext'
import { IconChat, IconEdit } from '../../icons'
import { canSubmitAnswer } from '../../../headless/utils/agentQuestions'
import {
  QUESTION_ANSWER_PLACEHOLDER,
  QUESTION_CARD_TITLE,
  QUESTION_DECLINE_LABEL,
  QUESTION_MORE,
  QUESTION_OPTION_SEND,
  QUESTION_PARK_LABEL,
  QUESTION_SOMETHING_ELSE,
  QUESTION_SUBMIT_LABEL,
} from '../../../headless/utils/agentQuestionConstants'
import type { AgentQuestionOption } from '../../../headless/utils/agentQuestionTypes'
import type { PendingQuestionGrant } from '../../../headless/utils/chatTypes'
import QuestionPicker, { AgentsPickPill } from './QuestionPicker'
import AnswerFiles from '../process/AnswerFiles'

export type AgentQuestionCardProps = {
  /** The parked `askUser` action — its parsed question and its answer channel. */
  grant: PendingQuestionGrant
  /** Blocks answering while the host is busy (e.g. a send is in flight). */
  disabled?: boolean
  /** Set the question aside, still waiting — it folds to a "Still waiting" row. */
  onPark?: () => void
  /** The pager over several open asks, shown in the header. */
  pager?: ReactNode
  /** An answer in the person's own words to open the card with — its box shown, its files attached. */
  initialOwnAnswer?: { text: string; files: readonly string[] }
}

const LONG_CONTEXT = 180

function formatRaw(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2)
  } catch {
    return String(v)
  }
}

function OptionRow({
  option,
  disabled,
  onSend,
}: {
  option: AgentQuestionOption
  disabled: boolean
  onSend: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSend}
      className="flex w-full items-center gap-2.5 rounded-lg border border-(--border-default) bg-(--surface-raised) px-3 py-2.5 text-left hover:border-(--accent-primary) hover:bg-(--accent-soft-bg) disabled:opacity-60"
    >
      <span className="h-[18px] w-[18px] shrink-0 rounded-full border-[1.5px] border-(--border-strong)" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 text-[13px] font-semibold text-(--text-primary) wrap-break-word">
            {option.label}
          </span>
          {option.recommended ? <AgentsPickPill /> : null}
        </span>
        {option.detail ? (
          <span className="text-[12px] text-(--text-secondary)">{option.detail}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-[12px] font-semibold text-(--accent-primary)">
        {QUESTION_OPTION_SEND}
      </span>
    </button>
  )
}

/**
 * A mid-run question from the agent, taking the composer's place — the agent
 * cannot go on without the answer. Each of the agent's options sends
 * in one click; a branch, file or work answer gets a picker of the real items;
 * "Something else…" opens a box for the person's own words; the agent can be
 * left to decide; and "Not now" sets the question aside, still waiting.
 */
export default function AgentQuestionCard({
  grant,
  disabled,
  onPark,
  pager,
  initialOwnAnswer,
}: AgentQuestionCardProps) {
  const { question, context, options, answerKind, raw } = grant.question
  const [answer, setAnswer] = useState(initialOwnAnswer?.text ?? '')
  const [files, setFiles] = useState<string[]>(() => [...(initialOwnAnswer?.files ?? [])])
  const [otherOpen, setOtherOpen] = useState(initialOwnAnswer !== undefined)
  const [contextOpen, setContextOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canonicalize = useCanonicalizeReferences()
  const asked = [question, context ?? '', ...(options ?? []).map((o) => o.label)].join('\n')

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
  const send = (text: string, handed: readonly string[] = []) =>
    void run(() => grant.answer(canonicalize(text, asked), handed))

  const locked = busy || disabled === true
  const renderOption = (option: AgentQuestionOption) => (
    <OptionRow
      key={option.label}
      option={option}
      disabled={locked}
      onSend={() => send(option.label)}
    />
  )
  const longContext = context !== undefined && context.length > LONG_CONTEXT
  const loose = answerKind ? undefined : options

  return (
    <div className="overflow-hidden rounded-xl border-[1.5px] border-(--status-on_hold-soft-border) bg-(--surface-raised) shadow-sm">
      <div className="flex items-center gap-2 bg-(--status-on_hold-soft-bg) px-3.5 py-2 text-[12.5px] font-semibold text-(--status-on_hold-soft-fg)">
        <IconChat className="h-4 w-4 shrink-0" />
        <span className="flex-1">{QUESTION_CARD_TITLE}</span>
        {pager}
      </div>
      <div className="flex flex-col gap-3 p-3.5">
        <div className="text-[16px] leading-snug font-semibold whitespace-pre-wrap wrap-break-word text-(--text-primary)">
          <RichText text={question} />
        </div>
        {context ? (
          <div className="text-[13px] leading-relaxed text-(--text-secondary)">
            <p
              className={`m-0 whitespace-pre-wrap wrap-break-word ${longContext && !contextOpen ? 'line-clamp-2' : ''}`}
            >
              <RichText text={context} />
            </p>
            {longContext && !contextOpen ? (
              <button
                type="button"
                className="text-[12.5px] font-medium text-(--accent-primary)"
                onClick={() => setContextOpen(true)}
              >
                {QUESTION_MORE}
              </button>
            ) : null}
          </div>
        ) : null}
        {raw !== undefined ? (
          <pre className="max-h-40 overflow-auto font-mono text-xs whitespace-pre-wrap wrap-break-word text-(--text-secondary)">
            {formatRaw(raw)}
          </pre>
        ) : null}

        {answerKind ? (
          <QuestionPicker
            kind={answerKind}
            options={options}
            disabled={locked}
            onSend={send}
            renderOtherOptions={(others) => others.map(renderOption)}
          />
        ) : null}

        <div className="flex flex-col gap-1.5">
          {(loose ?? []).map(renderOption)}
          {otherOpen ? (
            <div className="flex flex-col gap-2 rounded-lg border border-(--accent-primary) p-2 pl-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <ReferenceTextarea
                    rows={2}
                    value={answer}
                    onChange={setAnswer}
                    placeholder={QUESTION_ANSWER_PLACEHOLDER}
                    ariaLabel={question}
                    disabled={locked}
                  />
                </div>
                <Button
                  size="sm"
                  loading={busy}
                  disabled={locked || !canSubmitAnswer(answer)}
                  onClick={() => send(answer, files)}
                >
                  {QUESTION_SUBMIT_LABEL}
                </Button>
              </div>
              {grant.answerFiles ? (
                <AnswerFiles source={grant.answerFiles} files={files} onChange={setFiles} />
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={() => setOtherOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-(--border-strong) px-3 py-2.5 text-left text-[13px] text-(--text-secondary) hover:border-(--accent-primary)"
            >
              <IconEdit className="h-3.5 w-3.5 shrink-0" />
              {QUESTION_SOMETHING_ELSE}
            </button>
          )}
        </div>

        {error ? <p className="text-[12px] text-(--status-stuck-soft-fg)">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-1.5 border-t border-(--border-subtle) pt-2.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={locked}
            onClick={() => void run(() => grant.decide('deny'))}
          >
            {QUESTION_DECLINE_LABEL}
          </Button>
          {onPark ? (
            <Button size="sm" variant="ghost" disabled={locked} onClick={onPark}>
              {QUESTION_PARK_LABEL}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
