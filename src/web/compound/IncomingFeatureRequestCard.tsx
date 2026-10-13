import type { FeatureRequest } from 'thefactory-tools/types'
import FeatureRequestBriefCard from './FeatureRequestBriefCard'
import FeatureRequestDecision, { type FeatureRequestDecisionProps } from './FeatureRequestDecision'
import {
  featureRequestCycleWarning,
  featureRequestViaLabel,
} from '../../headless/utils/featureRequestView'
import { formatFriendlyTimestamp } from '../../headless/utils/time'

export type IncomingFeatureRequestCardProps = FeatureRequestDecisionProps & {
  /** Names of the projects that adopt the result, in the request's order. */
  adopterLabels?: string[]
  className?: string
}

/** Who asked, through which chat, and when — the line above the title. */
export function FeatureRequestProvenance({
  request,
  fromLabel,
}: {
  request: FeatureRequest
  fromLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-(--text-secondary)">
      <span className="text-[11px] font-semibold uppercase tracking-wide">Request from</span>
      <span className="rounded-lg border border-(--border-subtle) px-2 py-0.5 text-(--text-primary)">
        {fromLabel}
      </span>
      <span>via {featureRequestViaLabel(request.requestedBy.fromChatContext)}</span>
      <span aria-hidden>·</span>
      <span>{formatFriendlyTimestamp(request.createdAt)}</span>
    </div>
  )
}

/**
 * A request another project sent to this one, as ONE card in its chat: who asked, the summary, its
 * parts as collapsed sections, and the decision — Accept & start work, or Reject… with an optional
 * reason the asker is told. Once decided it stays as the conversation's opening card, saying what
 * became of it. Purely presentational: the host owns the calls and the navigation.
 */
export default function IncomingFeatureRequestCard({
  adopterLabels,
  className,
  ...decision
}: IncomingFeatureRequestCardProps) {
  const { request, fromLabel } = decision
  return (
    <FeatureRequestBriefCard
      brief={request}
      fromLabel={fromLabel}
      provenance={<FeatureRequestProvenance request={request} fromLabel={fromLabel} />}
      adopterLabels={adopterLabels}
      cycleWarning={featureRequestCycleWarning(request, fromLabel)}
      footer={<FeatureRequestDecision {...decision} />}
      className={className}
    />
  )
}
