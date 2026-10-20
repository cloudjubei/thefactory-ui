import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import {
  activityStopApprovalView,
  activityStopArgs,
  activityStopCardOf,
} from '../../../headless/utils/activityStopApproval'
import type { ActivityStopApprovalView } from '../../../headless/utils/activityStopApprovalTypes'
import type { PendingToolGrant } from '../../../headless/utils/chatTypes'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { toolAskDecidedLine } from '../../../headless/utils/toolAskCard'
import type { ToolAskDecidedLine } from '../../../headless/utils/toolAskCardTypes'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import ToolAskCard from './ToolAskCard'

export type ActivityStopApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
  /** The ask was decided — what its one line says. */
  onDecided?: (line: ToolAskDecidedLine) => void
}

/**
 * Native peer of the web `ActivityStopApprovalPanel`: approving `stopActivity` on the shared
 * tool-ask card, with the activity as the host read it and the agent's reason as the agent's.
 */
export default function ActivityStopApprovalPanel({
  grant,
  onDecideLater,
  onDecided,
}: ActivityStopApprovalPanelProps) {
  const view = activityStopApprovalView(activityStopCardOf(grant), activityStopArgs(grant))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    grant
      .decide(decision)
      .then(() => onDecided?.(toolAskDecidedLine(view.ask, decision)))
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
  }

  return (
    <View style={{ margin: nativeSpace[3] }}>
      <ToolAskCard
        view={view.ask}
        busy={busy}
        error={error}
        onApprove={() => decide('once')}
        onDeny={() => decide('deny')}
        onLater={onDecideLater}
      >
        <ActivityStopFacts view={view} />
      </ToolAskCard>
    </View>
  )
}

/** The host's facts about the activity, as the native card shows them. */
export function ActivityStopFacts({ view }: { view: ActivityStopApprovalView }) {
  const { theme } = useNativeTheme()
  const label = {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: theme.text.muted,
  }
  if (view.unavailable) {
    return <Text style={{ fontSize: 13, color: theme.text.secondary }}>{view.unavailable}</Text>
  }
  return (
    <View style={{ gap: nativeSpace[2] }}>
      <View style={{ gap: 4 }}>
        {view.facts.map((fact) => (
          <View key={fact.label} style={{ flexDirection: 'row', gap: nativeSpace[2] }}>
            <Text style={{ width: 92, fontSize: 13, color: theme.text.muted }}>{fact.label}</Text>
            <Text style={{ flex: 1, fontSize: 13, color: theme.text.primary }}>{fact.value}</Text>
          </View>
        ))}
      </View>
      {view.steps.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={label}>Progress</Text>
          {view.steps.map((step) => (
            <View
              key={step.key}
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpace[2] }}
            >
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 13, color: theme.text.secondary }}
              >
                {step.key}
              </Text>
              <Text
                style={{ fontSize: 13, color: theme.text.primary, fontVariant: ['tabular-nums'] }}
              >
                {step.progress}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 4 }}>
        <Text style={label}>Launched with</Text>
        {view.params.length > 0 ? (
          <ScrollView
            style={{
              maxHeight: 128,
              borderRadius: nativeRadii[2],
              backgroundColor: theme.surface.muted,
            }}
            contentContainerStyle={{ paddingHorizontal: nativeSpace[2], paddingVertical: 6 }}
          >
            <Text style={{ fontFamily: 'Menlo', fontSize: 11.5, color: theme.text.secondary }}>
              {view.params.join('\n')}
            </Text>
          </ScrollView>
        ) : null}
        {view.paramsNotes.map((note) => (
          <Text key={note} style={{ fontSize: 13, color: theme.text.muted }}>
            {note}
          </Text>
        ))}
      </View>
    </View>
  )
}
