import { useState, type ReactNode } from 'react'
import type { FeatureRequestBrief } from 'thefactory-tools/types'
import { cn } from '../utils/cn'
import { IconChevronRight, IconWarningTriangle } from '../icons'
import RichText from './files/RichText'
import {
  featureRequestSections,
  featureRequestSummary,
} from '../../headless/utils/featureRequestView'
import type { FeatureRequestSectionView } from '../../headless/utils/featureRequestViewTypes'

export type FeatureRequestBriefCardProps = {
  brief: FeatureRequestBrief
  /** The asking project's name — the meta of "Where it came from". */
  fromLabel: string
  /** The line above the title: who asked, through which chat, and when. */
  provenance?: ReactNode
  /** Names of the projects that adopt the result, shown as chips under the summary. */
  adopterLabels?: string[]
  /** Accepting may leave the two projects waiting on each other. */
  cycleWarning?: string
  /** The decision, the work under way, or the refusal — under the sections. */
  footer?: ReactNode
  className?: string
}

function SectionRow({ section }: { section: FeatureRequestSectionView }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-(--border-subtle)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-(--surface-hover)"
      >
        <IconChevronRight
          className={cn('h-3 w-3 shrink-0 text-(--text-secondary) transition-transform', {
            'rotate-90': open,
          })}
        />
        <span className="flex-1 text-[13.5px] font-semibold text-(--text-primary)">
          {section.title}
        </span>
        {section.meta ? (
          <span className="text-[12px] text-(--text-secondary)">{section.meta}</span>
        ) : null}
      </button>
      {open ? (
        <ul className="flex flex-col gap-1.5 pb-3.5 pl-9 pr-4">
          {section.items.map((item, i) => (
            <li
              key={`${section.id}-${i}`}
              className="flex items-start gap-2.5 text-[13.5px] leading-normal text-(--text-primary)"
            >
              <span
                className={cn(
                  'mt-px inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  section.numbered
                    ? 'bg-(--status-working-soft-bg) text-(--status-working-soft-fg)'
                    : 'text-(--text-secondary)',
                )}
              >
                {item.marker || '·'}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">
                <RichText text={item.text} />
              </span>
              {item.byHand ? (
                <span className="shrink-0 rounded-md bg-(--status-blocked-soft-bg) px-1.5 py-0.5 text-[11px] font-semibold text-(--status-blocked-soft-fg)">
                  By hand
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * A cross-project request as one card: who asked, its title and summary, then each part it carries
 * — what changes, done when, rules, proof, where it came from — as a section opened on demand.
 * Shown to the project it was sent to (with its decision as the footer) and to the agent filing it
 * before it goes. Purely presentational.
 */
export default function FeatureRequestBriefCard({
  brief,
  fromLabel,
  provenance,
  adopterLabels,
  cycleWarning,
  footer,
  className,
}: FeatureRequestBriefCardProps) {
  const summary = featureRequestSummary(brief)
  const sections = featureRequestSections(brief, fromLabel)
  return (
    <article
      className={cn(
        'w-full max-w-[720px] overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-raised) shadow-sm',
        className,
      )}
    >
      <header className="flex flex-col gap-2.5 px-4 pb-3.5 pt-4">
        {provenance}
        <h2 className="m-0 text-[17px] font-semibold leading-snug text-(--text-primary)">
          {brief.title}
        </h2>
        {summary ? (
          <p className="m-0 whitespace-pre-wrap wrap-break-word text-[14px] leading-relaxed text-(--text-secondary)">
            <RichText text={summary} />
          </p>
        ) : null}
        {adopterLabels?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {adopterLabels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-subtle) px-2 py-1 text-[12.5px] text-(--text-primary)"
              >
                <span className="font-mono text-[11.5px] text-(--text-secondary)">adopts</span>
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {cycleWarning ? (
          <div className="flex items-start gap-2 rounded-lg bg-(--status-blocked-soft-bg) px-2.5 py-2 text-[12.5px] text-(--status-blocked-soft-fg)">
            <IconWarningTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{cycleWarning}</span>
          </div>
        ) : null}
      </header>
      {sections.map((section) => (
        <SectionRow key={section.id} section={section} />
      ))}
      {footer ? (
        <footer className="flex flex-col gap-2.5 border-t border-(--border-default) bg-(--surface-base) px-4 py-3">
          {footer}
        </footer>
      ) : null}
    </article>
  )
}
