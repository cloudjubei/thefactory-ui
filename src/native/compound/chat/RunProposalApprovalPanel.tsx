import { useState } from 'react'
import { Text, View } from 'react-native'

import {
  RUN_PROPOSAL_DECLINE_LABEL,
  RUN_PROPOSAL_LATER_LABEL,
  runProposalArgs,
  runProposalToolName,
  runProposalView,
  useStories,
} from '../../../headless'
import type { PendingToolGrant } from '../../../headless'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import { Button } from '../../primitives/Button'
import DependencyRef from '../stories/DependencyRef'

export type RunProposalApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
}

/**
 * Native peer of web's `RunProposalApprovalPanel`: a run chat's proposal — its
 * kind, what it says and what approving it does — approved, or "Not now".
 */
export default function RunProposalApprovalPanel({
  grant,
  onDecideLater,
}: RunProposalApprovalPanelProps) {
  const { theme, status } = useNativeTheme()
  const { stories } = useStories()
  const args = runProposalArgs(grant)
  const featureId = typeof args.featureId === 'string' ? args.featureId : undefined
  const story = featureId
    ? stories.find((s) => s.features.some((f) => f.id === featureId))
    : undefined
  const feature = story?.features.find((f) => f.id === featureId)
  const view = runProposalView(runProposalToolName(grant), args, feature?.title)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!view) return null
  const tone = status[view.tone]

  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    setError(null)
    void grant.decide(decision).catch((err: unknown) => {
      setBusy(false)
      setError(grantDecideErrorMessage(err))
    })
  }

  return (
    <View
      style={{
        margin: nativeSpace[3],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.default,
        backgroundColor: theme.surface.raised,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: nativeSpace[3],
          borderBottomWidth: 1,
          borderBottomColor: theme.border.subtle,
          backgroundColor: theme.surface.base,
        }}
      >
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: tone.softBg,
            borderWidth: 1,
            borderColor: tone.softBorder,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: tone.softFg }}>
            {view.kindLabel}
          </Text>
        </View>
        {story && feature ? <DependencyRef dependency={`${story.id}.${feature.id}`} /> : null}
        {view.storyId ? <DependencyRef dependency={view.storyId} /> : null}
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {view.title}
        </Text>
      </View>
      <View style={{ gap: 6, padding: nativeSpace[3] }}>
        {view.lines.map((line) => (
          <Text key={line.label} style={{ fontSize: 13, color: theme.text.secondary }}>
            <Text
              style={{ fontWeight: '600', color: theme.text.primary }}
            >{`${line.label}: `}</Text>
            {line.text}
          </Text>
        ))}
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{view.effect}</Text>
        {error !== null ? (
          <Text style={{ fontSize: 12, color: status.stuck.softFg }}>{error}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: nativeSpace[2] }}>
          <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
            {RUN_PROPOSAL_LATER_LABEL}
          </Button>
          <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
            {RUN_PROPOSAL_DECLINE_LABEL}
          </Button>
          <Button size="sm" onPress={() => decide('once')} loading={busy}>
            {view.approveLabel}
          </Button>
        </View>
      </View>
    </View>
  )
}
