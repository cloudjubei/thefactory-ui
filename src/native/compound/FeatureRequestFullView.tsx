import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { formatFeatureRequestBrief } from 'thefactory-tools/utils'
import { nativeFontFamilies, nativeRadii, nativeSpace } from '../../tokens/native'
import { useNativeTheme } from '../hooks/useNativeTheme'
import { IconChevronRight } from '../icons/IconChevronRight'
import { IconWarningTriangle } from '../icons/IconWarningTriangle'
import { Button } from '../primitives/Button'
import RichText from './files/RichText'
import { FeatureRequestSectionItems } from './FeatureRequestBriefCard'
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
}

/**
 * Native peer of web's `FeatureRequestFullView` — the whole of a request another project sent,
 * every part written out and the text as it was sent, with the decision and who asked. The screen
 * a request chat's card opens. Purely presentational.
 */
export default function FeatureRequestFullView({
  adopterLabels,
  onOpenAskingChat,
  ...decision
}: FeatureRequestFullViewProps) {
  const { request, fromLabel } = decision
  const { theme, status } = useNativeTheme()
  const [showRaw, setShowRaw] = useState(false)
  const summary = featureRequestSummary(request)
  const sections = featureRequestSections(request, fromLabel)
  const cycleWarning = featureRequestCycleWarning(request, fromLabel)
  const pending = featureRequestStatusView(request.status).phase === 'pending'
  const heading = {
    fontSize: 11.5,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: theme.text.secondary,
  }
  const panel = {
    gap: nativeSpace[3],
    borderRadius: nativeRadii[4],
    borderWidth: 1,
    borderColor: theme.border.default,
    backgroundColor: theme.surface.raised,
    padding: nativeSpace[4],
  }
  return (
    <ScrollView contentContainerStyle={{ padding: nativeSpace[4], gap: nativeSpace[5] }}>
      <View style={{ gap: nativeSpace[3] }}>
        <FeatureRequestProvenance request={request} fromLabel={fromLabel} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text.primary }}>
          {request.title}
        </Text>
        {summary ? <RichText text={summary} textColor={theme.text.secondary} /> : null}
        {cycleWarning ? (
          <View
            style={{
              flexDirection: 'row',
              gap: nativeSpace[2],
              borderRadius: nativeRadii[3],
              backgroundColor: status.blocked.softBg,
              padding: nativeSpace[3],
            }}
          >
            <IconWarningTriangle size={16} color={status.blocked.softFg} />
            <Text style={{ flex: 1, fontSize: 12, color: status.blocked.softFg }}>
              {cycleWarning}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={panel}>
        {pending ? (
          <View style={{ gap: nativeSpace[1] }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
              {FEATURE_REQUEST_DECIDE_HEADING}
            </Text>
            <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
              {featureRequestWaitingLine(fromLabel)}
            </Text>
          </View>
        ) : null}
        <FeatureRequestDecision {...decision} />
      </View>

      {sections.map((section) => (
        <View key={section.id} style={{ gap: nativeSpace[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: nativeSpace[2] }}>
            <Text style={heading}>{section.title}</Text>
            {section.meta ? (
              <Text style={{ fontSize: 12, color: theme.text.secondary }}>{section.meta}</Text>
            ) : null}
          </View>
          <FeatureRequestSectionItems section={section} />
        </View>
      ))}

      {adopterLabels?.length ? (
        <View style={{ gap: nativeSpace[2] }}>
          <Text style={heading}>Who adopts it</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpace[2] }}>
            {adopterLabels.map((label) => (
              <Text
                key={label}
                style={{
                  fontSize: 12.5,
                  color: theme.text.primary,
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  borderRadius: nativeRadii[3],
                  paddingHorizontal: nativeSpace[2],
                  paddingVertical: nativeSpace[1],
                }}
              >
                {label}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: nativeSpace[2] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showRaw }}
          onPress={() => setShowRaw((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpace[2] }}
        >
          <View style={{ transform: [{ rotate: showRaw ? '90deg' : '0deg' }] }}>
            <IconChevronRight size={12} color={theme.text.secondary} />
          </View>
          <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
            The request as it was sent
          </Text>
        </Pressable>
        {showRaw ? (
          <Text
            selectable
            style={{
              fontFamily: nativeFontFamilies.mono,
              fontSize: 12,
              lineHeight: 18,
              color: theme.text.primary,
              backgroundColor: theme.surface.base,
              borderRadius: nativeRadii[3],
              padding: nativeSpace[3],
            }}
          >
            {formatFeatureRequestBrief(request)}
          </Text>
        ) : null}
      </View>

      <View style={panel}>
        <Text style={heading}>Requested by</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
          {fromLabel}
        </Text>
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          From {featureRequestViaLabel(request.requestedBy.fromChatContext)},{' '}
          {formatFriendlyTimestamp(request.createdAt)}.
        </Text>
        {onOpenAskingChat ? (
          <Button size="sm" variant="link" onPress={onOpenAskingChat}>
            Open the requesting chat →
          </Button>
        ) : null}
        <Text style={{ fontSize: 12.5, color: theme.text.secondary }}>
          {FEATURE_REQUEST_ACCEPTANCE_LINES[request.acceptance]}
        </Text>
      </View>
    </ScrollView>
  )
}
