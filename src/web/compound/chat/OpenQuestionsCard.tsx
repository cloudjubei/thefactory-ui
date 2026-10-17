import type { ComponentType } from 'react'
import type { ChatOpenQuestionsCard } from 'thefactory-tools/types'

import { Button } from '../../primitives/Button'
import ReferenceTextarea from '../files/ReferenceTextarea'
import RichText from '../files/RichText'
import { useStories } from '../../../headless/contexts/StoriesContext'
import {
  useFeatureQuestionAnswers,
  type UseFeatureQuestionAnswers,
} from '../../../headless/hooks/useFeatureQuestionAnswers'
import { openQuestionsCardView } from '../../../headless/utils/openQuestionsCard'
import { OPEN_QUESTIONS_COPY } from '../../../headless/utils/openQuestionsCardConstants'
import type { OpenQuestionsCardView } from '../../../headless/utils/openQuestionsCardTypes'

export type OpenQuestionsCardProps = {
  card: ChatOpenQuestionsCard
  /** When the host posted the card. */
  at?: string
}

/**
 * The questions a paused run waits on, in its chat: read live from the story,
 * each with its answer box. Answering here is answering on the story — the
 * work carries on once nothing is left open — and a question answered anywhere
 * else leaves the card at once.
 */
export default function OpenQuestionsCard({ card, at }: OpenQuestionsCardProps) {
  const { getStory } = useStories()
  const view = openQuestionsCardView(getStory(card.storyId)?.features, card)
  const answering = useFeatureQuestionAnswers(card.projectId, card.storyId)
  return <OpenQuestionsBox view={view} {...answering} {...(at ? { at } : {})} />
}

/** The box one answer is typed in. */
export type OpenQuestionAnswerInputProps = {
  value: string
  placeholder: string
  onChange: (text: string) => void
  onSubmit: () => void
}

/** The chat's own: an answer may name files and other references, as a message can. */
function ReferenceAnswerInput(props: OpenQuestionAnswerInputProps) {
  return <ReferenceTextarea rows={1} className="text-[12px] py-1" {...props} />
}

export type OpenQuestionsBoxProps = Pick<
  UseFeatureQuestionAnswers,
  'answers' | 'setAnswer' | 'answering' | 'failed' | 'submit'
> & {
  view: OpenQuestionsCardView
  at?: string
  /** The answer box; the chat's reference box unless a host draws another. */
  AnswerInput?: ComponentType<OpenQuestionAnswerInputProps>
}

/** The card as drawn from what it reads — the questions, the typed answers, what is being saved. */
export function OpenQuestionsBox({
  view,
  at,
  answers,
  setAnswer,
  answering,
  failed,
  submit,
  AnswerInput = ReferenceAnswerInput,
}: OpenQuestionsBoxProps) {
  const open = view.state === 'open'
  return (
    <div
      className={[
        'flex flex-col gap-2 rounded-md border p-2.5',
        open
          ? 'border-(--accent-primary)/25 bg-(--accent-primary)/5'
          : 'border-(--border-subtle) bg-(--surface-raised)',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-(--text-primary)">{view.title}</span>
        <span className="flex-1" />
        {at ? <span className="text-[11px] text-(--text-muted)">{at}</span> : null}
      </div>
      {view.questions.map((q) => (
        <div key={q.questionId} className="flex flex-col gap-1">
          <span className="text-[12.5px] text-(--text-primary)">
            <RichText text={q.question} />
          </span>
          <span className="text-[11px] text-(--text-secondary)">
            {OPEN_QUESTIONS_COPY.on(q.featureTitle)}
          </span>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <AnswerInput
                value={answers[q.questionId] ?? ''}
                placeholder={OPEN_QUESTIONS_COPY.placeholder}
                onChange={(next) => setAnswer(q.questionId, next)}
                onSubmit={() => void submit(q)}
              />
            </div>
            <Button
              size="sm"
              disabled={
                answering === q.questionId || (answers[q.questionId] ?? '').trim().length === 0
              }
              onClick={() => void submit(q)}
            >
              {answering === q.questionId
                ? OPEN_QUESTIONS_COPY.sending
                : OPEN_QUESTIONS_COPY.answer}
            </Button>
          </div>
          {failed === q.questionId ? (
            <span className="text-[11px] text-(--status-blocked-soft-fg)">
              {OPEN_QUESTIONS_COPY.failed}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
