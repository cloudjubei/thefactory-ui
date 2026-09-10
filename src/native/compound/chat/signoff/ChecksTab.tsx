import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import {
  AGENT_UNREACHABLE,
  handoffRequest,
  type CheckMethodId,
  type CheckMethodRow,
  type HandoffPurpose,
  type ReviewCheckRow,
} from '../../../../headless'
import { nativeFontFamilies, nativeRadii } from '../../../../tokens/native'
import { useNativeTheme } from '../../../hooks/useNativeTheme'
import CheckChip from '../../chips/CheckChip'
import HandoffButton from '../../chips/HandoffButton'
import RunActionButton from '../../chips/RunActionButton'
import DurationPill from './DurationPill'
import { toneText } from './tones'

export type ChecksTabProps = {
  /** The method rows this tab owns (tests, or the build-side methods). */
  methods: readonly CheckMethodRow[]
  /** Every individual check that rolled up into those methods. */
  checks: readonly ReviewCheckRow[]
  branch: string | undefined
  busyId: CheckMethodId | undefined
  canRequest: boolean
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
  /** Shown when the tab owns no method with anything to say — e.g. no tests at all. */
  emptyState?: { title: string; body: string }
}

const OUTPUT_MAX_HEIGHT = 132

function Card({ children, padding = 10 }: { children: ReactNode; padding?: number }) {
  const { theme } = useNativeTheme()
  return (
    <View
      style={{
        gap: 8,
        padding,
        borderRadius: nativeRadii[2],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.raised,
      }}
    >
      {children}
    </View>
  )
}

function Output({ text }: { text: string }) {
  const { theme } = useNativeTheme()
  return (
    <ScrollView
      nestedScrollEnabled
      style={{
        maxHeight: OUTPUT_MAX_HEIGHT,
        borderRadius: nativeRadii[1],
        borderWidth: 1,
        borderColor: theme.border.subtle,
        backgroundColor: theme.surface.overlay,
      }}
      contentContainerStyle={{ padding: 8 }}
    >
      <Text
        selectable
        style={{
          fontFamily: nativeFontFamilies.mono,
          fontSize: 11,
          lineHeight: 17,
          color: theme.text.secondary,
        }}
      >
        {text}
      </Text>
    </ScrollView>
  )
}

function CheckBlock({
  row,
  checks,
  branch,
  busy,
  canRequest,
  onRun,
  onRequest,
}: {
  row: CheckMethodRow
  checks: ReviewCheckRow[]
  branch: string | undefined
  busy: boolean
  canRequest: boolean
  onRun: (row: CheckMethodRow) => void
  onRequest: (row: CheckMethodRow, purpose: HandoffPurpose) => void
}) {
  const { theme } = useNativeTheme()
  const [showOutput, setShowOutput] = useState(row.state === 'failed')
  const action = row.action
  const command = checks.length === 1 ? checks[0].label : undefined
  const unreachable = action.kind === 'request' && action.purpose !== 'capture' && !canRequest

  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <CheckChip row={row} inert />
        {command && row.state !== 'unchecked' && row.state !== 'unconfigured' ? (
          <Text style={{ flexShrink: 1, fontSize: 11, color: theme.text.secondary }}>
            {command}
          </Text>
        ) : (
          <Text style={{ flexShrink: 1, fontSize: 11, color: theme.text.muted }}>{row.detail}</Text>
        )}
        <View style={{ flex: 1 }} />
        {row.durationLabel ? <DurationPill label={row.durationLabel} /> : null}
      </View>

      {checks.length > 1 ? (
        <View style={{ gap: 4 }}>
          {checks.map((check) => (
            <View key={check.id} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: toneText(check.tone, theme) }}>
                {check.status}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.primary }}>{check.label}</Text>
              <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
                {check.summary}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {row.output ? (
        <View style={{ gap: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showOutput }}
            onPress={() => setShowOutput((v) => !v)}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.text.secondary }}>
              {showOutput ? 'Hide output' : 'Show output'}
            </Text>
          </Pressable>
          {showOutput ? <Output text={row.output} /> : null}
        </View>
      ) : null}

      {action.kind === 'run' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            {`Nothing was captured for ${row.noun}.`}
          </Text>
          <RunActionButton busy={busy} onPress={() => onRun(row)}>
            Run it now
          </RunActionButton>
        </View>
      ) : action.kind === 'request' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {action.purpose === 'setup' ? (
            <Text style={{ flexShrink: 1, fontSize: 12, color: theme.text.secondary }}>
              {`${row.detail} Setting it up is a code change, so it is work for the agent.`}
            </Text>
          ) : null}
          <HandoffButton
            disabled={busy || unreachable}
            onPress={() => onRequest(row, action.purpose)}
          >
            {handoffRequest(row, action.purpose, { branch }).buttonLabel}
          </HandoffButton>
          {unreachable ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{AGENT_UNREACHABLE}</Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  )
}

/**
 * One block per method — the same block for Build and for Tests — with the
 * method's chip, its command, its time in the standard duration pill, its
 * output behind a toggle (capped and scrollable, so a long log cannot inflate
 * the row), and the one action its state allows.
 */
export default function ChecksTab({
  methods,
  checks,
  branch,
  busyId,
  canRequest,
  onRun,
  onRequest,
  emptyState,
}: ChecksTabProps) {
  const { theme } = useNativeTheme()
  const allUnconfigured = methods.length > 0 && methods.every((m) => m.state === 'unconfigured')
  if (emptyState && allUnconfigured) {
    const first = methods[0]
    return (
      <Card padding={12}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
          {emptyState.title}
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>{emptyState.body}</Text>
        <View style={{ alignItems: 'flex-start', gap: 6 }}>
          <HandoffButton disabled={!canRequest} onPress={() => onRequest(first, 'setup')}>
            {handoffRequest(first, 'setup', { branch }).buttonLabel}
          </HandoffButton>
          {!canRequest ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{AGENT_UNREACHABLE}</Text>
          ) : null}
        </View>
      </Card>
    )
  }
  return (
    <View style={{ gap: 8 }}>
      {methods.map((row) => (
        <CheckBlock
          key={row.id}
          row={row}
          checks={checks.filter((c) => row.checkIds.includes(c.id))}
          branch={branch}
          busy={busyId === row.id}
          canRequest={canRequest}
          onRun={onRun}
          onRequest={onRequest}
        />
      ))}
    </View>
  )
}
