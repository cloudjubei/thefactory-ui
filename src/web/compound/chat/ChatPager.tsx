import { QUESTION_PAGER } from '../../../headless/utils/agentQuestionConstants'
import { IconChevronLeft, IconChevronRight } from '../../icons'

export type ChatPagerProps = {
  /** What is paged through, in order. */
  ids: readonly string[]
  /** The one shown. */
  index: number
  onChoose: (id: string | undefined) => void
}

/** "‹ 2 of 5 ›" over the cards the composer area shows one at a time. */
export default function ChatPager({ ids, index, onChoose }: ChatPagerProps) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-normal">
      <button
        type="button"
        aria-label="Previous"
        className="rounded p-0.5 hover:bg-(--surface-hover) disabled:opacity-40"
        onClick={() => onChoose(ids[index - 1])}
        disabled={index <= 0}
      >
        <IconChevronLeft className="w-4 h-4" />
      </button>
      <span className="tabular-nums">{QUESTION_PAGER(index + 1, ids.length)}</span>
      <button
        type="button"
        aria-label="Next"
        className="rounded p-0.5 hover:bg-(--surface-hover) disabled:opacity-40"
        onClick={() => onChoose(ids[index + 1])}
        disabled={index >= ids.length - 1}
      >
        <IconChevronRight className="w-4 h-4" />
      </button>
    </span>
  )
}
