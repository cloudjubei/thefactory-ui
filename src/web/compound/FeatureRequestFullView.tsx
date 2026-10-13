import { useState } from 'react'
import { formatFeatureRequestBrief } from 'thefactory-tools/utils'
import { cn } from '../utils/cn'
import { Button } from '../primitives/Button'
import { IconChevronRight, IconWarningTriangle } from '../icons'
import RichText from './files/RichText'
import FeatureRequestDecision, { type FeatureRequestDecisionProps } from './FeatureRequestDecision'
import { FeatureRequestProvenance } from './IncomingFeatureRequestCard'
import {
  featureRequestCycleWarning,
  featureRequestSections,
  featureRequestStatusView,
  featureRequestSummary,
  featureRequestViaLabel,
  featureRequestWaitingLine,
} from '../../headless/utils/featureRequestView'
import {
  FEATURE_REQUEST_ACCEPTANCE_LINES,
  FEATURE_REQUEST_DECIDE_HEADING,
} from '../../headless/utils/featureRequestViewConstants'
import { formatFriendlyTimestamp } from '../../headless/utils/time'

export type FeatureRequestFullViewProps = Omit<FeatureRequestDecisionProps, 'onOpenFull'> & {
  /** Names of the projects that adopt the result, in the request's order. */
  adopterLabels?: string[]
  /** Open the chat the request was sent from. */
  onOpenAskingChat?: () => void
  className?: string
}

/**
 * The whole of a request another project sent: every part written out — what changes, done when,
 * rules, proof, where it came from — and the text as it was sent, beside the decision and who asked.
 * The full form of the card in the request's chat. Purely presentational.
 */
export default function FeatureRequestFullView({
  adopterLabels,
  onOpenAskingChat,
  className,
  ...decision
}: FeatureRequestFullViewProps) {
  const { request, fromLabel } = decision
  const [showRaw, setShowRaw] = useState(false)
  const summary = featureRequestSummary(request)
  const sections = featureRequestSections(request, fromLabel)
  const cycleWarning = featureRequestCycleWarning(request, fromLabel)
  const pending = featureRequestStatusView(request.status).phase === 'pending'
  return (
    <div className={cn('flex flex-wrap items-start gap-5', className)}>
      <article className="flex min-w-0 flex-[999_1_480px] flex-col gap-5">
        <header className="flex flex-col gap-2.5">
          <FeatureRequestProvenance request={request} fromLabel={fromLabel} />
          <h1 className="m-0 text-[20px] font-semibold leading-snug text-(--text-primary)">
            {request.title}
          </h1>
          {summary ? (
            <p className="m-0 whitespace-pre-wrap wrap-break-word text-[14px] leading-relaxed text-(--text-secondary)">
              <RichText text={summary} />
            </p>
          ) : null}
          {cycleWarning ? (
            <div className="flex items-start gap-2 rounded-lg bg-(--status-blocked-soft-bg) px-2.5 py-2 text-[12.5px] text-(--status-blocked-soft-fg)">
              <IconWarningTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{cycleWarning}</span>
            </div>
          ) : null}
        </header>

        {sections.map((section) => (
          <section key={section.id} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <h2 className="m-0 text-[11.5px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                {section.title}
              </h2>
              {section.meta ? (
                <span className="text-[12px] text-(--text-secondary)">{section.meta}</span>
              ) : null}
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
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
          </section>
        ))}

        {adopterLabels?.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="m-0 text-[11.5px] font-semibold uppercase tracking-wide text-(--text-secondary)">
              Who adopts it
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {adopterLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-(--border-subtle) px-2 py-1 text-[12.5px] text-(--text-primary)"
                >
                  {label}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={showRaw}
            onClick={() => setShowRaw((v) => !v)}
            className="inline-flex items-center gap-1.5 self-start text-[12.5px] text-(--text-secondary) hover:text-(--text-primary)"
          >
            <IconChevronRight
              className={cn('h-3 w-3 transition-transform', { 'rotate-90': showRaw })}
            />
            The request as it was sent
          </button>
          {showRaw ? (
            <pre className="m-0 whitespace-pre-wrap wrap-break-word rounded-lg bg-(--surface-base) p-3 font-mono text-[12px] leading-relaxed text-(--text-primary)">
              {formatFeatureRequestBrief(request)}
            </pre>
          ) : null}
        </section>
      </article>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
        <div className="flex flex-col gap-2.5 rounded-xl border border-(--border-default) bg-(--surface-raised) p-4">
          {pending ? (
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-semibold text-(--text-primary)">
                {FEATURE_REQUEST_DECIDE_HEADING}
              </span>
              <span className="text-[12.5px] text-(--text-secondary)">
                {featureRequestWaitingLine(fromLabel)}
              </span>
            </div>
          ) : null}
          <FeatureRequestDecision {...decision} />
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border border-(--border-default) bg-(--surface-raised) p-4 text-[12.5px] text-(--text-secondary)">
          <span className="text-[11.5px] font-semibold uppercase tracking-wide">Requested by</span>
          <span className="text-[14px] font-semibold text-(--text-primary)">{fromLabel}</span>
          <span>
            From {featureRequestViaLabel(request.requestedBy.fromChatContext)},{' '}
            {formatFriendlyTimestamp(request.createdAt)}.
          </span>
          {onOpenAskingChat ? (
            <Button size="sm" variant="link" className="self-start px-0" onClick={onOpenAskingChat}>
              Open the requesting chat →
            </Button>
          ) : null}
          <span>{FEATURE_REQUEST_ACCEPTANCE_LINES[request.acceptance]}</span>
        </div>
      </aside>
    </div>
  )
}
