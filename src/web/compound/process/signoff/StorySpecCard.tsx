import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
  SIGNOFF_SPEC_CRITERIA_CAPTION,
  SIGNOFF_SPEC_CRITERIA_CHIP,
  SIGNOFF_SPEC_DESCRIPTION_LINES,
  SIGNOFF_SPEC_DESCRIPTION_TOGGLE,
  signoffSpecCriteria,
} from '../../../../headless'
import { IconChevronDown, IconChecklist } from '../../../icons'
import Markdown from '../../Markdown'
import DependencyBullet from '../../stories/DependencyBullet'

export type StorySpecCardProps = {
  storyId: string
  title: string
  description: string | undefined
  features: readonly { id: string; title: string; acceptance?: string }[]
  /** Open the story itself. */
  onOpenStory?: () => void
}

const LINE_HEIGHT_EM = 1.5

/**
 * The story's spec at the top of "What this is": its chip and title, a
 * checklist chip that opens every feature's acceptance criteria under its own
 * chip, and the description as markdown — clamped at three lines with a fade
 * and a small chevron under it only when it is longer than that.
 */
export default function StorySpecCard({
  storyId,
  title,
  description,
  features,
  onOpenStory,
}: StorySpecCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [criteriaOpen, setCriteriaOpen] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(
    () =>
      signoffSpecCriteria(
        storyId,
        features.map((f) => ({ id: f.id, title: f.title, acceptance: f.acceptance })),
      ),
    [storyId, features],
  )
  const text = description?.trim()

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el || expanded) return
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [text, expanded])

  const clamped = overflows && !expanded

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <DependencyBullet dependency={storyId} interactive />
        {onOpenStory ? (
          <button
            type="button"
            onClick={onOpenStory}
            className="min-w-0 flex-1 text-left text-[15px] font-semibold text-(--text-primary) hover:text-(--accent-primary)"
          >
            {title}
          </button>
        ) : (
          <span className="min-w-0 flex-1 text-[15px] font-semibold text-(--text-primary)">
            {title}
          </span>
        )}
        {groups.length > 0 ? (
          <button
            type="button"
            aria-expanded={criteriaOpen}
            title={SIGNOFF_SPEC_CRITERIA_CHIP}
            onClick={() => setCriteriaOpen((v) => !v)}
            className={`inline-flex h-6.5 items-center gap-1.5 rounded-full border px-2.5 text-[12px] ${criteriaOpen ? 'border-(--accent-primary) bg-(--status-review-soft-bg) text-(--accent-primary)' : 'border-(--border-subtle) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)'}`}
          >
            <IconChecklist className="size-3.5" />
            {SIGNOFF_SPEC_CRITERIA_CHIP}
          </button>
        ) : null}
      </div>

      {text ? (
        <div className="relative">
          <div
            ref={bodyRef}
            className="markdown-content max-w-[78ch] overflow-hidden text-[13px] text-(--text-secondary)"
            style={{
              lineHeight: LINE_HEIGHT_EM,
              maxHeight: expanded
                ? undefined
                : `${SIGNOFF_SPEC_DESCRIPTION_LINES * LINE_HEIGHT_EM}em`,
            }}
          >
            <Markdown text={text} />
          </div>
          {clamped ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-linear-to-b from-transparent to-(--surface-raised)" />
          ) : null}
        </div>
      ) : null}

      {text && overflows ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={
            expanded ? SIGNOFF_SPEC_DESCRIPTION_TOGGLE.less : SIGNOFF_SPEC_DESCRIPTION_TOGGLE.more
          }
          title={
            expanded ? SIGNOFF_SPEC_DESCRIPTION_TOGGLE.less : SIGNOFF_SPEC_DESCRIPTION_TOGGLE.more
          }
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-5.5 w-9 items-center justify-center self-center rounded-full border border-(--border-subtle) bg-(--surface-raised) text-(--text-secondary) hover:bg-(--surface-hover)"
        >
          <IconChevronDown
            className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      ) : null}

      {criteriaOpen && groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.key}
              className="flex flex-col gap-1.5 rounded-lg border border-(--border-subtle) px-3 py-2.5"
            >
              <span className="flex items-center gap-1.5">
                <DependencyBullet dependency={group.dependency} interactive />
                <span className="text-[12px] text-(--text-secondary)">
                  {SIGNOFF_SPEC_CRITERIA_CAPTION}
                </span>
              </span>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-4 text-[13px] text-(--text-primary)">
                {group.criteria.map((c, i) => (
                  <li key={i}>
                    <Markdown text={c} inline />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
