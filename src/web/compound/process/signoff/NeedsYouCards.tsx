import { useEffect, useRef, useState } from 'react'
import {
  NEEDS_YOU_DISCUSS_LABEL,
  NEEDS_YOU_FINE_LABEL,
  NEEDS_YOU_FOCUS_LIT_MS,
  NEEDS_YOU_TRIAGE_LABEL,
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
 * says how it was settled. While any is open, one button hands them all to the
 * manager to weigh and propose a course for. The item a link opened the run on
 * is brought into view and lit for a moment.
 */
export default function NeedsYouCards({ view, actions }: NeedsYouCardsProps) {
  const cardEls = useRef(new Map<string, HTMLLIElement>())
  const [lit, setLit] = useState<string | undefined>()
  const focus = actions.focus
  useEffect(() => {
    if (!focus) return
    const el = cardEls.current.get(focus.itemId)
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setLit(focus.itemId)
    const timer = setTimeout(() => setLit(undefined), NEEDS_YOU_FOCUS_LIT_MS)
    return () => clearTimeout(timer)
  }, [focus])
  if (view.cards.length === 0) {
    return <span className="text-[13px] text-(--text-secondary)">Nothing is left for you.</span>
  }
  const onTriage = view.openCount > 0 ? actions.onTriage : undefined
  return (
    <div className="flex flex-col gap-2">
      {onTriage ? (
        <button
          type="button"
          onClick={() => onTriage(view.cards)}
          className="inline-flex h-8 items-center gap-1.5 self-start rounded-md border-2 border-(--accent-primary) bg-(--surface-raised) px-3 text-[12.5px] font-medium text-(--text-primary) hover:bg-(--surface-hover)"
        >
          <IconChat className="size-3.5" />
          {NEEDS_YOU_TRIAGE_LABEL}
        </button>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {view.cards.map((card) => (
          <li
            key={card.id}
            ref={(el) => {
              if (el) cardEls.current.set(card.id, el)
              else cardEls.current.delete(card.id)
            }}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-shadow ${
              card.open ? REVIEW_TONE_SURFACE.working : `${REVIEW_TONE_SURFACE.neutral} opacity-80`
            } ${lit === card.id ? 'ring-2 ring-(--accent-primary)' : ''}`}
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
    </div>
  )
}
