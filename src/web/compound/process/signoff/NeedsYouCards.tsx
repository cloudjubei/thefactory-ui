import {
  NEEDS_YOU_DISCUSS_LABEL,
  NEEDS_YOU_FINE_LABEL,
  type NeedsYouCardsView,
  type RunNeedsYouActions,
} from '../../../../headless'
import { IconChat, IconCheck } from '../../../icons'
import Markdown from '../../Markdown'
import { REVIEW_TONE_SURFACE } from './tones'

export type NeedsYouCardsProps = {
  view: NeedsYouCardsView
  actions: RunNeedsYouActions
}

/**
 * The final report's "Needs you" items as cards: each open one offers Discuss
 * — the run's chat with the item quoted — and ✓, fine as it is; a settled one
 * says how it was settled.
 */
export default function NeedsYouCards({ view, actions }: NeedsYouCardsProps) {
  if (view.cards.length === 0) {
    return <span className="text-[13px] text-(--text-secondary)">Nothing is left for you.</span>
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {view.cards.map((card) => (
        <li
          key={card.id}
          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
            card.open ? REVIEW_TONE_SURFACE.working : `${REVIEW_TONE_SURFACE.neutral} opacity-80`
          }`}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-(--text-primary)">
              <Markdown text={card.title} inline />
            </span>
            {card.body ? (
              <span className="text-[12.5px] text-(--text-secondary)">
                <Markdown text={card.body} inline />
              </span>
            ) : null}
            {card.outcome ? (
              <span className="text-[12px] font-semibold text-(--accent-primary)">
                {card.outcome}
              </span>
            ) : null}
          </div>
          {card.open ? (
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => actions.onDiscuss(card)}
                className="inline-flex h-7.5 items-center gap-1.5 rounded-md border border-(--accent-primary) bg-(--surface-raised) px-2.5 text-[12.5px] text-(--accent-primary) hover:bg-(--surface-hover)"
              >
                <IconChat className="size-3.5" />
                {NEEDS_YOU_DISCUSS_LABEL}
              </button>
              <button
                type="button"
                onClick={() => actions.onResolve(card)}
                aria-label={NEEDS_YOU_FINE_LABEL}
                title={NEEDS_YOU_FINE_LABEL}
                className="inline-flex size-7.5 items-center justify-center rounded-md border border-(--border-default) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
              >
                <IconCheck className="size-3.5" />
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
