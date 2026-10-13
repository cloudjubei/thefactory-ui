import { IconChat } from '../../icons'
import RichText from '../files/RichText'
import {
  QUESTION_AGENT_DECIDES_ANSWER,
  QUESTION_ANSWERED_BY,
} from '../../../headless/utils/agentQuestionConstants'
import type { AnsweredQuestionView } from '../../../headless/utils/agentQuestionTypes'

/** An answered question, folded to one bubble: the question over the answer that was sent. */
export default function AnsweredQuestionBubble({ view }: { view: AnsweredQuestionView }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[560px] overflow-hidden rounded-xl rounded-br-sm border border-(--border-subtle) bg-(--surface-raised)">
        <div className="flex items-center gap-1.5 border-b border-(--border-subtle) bg-(--surface-overlay) px-3 py-1.5 text-[12px] text-(--text-secondary)">
          <IconChat className="h-3 w-3 shrink-0" />
          <span className="min-w-0 wrap-break-word">
            <RichText text={view.question} />
          </span>
        </div>
        <div className="px-3 py-2 text-[14px] whitespace-pre-wrap wrap-break-word text-(--text-primary)">
          <RichText text={view.answer ?? QUESTION_AGENT_DECIDES_ANSWER} />
        </div>
      </div>
      <span className="text-[11.5px] text-(--text-secondary)">{QUESTION_ANSWERED_BY[view.by]}</span>
    </div>
  )
}
