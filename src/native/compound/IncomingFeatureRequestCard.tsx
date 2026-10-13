import { Text, View } from 'react-native'
import type { FeatureRequest } from 'thefactory-tools/types'
import { nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
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
}

/** Who asked, through which chat, and when — the line above the title. */
export function FeatureRequestProvenance({
  request,
  fromLabel,
}: {
  request: FeatureRequest
  fromLabel: string
}) {
  const { theme } = useNativeTheme()
  const secondary = { fontSize: 12.5, color: theme.text.secondary }
  return (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: nativeSpace[2] }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: theme.text.secondary,
        }}
      >
        Request from
      </Text>
      <Text
        style={{
          fontSize: 12.5,
          color: theme.text.primary,
          borderWidth: 1,
          borderColor: theme.border.subtle,
          borderRadius: nativeRadii[3],
          paddingHorizontal: nativeSpace[2],
          paddingVertical: 2,
        }}
      >
        {fromLabel}
      </Text>
      <Text style={secondary}>
        via {featureRequestViaLabel(request.requestedBy.fromChatContext)}
      </Text>
      <Text style={secondary}>· {formatFriendlyTimestamp(request.createdAt)}</Text>
    </View>
  )
}

/**
 * Native peer of web's `IncomingFeatureRequestCard` — a request another project sent to this one as
 * ONE card in its chat: who asked, the summary, its parts as collapsed sections, and the decision.
 * Once decided it stays as the conversation's opening card. Purely presentational.
 */
export default function IncomingFeatureRequestCard({
  adopterLabels,
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
    />
  )
}
