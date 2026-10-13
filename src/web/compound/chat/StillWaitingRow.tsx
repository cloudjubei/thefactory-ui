import { Button } from '../../primitives/Button'
import { IconChat } from '../../icons'
import {
  QUESTION_REOPEN_LABEL,
  QUESTION_STILL_WAITING,
} from '../../../headless/utils/agentQuestionConstants'

/** A question set aside with "Not now": still waiting, one click from its card. */
export default function StillWaitingRow({
  question,
  onReopen,
}: {
  question: string
  onReopen: () => void
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-(--status-on_hold-soft-border) bg-(--status-on_hold-soft-bg) px-3 py-2 text-[13px] text-(--status-on_hold-soft-fg)">
      <IconChat className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        {QUESTION_STILL_WAITING} <b>{question}</b>
      </span>
      <Button size="sm" variant="secondary" onClick={onReopen}>
        {QUESTION_REOPEN_LABEL}
      </Button>
    </div>
  )
}
