import { useState } from 'react'
import { ScrollView, Text, View, Pressable } from 'react-native'

import { Button } from '../../primitives/Button'
import {
  formatGrantDetail,
  isStartFeatureWorkGrant,
  startFeatureWorkGrantSummary,
} from '../../../headless/utils/approvalGrant'
import { grantDecideErrorMessage } from '../../../headless/utils/pendingToolGrants'
import { nativeRadii, nativeSpace } from '../../../tokens/native'
import { red } from '../../../tokens/colors'
import { useNativeTheme } from '../../hooks/useNativeTheme'
import type { PendingToolGrant } from '../../../headless'

export type ApprovalPanelProps = {
  grant: PendingToolGrant
  onDecideLater: () => void
}

/**
 * Native peer of [web's `ApprovalPanel`](../../../web/compound/chat/ApprovalPanel.tsx).
 * Takes the composer's place so the ask is unmissable while the chat stays
 * visible; `onDecideLater` restores the composer without deciding. Takes no
 * external busy flag — see the web peer for why.
 */
export default function ApprovalPanel({ grant, onDecideLater }: ApprovalPanelProps) {
  const { theme } = useNativeTheme()
  const isLaunch = isStartFeatureWorkGrant(grant)
  const summary = startFeatureWorkGrantSummary(grant)
  const detail = isLaunch ? undefined : formatGrantDetail(grant.detail)
  const canGrantPermanently =
    !isLaunch && grant.source === 'cli' && grant.canGrantPermanently !== false
  // ON by default — see the web peer: proof was opt-in and never got asked for.
  const [captureProof, setCaptureProof] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const decide = (decision: 'once' | 'deny' | 'permanent') => {
    setBusy(true)
    setError(null)
    // A refused decision (409: the approval already expired / was decided)
    // must be SHOWN — a swallowed failure here looked like "approved, then
    // nothing happened".
    void grant
      .decide(decision, isLaunch ? { proofRequired: captureProof } : undefined)
      .catch((err: unknown) => {
        setBusy(false)
        setError(grantDecideErrorMessage(err))
      })
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
        {isLaunch ? 'Start work on this in an isolated run?' : 'The agent needs your approval'}
      </Text>
      <Text style={{ fontSize: 13, color: theme.text.secondary }}>
        {isLaunch
          ? 'The agent will work in an isolated copy of the project and land its changes on a review branch with verification attached — nothing touches your working tree until you sign off.'
          : `It is waiting on this before it can continue: ${grant.label}`}
      </Text>
      {isLaunch ? (
        <Pressable
          onPress={() => setCaptureProof((v) => !v)}
          disabled={busy}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: captureProof, disabled: busy }}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: nativeSpace[2] }}
        >
          <Text style={{ fontSize: 14, color: theme.text.primary }}>
            {captureProof ? '☑' : '☐'}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary, flex: 1 }}>
            <Text style={{ fontWeight: '600', color: theme.text.primary }}>
              Capture proof I can look at
            </Text>
            {
              ' — the run works out what this machine can do (screenshots on a device, a recording, or a written before/after) and attaches it to the review.'
            }
          </Text>
        </Pressable>
      ) : null}
      {isLaunch && summary.note !== undefined ? (
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
      {detail !== undefined ? (
        <View
          style={{
            padding: nativeSpace[3],
            borderRadius: nativeRadii[3],
            backgroundColor: theme.surface.muted,
          }}
        >
          <ScrollView style={{ maxHeight: 160 }}>
            <Text
              selectable
              style={{ fontSize: 12, fontFamily: 'Courier', color: theme.text.primary }}
            >
              {detail}
            </Text>
          </ScrollView>
        </View>
      ) : null}
      {error !== null ? (
        <View
          style={{
            padding: nativeSpace[3],
            borderRadius: nativeRadii[3],
            borderWidth: 1,
            borderColor: red[500],
          }}
        >
          <Text style={{ fontSize: 13, color: red[600] }}>{error}</Text>
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
        {canGrantPermanently ? (
          <Button variant="ghost" size="sm" onPress={() => decide('permanent')} disabled={busy}>
            Always allow
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onPress={() => decide('deny')} disabled={busy}>
          Not now
        </Button>
        <Button size="sm" onPress={() => decide('once')} loading={busy}>
          {isLaunch ? 'Approve & launch' : 'Approve'}
        </Button>
      </View>
    </View>
  )
}
