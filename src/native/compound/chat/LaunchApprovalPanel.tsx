import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { Button } from '../../primitives/Button'
import { startFeatureWorkGrantSummary } from '../../../headless/utils/launchGrant'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { PendingToolGrant } from '../../../headless'

export type LaunchApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
}

/**
 * Native peer of
 * [web's `LaunchApprovalPanel`](../../../web/compound/chat/LaunchApprovalPanel.tsx).
 * Takes the composer's place so the launch ask is unmissable while the chat stays
 * visible; `onDecideLater` restores the composer without deciding.
 */
export default function LaunchApprovalPanel({ grant, onDecideLater }: LaunchApprovalPanelProps) {
  const { theme } = useNativeTheme()
  const summary = startFeatureWorkGrantSummary(grant)
  const [busy, setBusy] = useState(false)
  const decide = (decision: 'once' | 'deny') => {
    setBusy(true)
    void grant.decide(decision).catch(() => setBusy(false))
  }
  return (
    <View
      style={{
        margin: nativeSpace[3],
        padding: nativeSpace[4],
        borderRadius: nativeRadii[3],
        borderWidth: 1,
        borderColor: theme.border.strong ?? theme.border.subtle,
        backgroundColor: theme.surface.raised ?? theme.surface.muted,
        gap: nativeSpace[3],
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
        Start work on this in an isolated run?
      </Text>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        The agent will work in an isolated copy of the project and land its changes on a review
        branch with verification attached — nothing touches your working tree until you sign off.
      </Text>
      {summary.note !== undefined ? (
        <View
          style={{
            padding: nativeSpace[3],
            borderRadius: nativeRadii[3],
            backgroundColor: theme.surface.muted,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: theme.text.secondary,
              marginBottom: nativeSpace[1],
            }}
          >
            What it will do
          </Text>
          <ScrollView style={{ maxHeight: 160 }}>
            <Text selectable style={{ fontSize: 14, color: theme.text.primary }}>
              {summary.note}
            </Text>
          </ScrollView>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: nativeSpace[2],
          flexWrap: 'wrap',
        }}
      >
        <Button variant="ghost" size="sm" onPress={onDecideLater} disabled={busy}>
          Decide later
        </Button>
        <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
          Not now
        </Button>
        <Button size="sm" onPress={() => decide('once')} loading={busy}>
          Approve &amp; launch
        </Button>
      </View>
    </View>
  )
}
